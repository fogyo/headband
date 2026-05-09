import uuid
from datetime import date, timedelta
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.master.schedule import AppointmentResponse
from backend.database import MasterModel, SubscriptionModel, WeekTemplateModel, WorkingDayModel, PriceModel, \
    AppointmentModel, MasterAbsenceModel, AddressModel
from backend.database.operations.utils import _time_to_timedelta, _timedelta_to_time, _timedelta_to_int_minutes, \
    _get_week_dates, _get_weekday_caps


async def get_possible_start_time(
        master_id: uuid.UUID,
        app_date: date,
        price_id: uuid.UUID,
        session: AsyncSession
):
    """Получение возможного времени для записи (пользователь)"""

    master = await MasterModel.get_by_id(session=session, master_id=master_id)
    if not master:
        return None, "master not found"
    today = date.today()
    is_sub = await SubscriptionModel.is_active(master_id=master_id, session=session, day=today)

    if not is_sub:
        return None, "master not sub"

    is_absent = await MasterAbsenceModel.is_absent(
        session=session,
        master_id=master_id,
        check_date=app_date
    )
    if is_absent:
        return None, "master is absent"

    weekday = app_date.isoweekday()

    week_template = await WeekTemplateModel.get_by_master_and_weekday(
        session=session,
        master_id=master_id,
        weekday=weekday
    )

    if not week_template:
        return None, "day off"

    # Получаем working_day для этой даты
    working_day = await WorkingDayModel.get_by_master_and_date(
        session=session,
        master_id=master_id,
        day_date=app_date
    )

    if not working_day:
        # Создаём working_day из template если нет
        working_day_data = {
            "master_id": master_id,
            "day_date": app_date,
            "start_time": week_template.start_time,
            "end_time": week_template.end_time,
            "address_id": week_template.address_id
        }
        working_day_id = await WorkingDayModel.create(session=session, data=working_day_data)
        working_day = await WorkingDayModel.get_by_id(session=session, id=working_day_id)

    address = await AddressModel.get_by_id(address_id=working_day.address_id, session=session)
    address_name = address.address
    # Получаем записи мастера на эту дату
    appointments = await AppointmentModel.get_by_master_and_date(
        session=session,
        master_id=master_id,
        app_date=app_date
    )

    day_start = working_day.start_time  # в минутах
    day_end = working_day.end_time  # в минутах

    end_times = [day_start]
    start_times = []

    for appointment in appointments:
        app_time = _time_to_timedelta(appointment.start_time)
        app_minutes = _timedelta_to_int_minutes(app_time)
        price = await PriceModel.get_by_id(session, appointment.price_id)
        duration = price.approximate_time
        start_times.append(app_minutes)
        end_times.append(app_minutes + duration)

    start_times.append(day_end)

    price_to_app = await PriceModel.get_by_id(session, price_id=price_id)
    appointment_duration = price_to_app.approximate_time

    # Находим свободные слоты
    possible_starts = []
    ten_minutes = 10  # минут

    for i in range(len(start_times)):
        gap = start_times[i] - end_times[i]
        if gap >= appointment_duration:
            free_minutes = gap - appointment_duration
            k = free_minutes // ten_minutes
            for j in range(k + 1):
                slot_minutes = end_times[i] + ten_minutes * j
                possible_starts.append(_timedelta_to_time(timedelta(minutes=slot_minutes)))

    if not possible_starts:
        return None, "no time for app", ""

    return possible_starts, "success", address_name


async def get_appointments_by_date(
        master_id: uuid.UUID,
        app_date: date,
        session: AsyncSession
):
    """Получение записей мастера на дату"""
    appointments = await AppointmentModel.get_by_master_and_date(
        session=session,
        master_id=master_id,
        app_date=app_date
    )

    addresses = []
    names = []

    for a in appointments:
        price = await PriceModel.get_by_id(session=session, price_id=a.price_id)
        if price:
            names.append(price.name)
            working_day = await WorkingDayModel.get_by_id(session=session, id=a.working_day_id)
            if working_day and working_day.address_id:
                addr = await AddressModel.get_by_id(session=session, address_id=working_day.address_id)
                addresses.append(addr.address if addr else None)
            else:
                addresses.append(None)
        else:
            names.append(None)
            addresses.append(None)

    if appointments:
        return appointments, len(appointments), "success", addresses, names

    return [], 0, "no appointments today", [], []


async def get_week_timetable(
        master_id: uuid.UUID,
        start_date: date,
        session: AsyncSession
):
    """Получение расписания мастера на неделю"""
    week_list = _get_week_dates(start_date)
    week_appointments = []

    for day in week_list:
        appointments, count, status, addresses, names = await get_appointments_by_date(
            master_id=master_id,
            app_date=day,
            session=session
        )
        day_appointments = []
        for i, appointment in enumerate(appointments):
            aresponse = AppointmentResponse.model_validate(appointment).model_dump()
            aresponse["address"] = addresses[i] if i < len(addresses) else None
            aresponse["service_name"] = names[i] if i < len(names) else None
            day_appointments.append(aresponse)

        week_appointments.append(day_appointments)

    return week_appointments, "success"

async def get_on_confirm(
        master_id: uuid.UUID,
        session: AsyncSession
):
    day = date.today()
    return await AppointmentModel.get_by_master_confirmation(master_id=master_id, day=day, session=session)


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
        aresponse = {"service_name": price.name,
                     "address": working_day.address,
                     "day": a.date,
                     "start_time": a.start_time,
                     "end_time": a.end_time,
                     "price": a.final_price}
        response_list.append(aresponse)

    return response_list

async def create_appointment(
        appointment_dict: dict ,
        session: AsyncSession
) -> str:
    """Создание записи"""


    possible_times = await get_possible_start_time(appointment_dict["master_id"], appointment_dict["date"], appointment_dict["price_id"], session=session)
    if possible_times != None and appointment_dict["start_time"] in possible_times:
        status = await AppointmentModel.create(session=session, data=appointment_dict)
        return status
    return "unpredictable error"


async def cancel_appointment(appointment_id: uuid.UUID, session: AsyncSession) -> str:
    """Отмена записи"""
    return await AppointmentModel.delete(session=session, appointment_id=appointment_id)

