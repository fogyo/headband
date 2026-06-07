import uuid
from datetime import date, time
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db_session, miniapp_db_fcn
from backend.database.responses import StatusResponse


class Appointment(BaseModel):
    service_name: str
    address: str
    day: date
    start_time: time
    end_time: time
    price: int

class AppointmentListResponse(StatusResponse):
    appointments: List[Appointment]

router = APIRouter(
    prefix="/users/welcome",
    tags=["User.Welcome"]
)

@router.get("/", response_model=AppointmentListResponse)
async def get_welcome(chat_id: int,
                      session: AsyncSession = Depends(get_db_session)):
    user_id = await miniapp_db_fcn.get_user_id(chat_id=chat_id, session=session)
    appointments = await miniapp_db_fcn.get_appointments_by_user(user_id=user_id, session=session)
    return {"status": "success",
            "appointments": appointments}

@router.delete("/appointment", response_model=StatusResponse)
async def cancel_appointment(appointment_id: uuid.UUID, session: AsyncSession):
    return {"status": await miniapp_db_fcn.cancel_appointment(appointment_id=appointment_id, session=session)}