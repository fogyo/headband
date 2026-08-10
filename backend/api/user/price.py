import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db_session, miniapp_db_fcn
from backend.database.responses import StatusResponse
from backend.database.obj_storage import s3_domain

class WorkFile(BaseModel):
    name: str
    filepath: str

class WorkFileResp(WorkFile):
    id: uuid.UUID

class WorkFilesResponse(StatusResponse):
    files: Optional[List[WorkFileResp]] = None

router = APIRouter(
    prefix="/users/price",
    tags=["User.Price"]
)

class PriceTemplate(BaseModel):
    id: uuid.UUID
    name: str
    price: int
    duration: int

class CategoryTemplate(BaseModel):
    category_name: str
    prices: List[PriceTemplate]

class PricePageResponse(StatusResponse):
    categories: List[CategoryTemplate]

class MasterResponse(StatusResponse):
    name: str
    avatar: str
    description: Optional[str] = "О себе не заполнено"
    portfolio: bool

@router.get("/", response_model=PricePageResponse)
async def get_price(master_id: uuid.UUID,
                    session: AsyncSession = Depends(get_db_session)):
    prices = await miniapp_db_fcn.get_prices_by_master_vu(master_id=master_id, session=session)
    cats = []
    for p in prices:
        cats.append(p["category"])
    cat_set = set(cats)
    cat_template = []
    for cat in cat_set:
        price_by_cat = []
        for p in prices:
            if p["category"] == cat:
                price = {"id": p["id"],
                         "name": p["name"],
                         "price": p["price"],
                         "duration": p["approximate_time"]}
                price_by_cat.append(price)
        cat_dict = {"category_name": cat,
                    "prices": price_by_cat}
        cat_template.append(cat_dict)
    return {"status": "success",
            "categories": cat_template}

@router.get("/master_info", response_model=MasterResponse)
async def get_master_info_for_user(master_id: uuid.UUID,
                                   session: AsyncSession = Depends(get_db_session)):
    portfolio_availability = True
    master = await miniapp_db_fcn.get_master(master_id=master_id, session=session)
    portfolio = await miniapp_db_fcn.get_works_by_master(master_id=master_id, session=session)
    if len(portfolio)==0:
        portfolio_availability = False
    return {"status": "success",
            "name": master.full_name,
            "avatar": f"{s3_domain}{master.avatar}",
            "description": master.description,
            "portfolio": portfolio_availability}

@router.get("/master_portfolio", response_model=WorkFilesResponse)
async def get_images(
        master_id: uuid.UUID,
        session: AsyncSession = Depends(get_db_session)
        ):
    files = await miniapp_db_fcn.get_works_by_master(master_id=master_id, session=session)
    resp = []
    for f in files:
        resp.append({"id": f.id,
                     "name": f.name,
                     "filepath": f"{s3_domain}{f.filepath}"})
    return {"status": "success",
            "files": resp}

