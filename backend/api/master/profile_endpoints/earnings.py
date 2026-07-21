import uuid
from datetime import date, time
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db_session, miniapp_db_fcn
from backend.database.responses import IDResponse, StatusResponse
from backend.telegram_bot.bot_main import bot, get_rating_keyboard


#Requests
class CreateCardRequest(BaseModel):
    master_id: uuid.UUID
    number: str

class EarningDateRangeRequest(BaseModel):
    master_id: uuid.UUID
    start_date: date
    end_date: date

class EarningUpdateRequest(BaseModel):
    id: uuid.UUID
    price: Optional[int] = None
    date: Optional[date] = None

class PrepayCreateRequest(BaseModel):
    percent: int
    start_date: date
    end_date: date

class PrepayUpdateRequest(BaseModel):
    id: uuid.UUID
    percent: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

#Responses
class EarningResponse(BaseModel):
    status: str
    amount: int
    number: int

class PrepayBaseResponse(BaseModel):
    id: uuid.UUID
    percent: int
    start_date: date
    end_date: date
    master_id: uuid.UUID

class PrepayListResponse(BaseModel):
    status: str
    prepayments: List[PrepayBaseResponse]

class CardResponse(StatusResponse):
    last_digits: int
    amount_digits: int

class AppointmentConfirmationResponse(BaseModel):
    appo_id: uuid.UUID
    name: str
    day: date
    start_time: time
    end_time: time
    price: int

class AppointmentConfirmationList(StatusResponse):
    pending_appos: List[AppointmentConfirmationResponse]

#API
router = APIRouter(
    prefix="/master/profile/earnings",
    tags=["Master.Profile"])

@router.get("/confirmation", response_model=AppointmentConfirmationList)
async def get_pending_appointments(
        chat_id: int,
        session: AsyncSession = Depends(get_db_session)
):
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    appointments = await miniapp_db_fcn.get_on_confirm(master_id=master_id, session=session)
    pends = []
    for a in appointments:
        price = await miniapp_db_fcn.get_price_by_id(a.price_id, session=session)
        resp = {"appo_id": a.id,
                "name": price.name,
                "day": a.date,
                "start_time": a.start_time,
                "end_time": a.end_time,
                "price": a.final_price}
        pends.append(resp)
    return {"status": "success",
            "pending_appos": pends}


@router.get("/this_month", response_model=EarningResponse)
async def get_master_earnings_this_month(
    chat_id: int,
    session: AsyncSession = Depends(get_db_session)
):
    """Получение всех доходов мастера"""
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    start_date = date.today().replace(day=1)
    status, amount, number = await miniapp_db_fcn.get_earnings_by_date_range(
        master_id=master_id,
        start_date=start_date,
        end_date=date.today(),
        session=session
    )
    return {
        "status": status,
        "amount": amount,
        "number": number
    }

@router.get("/range", response_model=EarningResponse)
async def get_master_earnings_by_range(
    chat_id: int,
    start_date: date,
    end_date: date,
    session: AsyncSession = Depends(get_db_session)
):
    """Получение всех доходов мастера"""
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    status, amount, number = await miniapp_db_fcn.get_earnings_by_date_range(
        master_id=master_id,
        start_date=start_date,
        end_date=end_date,
        session=session
    )
    return {
        "status": status,
        "amount": amount,
        "number": number
    }


@router.post("/confirm", response_model=IDResponse)
async def create_earning(
    chat_id: int,
    appointment_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session)
):
    """Создание записи о доходе"""
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    status, earning_id = await miniapp_db_fcn.create_earning(
        master_id=master_id,
        appointment_id=appointment_id,
        session=session
    )
    appointment = await miniapp_db_fcn.get_appointment(appointment_id=appointment_id, session=session)
    user = await miniapp_db_fcn.get_user(user_id=appointment.user_id, session=session)
    if user.chat_id != chat_id:
        await bot.send_message(chat_id=user.chat_id, text=f"Оцените, как прошла последняя запись {appointment.day} в {appointment.start_time}, где 5-отлично, а 1-ужасно ", reply_markup=get_rating_keyboard(appointment_id=appointment_id))
    if status != "success":
        raise HTTPException(status_code=400, detail=status)
    return {"status": status, "id": earning_id}


@router.delete("/cancel", response_model=StatusResponse)
async def delete_earning(
    appo_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session)
):
    """Удаление записи о доходе"""
    status = await miniapp_db_fcn.delete_earning(
        appo_id=appo_id,
        session=session
    )
    if status != "success":
        raise HTTPException(status_code=404, detail=status)
    return {"status": status}

@router.get("/prepayments", response_model=PrepayListResponse)
async def get_master_prepayments(
    chat_id: int,
    session: AsyncSession = Depends(get_db_session)
):
    """Получение всех периодов предоплаты мастера"""
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    status, prepayments = await miniapp_db_fcn.get_prepayments_by_master(
        master_id=master_id,
        session=session
    )
    return {
        "status": status,
        "prepayments": prepayments
    }

@router.post("/prepayments/create", response_model=IDResponse)
async def create_prepayment(
    chat_id: int,
    request: PrepayCreateRequest,
    session: AsyncSession = Depends(get_db_session)
):
    """Создание периода предоплаты"""
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    status, prepay_id = await miniapp_db_fcn.create_prepayment(
        master_id=master_id,
        percent=request.percent,
        start_date=request.start_date,
        end_date=request.end_date,
        session=session
    )
    if status != "success":
        raise HTTPException(status_code=400, detail=status)
    return {"status": status, "id": prepay_id}

@router.patch("/prepayments/update", response_model=StatusResponse)
async def update_prepayment(
    request: PrepayUpdateRequest,
    session: AsyncSession = Depends(get_db_session)
):
    """Обновление периода предоплаты"""
    update_data = request.model_dump(exclude_unset=True)
    status = await miniapp_db_fcn.update_prepayment(
        prepay_id=request.id,
        update_data=update_data,
        session=session
    )
    return {"status": status}

@router.delete("/prepayments/{prepay_id}", response_model=StatusResponse)
async def delete_prepayment(
    prepay_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session)
):
    """Удаление периода предоплаты"""
    status = await miniapp_db_fcn.delete_prepayment(
        prepay_id=prepay_id,
        session=session
    )
    if status != "success":
        raise HTTPException(status_code=404, detail=status)
    return {"status": status}


#TODO сделать интеграцию юкассы позже. Ввжно
"""@router.post("/card/create", response_model=IDResponse)
async def create_card(
    request: CreateCardRequest,
    session: AsyncSession = Depends(get_db_session)
):
    status, prepay_id = await miniapp_db_fcn.create_card(
        master_id=request.master_id,
        last_digits=int(request.number[-4:]),
        amount_digits=len(request.number),
        session=session
    )
    if status != "success":
        raise HTTPException(status_code=400, detail=status)
    return {"status": status, "id": prepay_id}

@router.get("/card", response_model=CardResponse)
async def get_card(
        master_id: uuid.UUID,
        session: AsyncSession = Depends(get_db_session)
        ):
    card = await miniapp_db_fcn.get_card(master_id=master_id, session=session)
    return {"status": "success",
            "last_digits": card.last_digits,
            "amount_digits": card.amount_digits}

@router.patch("/card/update", response_model=StatusResponse)
async def update_card(
    request: CreateCardRequest,
    session: AsyncSession = Depends(get_db_session)
):
    card = await miniapp_db_fcn.get_card(master_id=request.master_id, session=session)
    update_data = {"last_digits": request.number[:-4],
                   "amount_digits": len(request.number)}
    status = await miniapp_db_fcn.update_card(
        card_id=card.id,
        update_data=update_data,
        session=session
    )
    return {"status": status}"""
