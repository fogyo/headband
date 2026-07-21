import uuid
from datetime import date, time
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db_session, miniapp_db_fcn
from backend.database.responses import StatusResponse
from backend.telegram_bot.bot_main import bot


class Appointment(BaseModel):
    appointment_id: uuid.UUID
    service_name: str
    address: str
    day: date
    start_time: time
    end_time: time
    price: int
    parental_category: str

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
async def cancel_appointment(appointment_id: uuid.UUID, session: AsyncSession = Depends(get_db_session)):
    appointment = await miniapp_db_fcn.get_appointment(appointment_id=appointment_id, session=session)
    master = await miniapp_db_fcn.get_master(master_id=appointment.master_id, session=session)
    status = await miniapp_db_fcn.cancel_appointment(appointment_id=appointment_id, session=session)
    notification = await miniapp_db_fcn.get_master_notification(master_id=appointment.master_id, session=session)
    if notification["appointment_cancel_notification"]:
        await bot.send_message(chat_id=master.chat_id_tg,
                               text=f"❌ Отмена записи на {appointment.date} c {appointment.start_time} до {appointment.end_time}")
    return {"status": status}