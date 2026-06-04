import uuid
from datetime import date, time
from typing import Optional, List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import miniapp_db_fcn, get_db_session




# Responses
class AppointmentResponse(BaseModel):
    id: uuid.UUID
    master_id: uuid.UUID
    date: date
    start_time: time
    end_time: time
    final_price: int
    address: Optional[str] = None
    service_name: Optional[str] = None


class AppointmentListResponse(BaseModel):
    status: str
    count: int
    appointments: List[AppointmentResponse]


# API
router = APIRouter(
    prefix="/master/welcome",
    tags=["Master.Welcome"]
)

@router.get("/", response_model=AppointmentListResponse)
async def get_appointments_today(
        chat_id: int,
        session: AsyncSession = Depends(get_db_session)
):
    """Получение записей мастера на дату"""
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    appointments, count, status, addresses, names = await miniapp_db_fcn.get_appointments_by_date(
        master_id=master_id,
        app_date=date.today(),
        session=session
    )

    a = []
    for i, appointment in enumerate(appointments):
        aresponse = AppointmentResponse.model_validate(appointment).model_dump()
        aresponse["address"] = addresses[i] if i < len(addresses) else None
        aresponse["service_name"] = names[i] if i < len(names) else None
        a.append(aresponse)

    return {
        "status": status,
        "count": count,
        "appointments": a
    }