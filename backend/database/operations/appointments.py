import logging
import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from unicodedata import category

from backend.api.master.schedule import AppointmentResponse
from backend.database import AppointmentChatModel, MasterModel, SubscriptionModel, UserModel, WeekTemplateModel, WorkingDayModel, PriceModel, \
    AppointmentModel, MasterAbsenceModel, AddressModel, CategoryModel
from backend.database.operations.admins import create_delayed_message
from backend.database.operations.utils import _time_to_timedelta, _timedelta_to_time, _timedelta_to_int_minutes, \
    _get_week_dates
from backend.telegram_bot.bot_main import bot

tz_offset = timezone(timedelta(hours=3))

async def get_possible_start_time(
        master_id: uuid.UUID,
        app_date: date,
        price_id: uuid.UUID,
        session: AsyncSession
):
    """Получение возможного времени для записи (пользователь)"""

    # 1. Проверка мастера
    master = await MasterModel.get_by_id(session=session, master_id=master_id)
    if not master:
        return [], "Мастер не найден", None

    # 2. Проверка подписки
    today = date.today()
    is_sub = await SubscriptionModel.is_active(master_id=master_id, session=session, day=today)
    if not is_sub:
        return [], "У мастера нет активной подписки", None

    # 3. Проверка отсутствия
    is_absent = await MasterAbsenceModel.is_absent(
        session=session,
        master_id=master_id,
        check_date=app_date
    )
    if is_absent:
        reason = await MasterAbsenceModel.get_reason(master_id=master_id, day=app_date, session=session)
        return [], f"Мастер не сможет Вас принять в этот день ({reason})", None

    # 4. Получение шаблона дня недели
    weekday = app_date.isoweekday()
    week_template = await WeekTemplateModel.get_by_master_and_weekday(
        session=session,
        master_id=master_id,
        weekday=weekday
    )
    if not week_template:
        return [], "Мастер не сможет Вас принять в этот день (Выходной)", None

    # 5. Получение / создание рабочего дня (working_day)
    working_day = await WorkingDayModel.get_by_master_and_date(
        session=session,
        master_id=master_id,
        day_date=app_date
    )
    working_day_created = False
    if not working_day:
        working_day_created = True
        working_day_data = {
            "master_id": master_id,
            "day_date": app_date,
            "start_time": week_template.start_time,
            "end_time": week_template.end_time,
            "address_id": week_template.address_id
        }
        working_day_id = await WorkingDayModel.create(session=session, data=working_day_data, master_id=master_id)
        working_day = await WorkingDayModel.get_by_id(session=session, id=working_day_id)

    # 6. Адрес
    address = await AddressModel.get_by_id(address_id=working_day.address_id, session=session)
    address_name = address.address if address else ""

    # 7. Получение записей на эту дату
    appointments = await AppointmentModel.get_by_master_and_date(
        session=session,
        master_id=master_id,
        app_date=app_date
    )

    # 8. Вспомогательные функции для работы с time
    def time_to_minutes(t: time) -> int:
        return t.hour * 60 + t.minute

    def minutes_to_time(mins: int) -> time:
        h = mins // 60
        m = mins % 60
        return time(hour=h, minute=m)

    def add_minutes_to_time(t: time, mins: int) -> time:
        total = time_to_minutes(t) + mins
        return minutes_to_time(total)

    def ceil_to_10_minutes(t: time) -> time:
        mins = time_to_minutes(t)
        rem = mins % 10
        if rem == 0:
            return t
        return minutes_to_time(mins + (10 - rem))

    # 9. Определяем реальное начало дня
    tz = timezone(timedelta(hours=3))  # или ваш часовой пояс
    if app_date == today:
        current_time = datetime.now(tz).time()
        if current_time > working_day.start_time:
            day_start = ceil_to_10_minutes(current_time)
        else:
            day_start = working_day.start_time
    else:
        day_start = working_day.start_time

    day_end = working_day.end_time

    logging.info(f"DAY START {day_start}, DAY END {day_end}")

    # 10. Собираем занятые интервалы (начало, конец) с учётом длительности каждой записи
    busy_intervals = []
    for app in appointments:
        # начало записи - время
        start_t = app.start_time
        # получаем цену для длительности
        price = await PriceModel.get_by_id(session=session, price_id=app.price_id)
        duration = price.approximate_time  # минуты
        end_t = add_minutes_to_time(start_t, duration)
        busy_intervals.append((start_t, end_t))

    # 11. Фильтруем интервалы: отбрасываем те, что полностью до day_start,
    #     и подрезаем начало тех, что начались раньше, но закончатся позже
    filtered = []
    for start_t, end_t in busy_intervals:
        if end_t <= day_start:
            continue
        if start_t < day_start:
            start_t = day_start
        filtered.append((start_t, end_t))

    # 12. Сортируем по началу и объединяем пересекающиеся/касающиеся
    filtered.sort(key=lambda x: x[0])
    merged = []
    for start_t, end_t in filtered:
        if not merged:
            merged.append([start_t, end_t])
        else:
            last_start, last_end = merged[-1]
            # если текущий интервал начинается раньше или в момент окончания предыдущего – объединяем
            if start_t <= last_end:
                merged[-1][1] = max(last_end, end_t)
            else:
                merged.append([start_t, end_t])

    # 13. Генерация возможных слотов
    #     Переводим day_start и day_end в минуты для удобства
    day_start_min = time_to_minutes(day_start)
    day_end_min = time_to_minutes(day_end)

    # длительность услуги, которую хотим записать (в минутах)
    price_to_app = await PriceModel.get_by_id(session=session, price_id=price_id)
    appointment_duration = price_to_app.approximate_time

    possible_starts = []
    current_min = day_start_min

    # Проходим по объединённым занятым интервалам
    for start_t, end_t in merged:
        start_min = time_to_minutes(start_t)
        end_min = time_to_minutes(end_t)

        # Свободный промежуток от current_min до start_min
        if start_min > current_min:
            free_minutes = start_min - current_min
            if free_minutes >= appointment_duration:
                # Нарезаем с шагом 10 минут
                for offset in range(0, free_minutes - appointment_duration + 1, 10):
                    slot_min = current_min + offset
                    possible_starts.append(minutes_to_time(slot_min))

        # Сдвигаем текущую позицию на конец занятого интервала
        if end_min > current_min:
            current_min = end_min

    # После последнего занятого интервала - до конца дня
    if day_end_min > current_min:
        free_minutes = day_end_min - current_min
        if free_minutes >= appointment_duration:
            for offset in range(0, free_minutes - appointment_duration + 1, 10):
                slot_min = current_min + offset
                possible_starts.append(minutes_to_time(slot_min))

    # 14. Удаляем временный working_day, если он был создан
    if working_day_created:
        await WorkingDayModel.delete(session=session, wd_id=working_day.id)

    if not possible_starts:
        return [], "Нет свободных мест на этот день", ""

    return possible_starts, "success", address_name

async def get_appointments_by_date(
        master_id: uuid.UUID,
        app_date: date,
        session: AsyncSession
):
    """Получение записей мастера на дату"""
    return await AppointmentModel.get_by_master_and_date(
        session=session,
        master_id=master_id,
        app_date=app_date
    )




async def get_week_timetable(
        master_id: uuid.UUID,
        start_date: date,
        session: AsyncSession
):
    """Получение расписания мастера на неделю"""
    week_list = _get_week_dates(start_date)
    week_appointments = []

    for day in week_list:
        appointments = await get_appointments_by_date(
            master_id=master_id,
            app_date=day,
            session=session
        )

        a = []
        for i, appointment in enumerate(appointments):
            working_day = await WorkingDayModel.get_by_id(session=session, id=appointment.working_day_id)
            address = await AddressModel.get_by_id(session=session, address_id=working_day.address_id)
            price = await PriceModel.get_by_id(session=session, price_id=appointment.price_id)
            aresponse = {"id": appointment.id,
                         "master_id": appointment.master_id,
                         "date": appointment.date,
                         "start_time": appointment.start_time,
                         "end_time": appointment.end_time,
                         "final_price": appointment.final_price,
                         "address": address.address,
                         "service_name": price.name
                         }
            a.append(aresponse)

        week_appointments.append(a)

    return week_appointments, "success"

async def get_on_confirm(
        master_id: uuid.UUID,
        session: AsyncSession
):
    day = date.today()
    return await AppointmentModel.get_by_master_confirmation(master_id=master_id, day=day, session=session)

async def get_appointment(appointment_id: uuid.UUID,
                                 session: AsyncSession):
    appointment = await AppointmentModel.get_by_id(appointment_id=appointment_id, session=session)
    return appointment

def get_all_users_with_tommorrow_appointments(session):
    appointments = AppointmentModel.get_all_tommorrow(session)
    users = []
    for a in appointments:
        user = UserModel.get_by_id_sync(session=session, user_id=a.user_id)
        users.append(user.chat_id)
    return list(set(users))


async def get_appointments_by_user(
        user_id: uuid.UUID,
        session: AsyncSession
) -> List[dict]:
    """Получение записей пользователя"""

    appointments = await AppointmentModel.get_by_user_id(
        session=session,
        user_id=user_id
    )

    response_list = []
    for a in appointments:
        working_day = await WorkingDayModel.get_by_id(session=session, id=a.working_day_id)
        price = await PriceModel.get_by_id(session=session, price_id=a.price_id)
        parental_name = await CategoryModel.get_by_id_parental_name(session=session, category_id=price.category_id)
        address = await AddressModel.get_by_id(address_id=working_day.address_id, session=session)
        if address!= None:
            address_arr = address.full_address.split(",")
            if len(address_arr)>=3:
                address_res = f"{address_arr[0]},{address_arr[1]},{address_arr[2]}"
            else:
                address_res = address.full_address
        aresponse = {"appointment_id": a.id,
                     "service_name": price.name,
                     "address": address_res,
                     "day": a.date,
                     "start_time": a.start_time,
                     "end_time": a.end_time,
                     "price": a.final_price,
                     "parental_category": parental_name}
        response_list.append(aresponse)

    return response_list

async def get_previous_masters(
        user_id: uuid.UUID,
        session: AsyncSession
):
    """Получение записей пользователя"""

    appointments = await AppointmentModel.get_by_user_id(
        session=session,
        user_id=user_id
    )

    response_list = []
    for a in appointments:
        response_list.append(a.master_id)

    return response_list

async def create_appointment(
        appointment_dict: dict ,
        session: AsyncSession
) -> str:
    """Создание записи"""


    possible_times, status, addresses = await get_possible_start_time(appointment_dict["master_id"], appointment_dict["date"], appointment_dict["price_id"], session=session)
    if possible_times != None and appointment_dict["start_time"] in possible_times:
        status = await AppointmentModel.create(session=session, data=appointment_dict)
        return status
    return "unpredictable error"


async def cancel_appointment(appointment_id: uuid.UUID, session: AsyncSession) -> str:
    """Отмена записи"""
    return await AppointmentModel.delete(session=session, appointment_id=appointment_id)

async def get_all_appointments_by_address(address_id: uuid.UUID, session: AsyncSession):
    wd_ids = await WorkingDayModel.get_by_address(address_id=address_id, session=session)
    users = await AppointmentModel.get_all_users_by_wds(wd_ids=wd_ids, session=session)
    for uid in users:
        user = await UserModel.get_by_id(user_id=uid, session=session)
        try:
            await bot.send_message(chat_id = user.chat_id, text=f"Мастер поменял адрес записи, проверьте информацию в карточке записи в нашем mini-app")
        except Exception as e:
            logging.info(f"bot messages with {e}")
            await create_delayed_message(chat_id = user.chat_id, text=f"Мастер поменял адрес записи, проверьте информацию в карточке записи в нашем mini-app", session = session)
    return "success"

async def create_message(uid: uuid.UUID, appointment_id: uuid.UUID, text: str, session:AsyncSession):
    return await AppointmentChatModel.create(session=session, appointment_id=appointment_id, texter_id=uid, text=text)

async def edit_message(text: str, message_id: uuid.UUID, session: AsyncSession):
    return await AppointmentChatModel.update_text(session=session, chat_id=message_id, new_text=text)

async def get_all_messages_by_appo_and_texter(texter_id: uuid.UUID, appointment_id: uuid.UUID, session: AsyncSession):
    messages = await AppointmentChatModel.get_by_appointment_id(session=session, appointment_id=appointment_id)
    resp = []
    for message in messages:
        resp.append({"message_id": message.id,
                     "text": message.text,
                     "my": texter_id==message.texter_id,
                     "created_at": message.created_at})
    return resp