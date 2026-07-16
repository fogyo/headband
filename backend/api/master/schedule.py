import uuid
from datetime import date, time
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import miniapp_db_fcn, get_db_session, AddressModel, WorkingDayModel, PriceModel
from backend.database.responses import StatusResponse



#Responses
class AppointmentResponse(BaseModel):
    id: uuid.UUID
    master_id: uuid.UUID
    date: date
    start_time: time
    end_time: time
    final_price: int
    address: Optional[str] = None
    service_name: Optional[str] = None


class AppointmentListResponse(StatusResponse):
    count: int
    appointments: List[AppointmentResponse]


class WeekTimetableResponse(StatusResponse):
    week_appointments: List[List[AppointmentResponse]]


#API
router = APIRouter(
    prefix="/master/schedule",
    tags=["Master.Schedule"]
)

@router.get("/date", response_model=AppointmentListResponse)
async def get_appointments_by_date(
        chat_id: int,
        day: date,
        session: AsyncSession = Depends(get_db_session)
):
    """Получение записей мастера на дату"""
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id

    appointments = await miniapp_db_fcn.get_appointments_by_date(
        master_id=master_id,
        app_date=day,
        session=session
    )

    a = []
    for i, appointment in enumerate(appointments):
        working_day = await WorkingDayModel.get_by_id(session=session, id = appointment.working_day_id)
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

    return {
        "status": "success",
        "count": len(a),
        "appointments": a
    }


@router.get("/week", response_model=WeekTimetableResponse)
async def get_week_timetable(
        chat_id: int,
        day: date,
        session: AsyncSession = Depends(get_db_session)
):
    """Получение расписания мастера на неделю"""
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id

    week_appointments, status = await miniapp_db_fcn.get_week_timetable(
        master_id=master_id,
        start_date=day,
        session=session
    )
    if status != "success":
        raise HTTPException(status_code=404, detail=status)

    return {
        "status": status,
        "week_appointments": week_appointments
    }