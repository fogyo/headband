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


router = APIRouter(
    prefix="/users/booking",
    tags=["User.Book"]
)

class AppointmentCreateRequest(BaseModel):
    user_id: uuid.UUID
    price_id: uuid.UUID
    day: date
    start_time: time


class BookingPageResponse(StatusResponse):
    possible_time: List[time]
    address: str


@router.get("/", response_model=BookingPageResponse)
async def get_booking_info(price_id: uuid.UUID,
                           day: date,
                           session: AsyncSession = Depends(get_db_session)):
    price = await miniapp_db_fcn.get_price_by_id(price_id=price_id, session=session)
    possible_time, status, address = await miniapp_db_fcn.get_possible_start_time(master_id=price.master_id, app_date=day, price_id=price_id, session=session)
    return {"status": "success",
            "possible_time": possible_time,
            "address": address}

@router.post("/create_appointment", response_model=StatusResponse)
async def create_appointment(request: AppointmentCreateRequest,
                             session: AsyncSession = Depends(get_db_session)):
    price = await miniapp_db_fcn.get_price_by_id(price_id=request.price_id, session=session)
    working_day = await miniapp_db_fcn.get_day(master_id=price.master_id, day=request.day, session=session)
    create_data = {"user_id": request.user_id,
                   "master_id": price.master_id,
                   "date": request.day,
                   "start_time": request.start_time,
                   "end_time": _timedelta_to_time(_time_to_timedelta(request.start_time)+_time_to_timedelta(_int_minutes_to_time(price.approximate_time))),
                   "final_price": price.price,
                   "working_day_id": working_day.id}
    status = await miniapp_db_fcn.create_appointment(appointment_dict=create_data, session=session)
    return {"status": status}