import uuid
from datetime import date, datetime, time
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import miniapp_db_fcn, get_db_session, AddressModel, WorkingDayModel, PriceModel
from backend.database.responses import StatusResponse
from backend.telegram_bot.bot_main import bot

class Message(BaseModel):
    appointment_id: uuid.UUID
    text: str

class MessageEdit(BaseModel):
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
        if address!= None:
            address_arr = address.full_address.split(",")
            if len(address_arr)>=3:
                address_res = f"{address_arr[0]},{address_arr[1]},{address_arr[2]}"
            else:
                address_res = address.full_address
        aresponse = {"id": appointment.id,
                     "master_id": appointment.master_id,
                     "date": appointment.date,
                     "start_time": appointment.start_time,
                     "end_time": appointment.end_time,
                     "final_price": appointment.final_price,
                     "address": address_res,
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

@router.post("/write_message_to_master", response_model=IDResponse)
async def create_message(chat_id: int,
                         message: Message,
                         session: AsyncSession = Depends(get_db_session)):
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    appointment = await miniapp_db_fcn.get_appointment(appointment_id=message.appointment_id, session=session)
    user = await miniapp_db_fcn.get_user(user_id=appointment.user_id, session=session)
    message_id = await miniapp_db_fcn.create_message(uid=master.id, appointment_id=message.appointment_id, text=message.text, session=session)
    await bot.send_message(chat_id=user.chat_id, text=f"❗ Новое сообщение по записи на {appointment.date} c {appointment.start_time.strftime("%H:%M")} до {appointment.end_time.strftime("%H:%M")}\n\n{message.text}\n\nЗайдите в чат встречи, чтобы ответить!")
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
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    chat = await miniapp_db_fcn.get_all_messages_by_appo_and_texter(texter_id=master.id, appointment_id=appointment_id, session=session)
    return {"status": "success",
            "messages": chat}