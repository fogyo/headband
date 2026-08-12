import logging
import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from unicodedata import category

from backend.api.master.schedule import AppointmentResponse
from backend.database import AppointmentChatModel, MasterModel, SubscriptionModel, UserModel, WeekTemplateModel, WorkingDayModel, PriceModel, \
    AppointmentModel, MasterAbsenceModel, AddressModel, CategoryModel
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

    master = await MasterModel.get_by_id(session=session, master_id=master_id)
    if not master:
        return [], "Мастер не найден", None
    today = date.today()
    is_sub = await SubscriptionModel.is_active(master_id=master_id, session=session, day=today)

    if not is_sub:
        return [], "У мастера нет активной подписки", None

    is_absent = await MasterAbsenceModel.is_absent(
        session=session,
        master_id=master_id,
        check_date=app_date
    )
    if is_absent:
        reason = await MasterAbsenceModel.get_reason(master_id=master_id, day=app_date, session=session)
        return [], f"Мастер не сможет Вас принять в этот день ({reason})", None

    weekday = app_date.isoweekday()

    week_template = await WeekTemplateModel.get_by_master_and_weekday(
        session=session,
        master_id=master_id,
        weekday=weekday
    )

    if not week_template:
        return [], "Мастер не сможет Вас принять в этот день (Выходной)", None

    # Получаем working_day для этой даты
    working_day = await WorkingDayModel.get_by_master_and_date(
        session=session,
        master_id=master_id,
        day_date=app_date
    )
    working_day_to_delete = False
    if not working_day:
        working_day_to_delete = True
        # Создаём working_day из template если нет
        working_day_data = {
            "master_id": master_id,
            "day_date": app_date,
            "start_time": week_template.start_time,
            "end_time": week_template.end_time,
            "address_id": week_template.address_id
        }
        working_day_id = await WorkingDayModel.create(session=session, data=working_day_data, master_id=master_id)
        working_day = await WorkingDayModel.get_by_id(session=session, id=working_day_id)

    address = await AddressModel.get_by_id(address_id=working_day.address_id, session=session)
    address_name = address.address
    # Получаем записи мастера на эту дату
    appointments = await AppointmentModel.get_by_master_and_date(
        session=session,
        master_id=master_id,
        app_date=app_date
    )

    def next_time_rounded_to_10_minutes(t: time) -> time:
        mins = t.minute
        if mins % 10 == 0:
            return t
        diff = 10 - (mins % 10)
        base = datetime.combine(datetime.today(), t)
        return (base + timedelta(minutes=diff)).time()

    
    if app_date == today and datetime.now(tz_offset).time()>working_day.start_time:
        day_start = next_time_rounded_to_10_minutes(datetime.now(tz_offset).time())
    else:
        day_start = working_day.start_time  # time
    day_end = working_day.end_time  # time
    logging.info(f"DAY START {day_start}")
    end_times = [day_start] #List[time]
    start_times = [] #List[time]

    for appointment in appointments:
        app_time = _time_to_timedelta(appointment.start_time) #timedelta
        price = await PriceModel.get_by_id(session=session, price_id=appointment.price_id)
        duration = price.approximate_time
        start_times.append(appointment.start_time)
        end_times.append(_timedelta_to_time(app_time + timedelta(minutes=duration)))

    start_times.append(day_end)

    price_to_app = await PriceModel.get_by_id(session=session, price_id=price_id)
    appointment_duration = price_to_app.approximate_time

    # Находим свободные слоты
    possible_starts = []
    ten_minutes = 10  # минут

    for i in range(len(start_times)):
        gap = _timedelta_to_int_minutes(_time_to_timedelta(start_times[i]) - _time_to_timedelta(end_times[i]))
        if gap >= appointment_duration:
            free_minutes = gap - appointment_duration
            k = free_minutes // ten_minutes
            for j in range(k+1):
                slot_minutes = (_time_to_timedelta(end_times[i]) + timedelta(minutes=(ten_minutes * j)))
                possible_starts.append(_timedelta_to_time(slot_minutes))
    if working_day_to_delete:
        status = await WorkingDayModel.delete(session=session, wd_id=working_day_id)
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
        await bot.send_message(chat_id = user.chat_id, text=f"Мастер поменял адрес записи, проверьте информацию в карточке записи в нашем mini-app")
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