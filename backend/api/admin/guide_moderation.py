import uuid
from datetime import date
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.responses import StatusResponse
from backend.database import get_db_session
from backend.database import miniapp_db_fcn
from telegram_bot.bot_main import bot

router = APIRouter(
    prefix="/admins/guides",
    tags=["Admin.Guides"]
)

class DenyRequest(BaseModel):
    guide_id: uuid.UUID
    comment: str

class Guide(BaseModel):
    id: uuid.UUID
    name: str
    category: str
    guide_type: int
    created: date
    changed: date

class ApproveResponse(StatusResponse):
    approve_guides: List[Guide]

@router.get("/guides_for_approve", response_model=ApproveResponse)
async def get_non_approved(session: AsyncSession = Depends(get_db_session)):
    pending_guides = await miniapp_db_fcn.pending_guides(session=session)
    mod_resp = []
    for guide in pending_guides:
        guide_type = 1 if guide.video_steps_list else 0
        mod_resp.append({
            "id": guide.id,
            "name": guide.name,
            "category": guide.category.name,
            "guide_type": guide_type,
            "created": guide.guide_created,
            "changed": guide.guide_last_change,
        })
    return {
        "status": "success",
        "approve_guides": mod_resp,
    }

@router.patch("/approve", response_model=StatusResponse)
async def approve_guide(
        guide_id: uuid.UUID,
        session: AsyncSession = Depends(get_db_session)
):
    status = await miniapp_db_fcn.change_status(session=session, guide_id=guide_id, state=1)
    guide = await miniapp_db_fcn.get_guide(guide_id=guide_id, session=session)
    master = await miniapp_db_fcn.get_master(master_id=guide.author, session=session)
    await bot.send_message(chat_id=master.chat_id_tg, text="✅ Ваш гайд был одобрен модерацией headband. Поздравляем!")
    return {"status": status}

@router.patch("/deny", response_model=StatusResponse)
async def deny_guide(
        request: DenyRequest,
        session: AsyncSession = Depends(get_db_session)
):
    status = await miniapp_db_fcn.change_status(session=session, guide_id=request.guide_id, state=0)
    guide = await miniapp_db_fcn.get_guide(guide_id=request.guide_id, session=session)
    master = await miniapp_db_fcn.get_master(master_id=guide.author, session=session)
    await bot.send_message(chat_id=master.chat_id_tg,
                            text=f"❌ К сожалению, Ваш гайд пока не был одобрен модерацией headband по причине: {request.comment}")
    return {"status": status}