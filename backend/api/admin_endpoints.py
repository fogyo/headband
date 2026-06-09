import uuid

from fastapi import Depends, APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db_session, miniapp_db_fcn
from backend.database.responses import StatusResponse


router = APIRouter(
    prefix="/admins",
    tags=["Admin"]
)

@router.patch("/set_ambassador", response_model=StatusResponse)
async def set_amba(
        chat_id: int,
        session: AsyncSession = Depends(get_db_session)):
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    status = await miniapp_db_fcn.set_ambassador(master_id=master_id, session=session)
    return {"status": status}


