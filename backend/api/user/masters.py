import uuid
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db_session, miniapp_db_fcn
from backend.database.responses import StatusResponse

router = APIRouter(
    prefix="/users/master",
    tags=["User.Master"]
)

class MasterResponse(BaseModel):
    id: uuid.UUID
    name: str
    avatar: str
    rating: float
    rates: int

class MasterPageResponse(StatusResponse):
    const_masters: List[MasterResponse]
    ambassador_masters: List[MasterResponse]

@router.get("/", response_model=MasterPageResponse)
async def get_master(user_id: uuid.UUID,
                     category_id: uuid.UUID,
                     session: AsyncSession = Depends(get_db_session)):

    const_masters_ids = await miniapp_db_fcn.get_constant_masters(user_id=user_id, session=session)
    cm_response = []
    for const_id in const_masters_ids:
        master_id = const_id.master_id
        if await miniapp_db_fcn.check_category(master_id=master_id, category_id=category_id, session=session):
            master = await miniapp_db_fcn.get_master(master_id=master_id, session=session)
            average, rates = await miniapp_db_fcn.get_rating(master_id=master_id, session=session)
            response = {"id": master_id,
                        "name": master.full_name,
                        "avatar": master.avatar,
                        "rating": average,
                        "rates": rates}
            cm_response.append(response)

    am_response = []
    ambassador_masters = await miniapp_db_fcn.get_ambassadors(session=session)
    for amba in ambassador_masters:
        master_id = amba.master_id
        if await miniapp_db_fcn.check_category(master_id=master_id, category_id=category_id, session=session):
            average, rates = await miniapp_db_fcn.get_rating(master_id=master_id, session=session)
            response = {"id": master_id,
                        "name": amba.full_name,
                        "avatar": amba.avatar,
                        "rating": average,
                        "rates": rates}
            am_response.append(response)

    return {"status": "success",
            "const_masters": cm_response,
            "ambassador_masters": am_response}