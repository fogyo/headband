import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import miniapp_db_fcn, get_db_session
from backend.database.responses import StatusResponse

#Responses
class GuideBaseResponse(BaseModel):
    id: uuid.UUID
    name: str
    category: str
    video: bool
    liked: bool
    likes: int
    views: int


class GuidePageResponse(StatusResponse):
    guides_fit: List[GuideBaseResponse]
    guides_all: List[GuideBaseResponse]


class StepInfoResponse(StatusResponse):
    step_types: List[bool]
    total: int


class StepResponse(BaseModel):
    step_id: uuid.UUID
    name: str
    text: str
    step_num: int
    img_url: Optional[str] = None

class VideoResponse(StatusResponse):
    step_id: uuid.UUID
    video_name: str
    description: str
    video_url: str
    preview: Optional[str] = None

class GuideResponse(StatusResponse):
    name: str
    steps: List[StepResponse]

class LikeResponse(StatusResponse):
    liked: bool

"""API"""
router = APIRouter(
    prefix="/master/guides",
    tags=["Master.Guide"]
)


@router.get("/", response_model=GuidePageResponse)
async def get_guides(
    chat_id: int,
    session: AsyncSession = Depends(get_db_session)
):
    """Получение списка гайдов для мастера"""
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    status, g_fitable, g_all = await miniapp_db_fcn.get_guides(
        master_id=master_id,
        session=session
    )
    return {
        "status": status,
        "guides_fit": g_fitable,
        "guides_all": g_all
    }

@router.get("/step_text", response_model=GuideResponse)
async def get_steps_text(
        guide_id: uuid.UUID,
        session: AsyncSession = Depends(get_db_session)
):
    status, steps = await miniapp_db_fcn.get_steps(guide_id=guide_id, session=session)
    guide = await miniapp_db_fcn.get_guide(guide_id=guide_id, session=session)
    return {"status": "success",
            "name": guide.name,
            "steps": steps}

@router.get("/step_video", response_model=VideoResponse)
async def get_steps_video(
        guide_id: uuid.UUID,
        session: AsyncSession = Depends(get_db_session)
):
    return await miniapp_db_fcn.get_video_steps(guide_id=guide_id, session=session)


@router.post("/view", response_model=StatusResponse)
async def create_view(
        chat_id: int,
        guide_id: uuid.UUID,
        session: AsyncSession = Depends(get_db_session)
):
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    await miniapp_db_fcn.add_view(master_id=master_id, guide_id=guide_id, session=session)
    return {"status": "success"}

@router.patch("/like", response_model=StatusResponse)
async def toggle_like(
        chat_id: int,
        guide_id: uuid.UUID,
        session: AsyncSession = Depends(get_db_session)
):
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    await miniapp_db_fcn.change_state(master_id=master_id, guide_id=guide_id, session=session)
    return {"status": "success"}

@router.get("/like_status", response_model=LikeResponse)
async def check_like(chat_id: int,
                     guide_id: uuid.UUID,
                     session: AsyncSession = Depends(get_db_session)
                     ):
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    condition = await miniapp_db_fcn.check_like(master_id=master_id, guide_id=guide_id, session=session)
    return {"status": "success",
            "liked": condition}

