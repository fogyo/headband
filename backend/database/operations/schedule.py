import logging
import uuid
from datetime import date, time
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.master.profile_endpoints.schedule import WorkingDayUpdateRequest
from backend.database import WorkingDayModel, WeekTemplateModel, MasterAbsenceModel, AddressModel
from backend.database.operations.utils import _cancel_conflicting_appointments_for_date, \
    _cancel_appointments_in_date_range


async def create_working_day(
        master_id: uuid.UUID,
        day_date: date,
        start_time: time,
        end_time: time,
        address: uuid.UUID,
        session: AsyncSession
):
    """Создание рабочего дня"""
    data = {
        "master_id": master_id,
        "day_date": day_date,
        "start_time": start_time,
        "end_time": end_time,
        "address_id": address
    }
    return await WorkingDayModel.create(session=session, data=data)


async def set_weekday_template(
        master_id: uuid.UUID,
        weekday: int,
        start_time: time,
        end_time: time,
        address_id: uuid.UUID,
        session: AsyncSession
):
    """Установка шаблона недели"""
    # Удаляем существующий шаблон для этого дня
    existing = await WeekTemplateModel.get_by_master_and_weekday(
        session=session,
        master_id=master_id,
        weekday=weekday
    )
    if existing:
        await session.delete(existing)

    data = {
        "master_id": master_id,
        "weekday": weekday,
        "start_time": start_time,
        "end_time": end_time,
        "address_id": address_id
    }
    return await WeekTemplateModel.create(session=session, data=data)



async def get_absences_by_master(
        master_id: uuid.UUID,
        session: AsyncSession
):
    """Получение периодов отсутствия мастера"""
    absences = await MasterAbsenceModel.get_by_master_id(
        session=session,
        master_id=master_id
    )
    status = "success"
    if len(absences) == 0:
       status = "no absences"
       res = []
    else:
       res = [{"id": a.id,
                "start_date": a.start_date,
                "end_date": a.end_date,
                "reason": a.reason
                } for a in absences]
    return res, status


async def set_week_template_full(master_id: uuid.UUID, templates: List, session: AsyncSession) -> str:
    """Установка шаблона на всю неделю"""
    for template_data in templates:
        await set_weekday_template(master_id=master_id,
                                   weekday=template_data.weekday,
                                   start_time=template_data.start_time,
                                   end_time=template_data.end_time,
                                   address_id=template_data.address_id,
                                   session=session)
    return "success"


async def get_week_template_by_master(master_id: uuid.UUID, session: AsyncSession) -> List[dict]:
    """Получение шаблона на неделю"""
    templates = await WeekTemplateModel.get_by_master_id(session=session, master_id=master_id)
    response = []

    for t in templates:
        address = None
        if t.address_id:
            addr = await AddressModel.get_by_id(session=session, address_id=t.address_id)
            address = addr.address if addr else None

        response.append({
            "id": t.id,
            "weekday": t.weekday,
            "start_time": t.start_time,
            "end_time": t.end_time,
            "address_id": t.address_id,
            "address": address
        })

    return response


async def update_week_template(master_id: uuid.UUID, templates: List, session: AsyncSession):
    """Обновление шаблона на неделю"""
    try:
        for req in templates:
            # Находим существующий шаблон
            template = await WeekTemplateModel.get_by_master_and_weekday(
                session=session,
                master_id=master_id,
                weekday=req.weekday
            )
            if not template:
                await WeekTemplateModel.create(session=session, data={
                    "master_id": master_id,
                    "weekday": req.weekday,
                    "start_time": req.start_time,
                    "end_time": req.end_time,
                    "address_id": req.address_id
                })
                return "success"

            update_data = req.model_dump(exclude_none=True)

            if not update_data:
                return "no data to update"

            return await WeekTemplateModel.update(
                session=session,
                template_id=template.id,
                update_data=update_data
            )

    except Exception as e:
        logging.error(f"Ошибка обновления шаблона недели: {e}")
        return f"error: {str(e)}"


async def delete_day(id: uuid.UUID, weekday: int, session: AsyncSession):
    return await WeekTemplateModel.delete_by_master_id_weekday(session=session, master_id=id, weekday=weekday)

async def get_day(master_id: uuid.UUID, day: date, session: AsyncSession):
    resp = await WorkingDayModel.get_by_master_and_date(master_id=master_id, day_date=day, session=session)
    if resp is None:
        resp = await WeekTemplateModel.get_by_master_and_weekday(master_id=master_id, weekday=day.weekday(), session=session)
    return resp

async def update_working_day(
        request: WorkingDayUpdateRequest,
        session: AsyncSession,
        master_id: uuid.UUID
):
    """
    Обновление конкретного рабочего дня (форс-мажор).
    Отменяет записи, которые не вписываются в новое время.
    """
    try:
        working_day = await WorkingDayModel.get_by_master_and_date(
            session=session, master_id=master_id, day_date=request.day_date
        )
        if not working_day:
            await WorkingDayModel.create(master_id=master_id, data = request.model_dump(), session=session)
            return "success", []

        cancelled = await _cancel_conflicting_appointments_for_date(
            session=session,
            master_id=master_id,
            date=request.day_date,
            new_start=request.start_time,
            new_end=request.end_time
        )

        await WorkingDayModel.update(
            session=session,
            wd_id=working_day.id,
            update_data=request.model_dump()
        )
        return "success", cancelled

    except Exception as e:
        await session.rollback()
        logging.error(f"Ошибка обновления рабочего дня: {e}")
        return f"error: {str(e)}", []


async def create_absence(
        master_id: uuid.UUID,
        start_date: date,
        end_date: date,
        reason: Optional[str],
        session: AsyncSession
):
    """
    Создание периода отсутствия с отменой всех записей в этот период.
    """
    try:
        cancelled = await _cancel_appointments_in_date_range(
            session=session,
            master_id=master_id,
            start_date=start_date,
            end_date=end_date
        )
        absence_id = await MasterAbsenceModel.create(
            session=session,
            data={
                "master_id": master_id,
                "start_date": start_date,
                "end_date": end_date,
                "reason": reason
            }
        )

        return "success", absence_id, cancelled

    except Exception as e:
        await session.rollback()
        logging.error(f"Ошибка создания отсутствия: {e}")
        return f"error: {str(e)}", uuid.UUID(int=0), []


async def delete_absence(
    absence_id: uuid.UUID,
    session: AsyncSession
):
    """Удаление периода отсутствия (записи НЕ восстанавливаются)"""
    return await MasterAbsenceModel.delete(session=session, absence_id=absence_id)


async def update_absence(update_data, session: AsyncSession):
    """Обновление периода отсутствия мастера"""
    data_to_upd = update_data.model_dump(exclude_unset=True)
    return await MasterAbsenceModel.update(
        session=session,
        id=update_data.absence_id,
        update_data=data_to_upd
    )