import os
import uuid
from datetime import date, datetime
from typing import List

import aiofiles
from fastapi import Depends, APIRouter, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from backend.model import pricelist

UPLOAD_DIR = "temps"
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(
    prefix="/masters",
    tags=["Master"]
)





@router.get("/categories", response_model=dict)
async def get_master_categories(
    master_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session)
):
    """Получение категорий мастера"""
    categories = await miniapp_db_fcn.get_master_categories(
        master_id=master_id,
        session=session
    )
    return {
        "status": "success",
        "categories": [{"id": str(cat.id), "name": cat.name} for cat in categories]
    }

























@router.get("/prices/category", response_model=PriceListResponse)
async def get_prices_by_category(
    master_id: uuid.UUID,
    category_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session)
):
    """Получение позиций прайса по категории"""
    status, prices = await miniapp_db_fcn.get_prices_by_category(
        master_id=master_id,
        category_id=category_id,
        session=session
    )
    return {
        "status": status,
        "prices": prices
    }


























