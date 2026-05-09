import os
import uuid
from datetime import time
from typing import Optional, List

import aiofiles
from fastapi import APIRouter, UploadFile, Depends, HTTPException
from fastapi.params import File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend import TEMPS_DIR
from backend.database import get_db_session, miniapp_db_fcn
from backend.database.responses import StatusResponse, IDResponse
from backend.model import pricelist

#Requests
class PriceCreateRequest(BaseModel):
    category: str
    name: str
    approximate_time: int
    price: int
    master_id: uuid.UUID

class PriceUpdateRequest(BaseModel):
    id: uuid.UUID
    master_id: uuid.UUID
    name: Optional[str] = None
    price: Optional[int] = None
    category_id: Optional[uuid.UUID] = None
    approximate_time: Optional[time] = None

#Responses
class PriceBaseResponse(BaseModel):
    id: uuid.UUID
    name: str
    price: int
    category: str
    approximate_time: int  # минуты
    master_id: uuid.UUID

class PriceListResponse(BaseModel):
    status: str
    prices: List[PriceBaseResponse]

#API
router = APIRouter(
    prefix="/master/profile/prices",
    tags=["Master.Profile"])


@router.post("/upload_price_file/{master_id}")
async def upload_file(master_id: uuid.UUID,
        file: UploadFile = File(...),
        session: AsyncSession = Depends(get_db_session)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, detail="Invalid file type")

    file_extension = os.path.splitext(file.filename)[1]
    safe_filename = f"image_{uuid.uuid4().hex}{file_extension}"
    file_path = os.path.join(TEMPS_DIR, safe_filename)

    async with aiofiles.open(file_path, 'wb') as f:
        while chunk := await file.read(1024 * 1024):  # читаем по 1 МБ
            await f.write(chunk)

    data = await pricelist.get_price_list(file_path)
    res = await miniapp_db_fcn.create_pricelist(data=data, master_id=master_id, session=session)
    return {"status": "success",
            "prices": res}

@router.post("/create_price", response_model=IDResponse)
async def create_price(
    request: PriceCreateRequest,
    session: AsyncSession = Depends(get_db_session)
):
    """Создание позиции прайса"""
    price_dict = request.model_dump()
    status, price_id = await miniapp_db_fcn.create_price_position(price=price_dict,
        session=session
    )
    if status != "success":
        raise HTTPException(status_code=400, detail=status)
    return {"status": status, "id": price_id}

@router.patch("/prices", response_model=StatusResponse)
async def update_price(
    request: PriceUpdateRequest,
    session: AsyncSession = Depends(get_db_session)
):
    """Обновление позиции прайса"""
    price_to_upd = request.model_dump(exclude_unset=True)
    status = await miniapp_db_fcn.update_price(
        update_data=price_to_upd,
        session=session
    )
    if status != "success":
        raise HTTPException(status_code=400, detail=status)
    return {"status": status}

@router.delete("/prices/{price_id}", response_model=StatusResponse)
async def delete_price(
    price_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session)
):
    """Удаление позиции прайса"""
    status = await miniapp_db_fcn.delete_price(
        price_id=price_id,
        session=session
    )
    if status != "success":
        raise HTTPException(status_code=404, detail=status)
    return {"status": status}

@router.get("/prices", response_model=PriceListResponse)
async def get_master_prices(
    master_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session)
):
    """Получение всех позиций прайса мастера"""
    prices = await miniapp_db_fcn.get_prices_by_master(
        master_id=master_id,
        session=session
    )
    return {
        "status": "success",
        "prices": prices,
    }