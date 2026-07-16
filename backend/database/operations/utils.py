import uuid
from datetime import time, timedelta, datetime, date

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AppointmentModel, PriceModel


def _int_minutes_to_time(minutes: int) -> time:
    """Перевод int минут в класс time"""
    hours = minutes // 60
    mins = minutes % 60
    return time(hour=hours, minute=mins)


def _get_week_dates(start_date: date) -> list[date]:
    """Возвращает список из 7 дней недели, начиная с start_date"""
    week = [start_date + timedelta(days=i) for i in range(7)]
    return week


def _timedelta_to_time(td: timedelta) -> time:
    """Преобразует timedelta в time (только если < 24 часов)"""
    if td.days < 0:
        raise ValueError("Отрицательный timedelta не может быть преобразован в time")

    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60

    return time(hour=hours, minute=minutes)


def _time_to_timedelta(t: time) -> timedelta:
    """Перевод из класса time в timedelta для выполнения действий"""
    return timedelta(hours=t.hour, minutes=t.minute, seconds=t.second)


def _timedelta_to_int_minutes(td: timedelta) -> int:
    """Перевод из формата чч.мм.сс в int минут"""
    return int(td.total_seconds() // 60)


def _get_weekday_caps(date_obj=None):
    """Получение дня недели из даты заглавными буквами"""
    if date_obj is None:
        date_obj = datetime.now()
    return date_obj.strftime('%A').upper()


async def _cancel_conflicting_appointments_for_date(
        session: AsyncSession,
        master_id: uuid.UUID,
        date: date,
        new_start: time,
        new_end: time):
    appointments = await AppointmentModel.get_by_master_and_date(
        session=session, master_id=master_id, app_date=date
    )
    start_del = _time_to_timedelta(new_start)
    end_del = _time_to_timedelta(new_end)

    start_int = _timedelta_to_int_minutes(start_del)
    end_int = _timedelta_to_int_minutes(end_del)

    for apt in appointments:
        app_time = _time_to_timedelta(apt.start_time)
        app_start = _timedelta_to_int_minutes(app_time)

        price = await PriceModel.get_by_id(session=session, price_id=apt.price_id)
        if not price:
            continue

        app_end = app_start + price.approximate_time

        # Конфликт: встреча выходит за новые границы
        if app_start < start_int or app_end > end_int:
            await AppointmentModel.delete(session=session, appointment_id=apt.id)
    return "success"


async def _cancel_appointments_in_date_range(
        session: AsyncSession,
        master_id: uuid.UUID,
        start_date: date,
        end_date: date
):
    """Отменяет все записи мастера в диапазоне дат"""
    cancelled = []

    appointments = await AppointmentModel.get_by_date_range(session=session, master_id=master_id, start_date=start_date, end_date=end_date)

    for apt in appointments:
        await AppointmentModel.delete(session=session, appointment_id=apt.id)
        cancelled.append(str(apt.id))

    return cancelled

