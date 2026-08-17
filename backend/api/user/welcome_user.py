import logging
import uuid
from datetime import date, datetime, time
from typing import List, Optional

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

class MessageEdit(BaseModel):
    text: str

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
    
class Message(BaseModel):
    appointment_id: uuid.UUID
    text: str

class MessageInChat(BaseModel):
    message_id: uuid.UUID
    text: str
    my: bool
    created_at: datetime


class IDResponse(StatusResponse):
    id: uuid.UUID

class Chat(StatusResponse):
    messages: Optional[List[MessageInChat]] = None

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
    status, notification = await miniapp_db_fcn.get_master_notification(master_id=appointment.master_id, session=session)
    if notification["appointment_cancel_notification"]:
        try:
            from backend.telegram_bot.bot_main import send_all_delayed
            await bot.send_message(chat_id=master.chat_id_tg,
                               text=f"❌ Отмена записи на {appointment.date} c {appointment.start_time.strftime("%H:%M")} до {appointment.end_time.strftime("%H:%M")}")
            await send_all_delayed(session=session)
        except Exception as e:
            logging.info(f"bot messages with {e}")
            await miniapp_db_fcn.create_delayed_message(chat_id=master.chat_id_tg,
                               text=f"❌ Отмена записи на {appointment.date} c {appointment.start_time.strftime("%H:%M")} до {appointment.end_time.strftime("%H:%M")}", session=session)
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
    try:
        from backend.telegram_bot.bot_main import send_all_delayed
        await bot.send_message(chat_id=980609742, text=f"{complaint_text} \nID пользователя: {chat_id}\nID проблемы: {req_id}")
        await send_all_delayed(session=session)
    except Exception as e:
            logging.info(f"bot messages with {e}")
            await miniapp_db_fcn.create_delayed_message(chat_id=980609742, text=f"{complaint_text} \nID пользователя: {chat_id}\nID проблемы: {req_id}", session=session)
    return {"status": "success"}

@router.post("/write_message_to_master", response_model=IDResponse)
async def create_message(chat_id: int,
                         message: Message,
                         session: AsyncSession = Depends(get_db_session)):
    user = await miniapp_db_fcn.get_user_id(chat_id=chat_id, session=session)
    appointment = await miniapp_db_fcn.get_appointment(appointment_id=message.appointment_id, session=session)
    master = await miniapp_db_fcn.get_master(master_id=appointment.master_id, session=session)
    message_id = await miniapp_db_fcn.create_message(uid=user, appointment_id=message.appointment_id, text=message.text, session=session)
    try:
        from backend.telegram_bot.bot_main import send_all_delayed
        await bot.send_message(chat_id=master.chat_id_tg, text=f"❗ Новое сообщение по записи на {appointment.date} c {appointment.start_time.strftime("%H:%M")} до {appointment.end_time.strftime("%H:%M")}\n\n{message.text}\n\nЗайдите в чат встречи, чтобы ответить!")
        await send_all_delayed(session=session)
    except Exception as e:
            logging.info(f"bot messages with {e}")
            await miniapp_db_fcn.create_delayed_message(chat_id=master.chat_id_tg, text=f"❗ Новое сообщение по записи на {appointment.date} c {appointment.start_time.strftime("%H:%M")} до {appointment.end_time.strftime("%H:%M")}\n\n{message.text}\n\nЗайдите в чат встречи, чтобы ответить!", session = session)
    return {"status": "success",
            "id": message_id}

@router.patch("/edit_message", response_model=StatusResponse)
async def edit_message(message_id: uuid.UUID,
                       message: MessageEdit,
                       session: AsyncSession = Depends(get_db_session)):
    status = await miniapp_db_fcn.edit_message(text=message.text, message_id=message_id, session=session)
    return {"status": status}

@router.get("/appointment_chat", response_model=Chat)
async def get_appointment_chat(chat_id: int,
                               appointment_id: uuid.UUID,
                               session: AsyncSession = Depends(get_db_session)):
    user_id = await miniapp_db_fcn.get_user_id(chat_id=chat_id, session=session)
    chat = await miniapp_db_fcn.get_all_messages_by_appo_and_texter(texter_id=user_id, appointment_id=appointment_id, session=session)
    return {"status": "success",
            "messages": chat}