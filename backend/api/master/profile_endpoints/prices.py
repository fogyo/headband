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
from backend.database.obj_storage import s3_domain
from backend.database.responses import StatusResponse, IDResponse
from backend.model import pricelist
from backend.model.bg_factory import task_manager, TaskType


#Requests
class PriceCreateRequest(BaseModel):
    category_id: uuid.UUID
    name: str
    approximate_time: int
    price: int

class PriceUpdateRequest(BaseModel):
    id: uuid.UUID
    name: Optional[str] = None
    price: Optional[int] = None
    category_id: Optional[uuid.UUID] = None
    approximate_time: Optional[int] = None

#Responses
class PriceBaseResponse(BaseModel):
    id: uuid.UUID
    name: str
    price: int
    category: str
    approximate_time: int  # минуты

class FileUploadRequest(BaseModel):
    filepath: str

class PriceListResponse(BaseModel):
    status: str
    prices: List[PriceBaseResponse]

class CategoryBaseResponse(BaseModel):
    id: uuid.UUID
    name: str

class CategoryListResponse(StatusResponse):
    categories: List[CategoryBaseResponse]

#API
router = APIRouter(
    prefix="/master/profile/prices",
    tags=["Master.Profile"])


@router.post("/upload_price_file/")
async def upload_file(chat_id: int,
        request: FileUploadRequest,
        session: AsyncSession = Depends(get_db_session)):
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id

    file_url = f"{s3_domain}{request.filepath}"
    task_request = {"ai_task": TaskType.PRICELIST_MANAGING.value,
                    "data": {"file_url": file_url,
                            "master_id": master_id}}
    task = task_manager.delay(task_request)
    return {"status": "processing",
            "task": task.id}

@router.post("/create_price", response_model=IDResponse)
async def create_price(
    chat_id: int,
    request: PriceCreateRequest,
    session: AsyncSession = Depends(get_db_session)
):
    """Создание позиции прайса"""
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    price_dict = request.model_dump()
    price_dict["master_id"] = master_id
    price_id = await miniapp_db_fcn.create_price_position(price=price_dict,
        session=session)
    return {"status": "success", "id": price_id}

@router.patch("/", response_model=StatusResponse)
async def update_price(
    chat_id: int,
    request: PriceUpdateRequest,
    session: AsyncSession = Depends(get_db_session)
):
    """Обновление позиции прайса"""
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    price_to_upd = request.model_dump(exclude_unset=True)
    price_to_upd["master_id"] = master_id
    status = await miniapp_db_fcn.update_price(
        update_data=price_to_upd,
        session=session
    )
    if status != "success":
        raise HTTPException(status_code=400, detail=status)
    return {"status": status}

@router.delete("/{price_id}", response_model=StatusResponse)
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
    chat_id: int,
    session: AsyncSession = Depends(get_db_session)
):
    """Получение всех позиций прайса мастера"""
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    prices = await miniapp_db_fcn.get_prices_by_master_vm(
        master_id=master_id,
        session=session
    )
    return {
        "status": "success",
        "prices": prices,
    }

@router.get("/categories", response_model=CategoryListResponse)
async def get_categories(session: AsyncSession = Depends(get_db_session)):
    cats = await miniapp_db_fcn.get_all_categories(session=session)
    return {"status": "success",
            "categories": cats}