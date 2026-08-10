import uuid
from datetime import date, time
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db_session, miniapp_db_fcn
from backend.database.responses import StatusResponse
from backend.telegram_bot.bot_main import bot
from backend.database.obj_storage import s3_domain

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

class Master(BaseModel):
    id: uuid.UUID
    name: str
    avatar: str

class PreviousMasters(StatusResponse):
    masters: List[Master]

class ComplainRequest(BaseModel):
    master_id: uuid.UUID
    text: str
    
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

@router.get("/previous_masters", response_model=PreviousMasters)
async def get_previous_masters(chat_id: int, session: AsyncSession = Depends(get_db_session)):
    user_id = await miniapp_db_fcn.get_user_id(chat_id=chat_id, session=session)
    prev_masters = await miniapp_db_fcn.get_previous_masters(user_id=user_id, session=session)
    prev_masters = list(set(prev_masters))
    resp = []
    for master_id in prev_masters:
        master = await miniapp_db_fcn.get_master(master_id=master_id, session=session)
        resp.append({"id": master_id,
                     "name": master.full_name,
                     "avatar": f"{s3_domain}{master.avatar}"})
    return {"status": "success",
            "masters": resp}

@router.post("/master_complaint", response_model=StatusResponse)
async def complain_about_master(chat_id: int,
                                request: ComplainRequest, 
                                session: AsyncSession = Depends(get_db_session)):
    master = await miniapp_db_fcn.get_master(master_id=request.master_id, session=session)
    complaint_text = f"Жалоба на мастера\nid: {master.id}\ntg: {master.username_tg}\n\n{request.text}"
    req_id = await miniapp_db_fcn.create_support_request(chat_id=chat_id, text=complaint_text, session=session)
    await bot.send_message(chat_id=980609742, text=f"{complaint_text} \nID пользователя: {chat_id}\nID проблемы: {req_id}")
    return {"status": "success"}