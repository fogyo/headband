import datetime
import uuid
from typing import List

from fastapi import APIRouter, Depends
from datetime import time, date

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db_session, miniapp_db_fcn
from backend.database.operations.utils import _time_to_timedelta, _int_minutes_to_time, _timedelta_to_time
from backend.database.responses import StatusResponse
from backend.telegram_bot.bot_main import bot

router = APIRouter(
    prefix="/users/booking",
    tags=["User.Book"]
)

class AppointmentCreateRequest(BaseModel):
    price_id: uuid.UUID
    day: date
    start_time: time


class BookingPageResponse(StatusResponse):
    possible_time: List[time]
    address: str
    parental_category: str


@router.get("/", response_model=BookingPageResponse)
async def get_booking_info(price_id: uuid.UUID,
                           day: date,
                           session: AsyncSession = Depends(get_db_session)):
    price = await miniapp_db_fcn.get_price_by_id(price_id=price_id, session=session)
    parental = await miniapp_db_fcn.get_parental_by_id(category_id=price.category_id, session=session)
    possible_time, status, address = await miniapp_db_fcn.get_possible_start_time(master_id=price.master_id, app_date=day, price_id=price_id, session=session)
    return {"status": status,
            "possible_time": possible_time,
            "address": address,
            "parental_category": parental}

@router.post("/create_appointment", response_model=StatusResponse)
async def create_appointment(chat_id: int,
                             request: AppointmentCreateRequest,
                             session: AsyncSession = Depends(get_db_session)):
    user_id = await miniapp_db_fcn.get_user_id(chat_id=chat_id, session=session)
    price = await miniapp_db_fcn.get_price_by_id(price_id=request.price_id, session=session)
    working_day = await miniapp_db_fcn.get_day(master_id=price.master_id, day=request.day, session=session)
    master = await miniapp_db_fcn.get_master(master_id=price.master_id, session=session)
    end_time = _timedelta_to_time(_time_to_timedelta(request.start_time)+_time_to_timedelta(_int_minutes_to_time(price.approximate_time)))
    create_data = {"user_id": user_id,
                   "master_id": price.master_id,
                   "date": request.day,
                   "start_time": request.start_time,
                   "end_time": end_time,
                   "price_id": price.id,
                   "final_price": price.price,
                   "working_day_id": working_day.id}
    status = await miniapp_db_fcn.create_appointment(appointment_dict=create_data, session=session)
    notification = await miniapp_db_fcn.get_master_notification(master_id=price.master_id, session=session)
    if notification["appointment_notification"]:
        await bot.send_message(chat_id=master.chat_id_tg, text=f"✅ Новая запись на {request.day} c {request.start_time} до {end_time}")
    return {"status": status}