import uuid
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db_session, miniapp_db_fcn
from backend.database.responses import StatusResponse

router = APIRouter(
    prefix="/users/price",
    tags=["User.Price"]
)

class PriceTemplate(BaseModel):
    id: uuid.UUID
    name: str
    price: int

class CategoryTemplate(BaseModel):
    category_name: str
    prices: List[PriceTemplate]

class PricePageResponse(StatusResponse):
    categories: List[CategoryTemplate]

@router.get("/", response_model=PricePageResponse)
async def get_price(master_id: uuid.UUID,
                    session: AsyncSession = Depends(get_db_session)):
    prices = await miniapp_db_fcn.get_prices_by_master(master_id=master_id, session=session)
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
                         "price": p["price"]}
                price_by_cat.append(price)
        cat_dict = {"category_name": cat,
                    "prices": price_by_cat}
        cat_template.append(cat_dict)
    return {"status": "success",
            "categories": cat_template}

