import uuid
from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db_session, miniapp_db_fcn
from backend.database.obj_storage import s3_domain
from backend.database.responses import StatusResponse

router = APIRouter(
    prefix="/headbeauty",
    tags=["Headbeauty.Welcome"]
)

#Request
class SessionCreateRequest(BaseModel):
    gender: bool
    img_url: str

#Response
class SessionResponse(BaseModel):
    id: uuid.UUID
    gender: bool
    img_url: str
    created_at: date

class WelcomePageResponse(StatusResponse):
    sessions: Optional[List[SessionResponse]] = []



@router.get("/", response_model=WelcomePageResponse)
async def get_page(chat_id: int,
                   session: AsyncSession = Depends(get_db_session)):
    res = await miniapp_db_fcn.get_all_sessions(chat_id=chat_id, session=session)
    if len(res) == 0:
        return {"status": "success",
                "sessions": []}
    else:
        sessions = [{"id": s.id,
                     "gender": s.gender,
                     "img_url": f"{s3_domain}{s.img_url}",
                     "created_at": s.created_at} for s in res]
        return {"status": "success",
                "sessions": sessions}

@router.post("/make_new_session", response_model=SessionResponse)
async def create_hb_session(chat_id: int,
                            hb_session: SessionCreateRequest,
                            session: AsyncSession = Depends(get_db_session)):
    await miniapp_db_fcn.create_session(chat_id=chat_id, gender=hb_session.gender, img_url=hb_session.img_url, session=session)
    return {"status": "success"}