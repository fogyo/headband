import shutil
import uuid
from datetime import date
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend import UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_IMG_EXT, ALLOWED_VID_EXT
from backend.database import get_db_session, miniapp_db_fcn, obj_storage
from backend.database.obj_storage import s3_client
from backend.database.responses import StatusResponse
from backend.telegram_bot.bot_main import send_notification


#Requests
class DenyRequest(BaseModel):
    guide_id: uuid.UUID
    comment: str

class GuideTextRequest(BaseModel):
    name: str
    text: str
    step_num: int
    image_url: Optional[str] = None

class GuideUpdateTextRequest(BaseModel):
    step_id: uuid.UUID
    name: Optional[str] = None
    text: Optional[str] = None
    step_num: int
    image_url: Optional[str] = None

class GuideCreateRequest(BaseModel):
    name: str
    category_id: uuid.UUID
    steps: List[GuideTextRequest]

class GuideUpdateRequest(BaseModel):
    guide_id: uuid.UUID
    name: Optional[str] = None
    category: Optional[uuid.UUID] = None
    steps: List[GuideUpdateTextRequest]
    steps_to_add: List[GuideTextRequest]
    steps_to_delete: Optional[List[uuid.UUID]] = []

class GuideVideoRequest(GuideTextRequest):
    filepath: str

class UpdateVideoRequest(GuideUpdateTextRequest):
    filepath: Optional[str] = None

class GuideCreateVideoRequest(BaseModel):
    name: str
    category_id: uuid.UUID
    video: GuideVideoRequest

class GuideUpdateVideoRequest(BaseModel):
    guide_id: uuid.UUID
    name: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    video: Optional[UpdateVideoRequest] = None

#Responses
class BaseGuideResponse(BaseModel):
    id: uuid.UUID
    name: str
    category_id: uuid.UUID
    guide_type: int

class ApproveGuideResponse(BaseGuideResponse):
    created: date
    changed: date

class StatGuideResponse(BaseGuideResponse):
    views: int
    likes: int
    like: bool

class MyGuidesResponse(StatGuideResponse):
    created: date
    changed: date
    approved: Optional[date] = None

class VideoContentResponse(StatusResponse):
    filepath: str


class GuidesPageResponse(StatusResponse):
    my_guides: List[MyGuidesResponse]
    liked_guides: List[StatGuideResponse]
    approve_guides: Optional[List[ApproveGuideResponse]] = []


#API
router = APIRouter(
    prefix="/master/profile/guides",
    tags=["Master.Profile"])


@router.get("/", response_model=GuidesPageResponse)
async def get_guides_page(
        chat_id: int,
        session: AsyncSession = Depends(get_db_session)
):
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id

    master_guides, liked_guides = await miniapp_db_fcn.preuploaded_data(master_id=master_id, session=session)

    my_guides_resp = []
    for guide in master_guides:
        stat = await miniapp_db_fcn.get_stats(guide_id=guide.id, session=session)

        liked_by_me = any(stat.master_id == master_id and stat.action == 1 for stat in guide.guide_stats)

        guide_type = 1 if guide.video_steps_list else 0

        my_guides_resp.append({
            "id": guide.id,
            "name": guide.name,
            "category_id": guide.category_id,
            "views": stat["views"],
            "likes": stat["likes"],
            "like": liked_by_me,
            "guide_type": guide_type,
            "created": guide.guide_created,
            "changed": guide.guide_last_change,
            "approved": guide.guide_approved,
        })


    liked_guides_resp = []
    for guide in liked_guides:
        stat = await miniapp_db_fcn.get_stats(guide_id=guide.id, session=session)
        guide_type = 1 if guide.video_steps_list else 0

        liked_guides_resp.append({
            "id": guide.id,
            "name": guide.name,
            "category_id": guide.category_id,
            "views": stat["views"],
            "likes": stat["likes"],
            "like": True,   # мы загружали только лайкнутые
            "guide_type": guide_type,
            "created": guide.guide_created,
            "changed": guide.guide_last_change,
            "approved": guide.guide_approved,
        })

    # Если мастер амбассадор – добавляем гайды, ожидающие подтверждения
    if master.ambassador:
        pending_guides = await miniapp_db_fcn.pending_guides(session=session)
        amb_resp = []
        for guide in pending_guides:
            guide_type = 1 if guide.video_steps_list else 0
            amb_resp.append({
                "id": guide.id,
                "name": guide.name,
                "category_id": guide.category_id,
                "guide_type": guide_type,
                "created": guide.guide_created,
                "changed": guide.guide_last_change,
            })
        return {
            "status": "success",
            "my_guides": my_guides_resp,
            "liked_guides": liked_guides_resp,
            "approve_guides": amb_resp,
        }

    return {
        "status": "success",
        "my_guides": my_guides_resp,
        "liked_guides": liked_guides_resp,
    }


@router.patch("/ambassador/approve", response_model=StatusResponse)
async def approve_guide(
        guide_id: uuid.UUID,
        session: AsyncSession = Depends(get_db_session)
):
    status = await miniapp_db_fcn.change_status(session=session, guide_id=guide_id, state=1)
    guide = await miniapp_db_fcn.get_guide(guide_id=guide_id, session=session)
    master = await miniapp_db_fcn.get_master(master_id=guide.author, session=session)
    await send_notification(chat_id=master.chat_id_tg, text="✅ Ваш гайд был одобрен амбассадором headband. Поздравляем!")
    return {"status": status}

@router.patch("/ambassador/deny", response_model=StatusResponse)
async def deny_guide(
        request: DenyRequest,
        session: AsyncSession = Depends(get_db_session)
):
    status = await miniapp_db_fcn.change_status(session=session, guide_id=request.guide_id, state=0)
    guide = await miniapp_db_fcn.get_guide(guide_id=request.guide_id, session=session)
    master = await miniapp_db_fcn.get_master(master_id=guide.author, session=session)
    await send_notification(chat_id=master.chat_id_tg,
                            text=f"❌ К сожалению, Ваш гайд пока не был одобрен амбассадором headband по причине: {request.comment}")
    return {"status": status}

@router.post("/create_text", response_model=StatusResponse)
async def create_guide_text(
        chat_id: int,
        request: GuideCreateRequest,
        session: AsyncSession = Depends(get_db_session)
):
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    guide_id = await miniapp_db_fcn.create_guide(request={"name": request.name,
                                                    "category_id": request.category_id,
                                                    "author": master_id,
                                                    "guide_created": date.today(),
                                                    "guide_last_change": date.today()},
                                           session=session)
    steps = []
    for i, step in enumerate(request.steps):
        a = {"guide_id": guide_id,
             "name": step.name,
             "step_num": step.step_num,
             "text": step.text,
             "image_url": step.image_url
             }
        steps.append(a)
    status = await miniapp_db_fcn.create_step(step_data=steps, session=session)
    return {"status": status}


@router.post("/create_video", response_model=StatusResponse)
async def create_guide_video(
        chat_id: int,
        request: GuideCreateVideoRequest,
        session: AsyncSession = Depends(get_db_session)
):
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    guide_id = await miniapp_db_fcn.create_guide(request={"name": request.name,
                                                    "category_id": request.category_id,
                                                    "author": master_id,
                                                    "guide_created": date.today(),
                                                    "guide_last_change": date.today()},
                                           session=session)
    step = {"guide_id": guide_id,
            "step_num": 1,
            "video_name": request.name,
            "video_file_path": request.video.filepath,
            "preview": request.video.image_url,
            "description": request.video.text}
    status = await miniapp_db_fcn.create_video_step(step_data=step, session=session)
    return {"status": status}


@router.patch("/update_text", response_model=StatusResponse)
async def update_text(
        request: GuideUpdateRequest,
        session: AsyncSession = Depends(get_db_session)
):
    steps = request.steps
    steps_to_add = request.steps_to_add
    steps_to_delete = request.steps_to_delete
    upd_guide = request.model_dump(exclude_unset=True)
    del upd_guide["steps"]
    del upd_guide["steps_to_add"]
    del upd_guide["steps_to_delete"]
    upd_guide["guide_last_change"] = date.today()
    status = await miniapp_db_fcn.update_guide(update_data=upd_guide, session=session)


    for id in steps_to_delete:
        await delete_step(step_id=id, session=session)

    for step in steps:
        upd_step = step.model_dump(exclude_unset=True)
        step_id = upd_step["step_id"]
        del upd_step["step_id"]
        upd_step["step_num"] = step.step_num
        if step.image_url != None:
            text_step = await miniapp_db_fcn.get_text_step(step_id=step_id, session=session)
            if text_step.image_url != None:
                await s3_client.delete_object(object_key=text_step.image_url)
        status = await miniapp_db_fcn.update_step(step_id=step.step_id, update_data=upd_step, session=session)

    step_data = []
    for step in steps_to_add:
            a = {"guide_id": request.guide_id,
                 "step_num": step.step_num,
                 "name": step.name,
                 "text": step.text,
                 "image_url": step.image_url
                 }
            step_data.append(a)
    if len(step_data)>0:
        status = await miniapp_db_fcn.create_step(step_data=step_data, session=session)

    return {"status": status}


@router.patch("/update_video", response_model=StatusResponse)
async def update_video(
        request: GuideUpdateVideoRequest,
        session: AsyncSession = Depends(get_db_session)
):
    video = request.video
    upd_guide = request.model_dump(exclude_unset=True)
    del upd_guide["video"]
    upd_guide["guide_last_change"] = date.today()
    status = await miniapp_db_fcn.update_guide(update_data=upd_guide, session=session)
    upd_video = {"video_file_path": video.filepath,
                 "description": video.text,
                 "preview": video.image_url}
    exclude_video = {k: v for k, v in upd_video.items() if v is not None}
    video_step = await miniapp_db_fcn.get_video_steps(guide_id=request.guide_id, session=session)
    if video.filepath != None:
        await s3_client.delete_object(object_key=video_step["video_url"])
    if video.image_url != None:
        await s3_client.delete_object(object_key=video_step["preview"])
    status = await miniapp_db_fcn.update_video_step(step_id=video.step_id, update_data=exclude_video, session=session)
    return {"status": status}

@router.delete("/delete_guide", response_model=StatusResponse)
async def delete_guide(
        guide_id: uuid.UUID,
        type: str,
        session: AsyncSession = Depends(get_db_session)
):
    if type=='Video':
        video_step = await miniapp_db_fcn.get_video_steps(guide_id=guide_id, session=session)
        await s3_client.delete_object(object_key=video_step["video_url"])
    else:
        status, steps = await miniapp_db_fcn.get_steps(guide_id=guide_id, session=session)
        for step in steps:
            await delete_step(step_id=step["step_id"], session=session)
    status = await miniapp_db_fcn.delete_guide(guide_id=guide_id, session=session)
    return {"status": status}

@router.delete("/delete_text_step", response_model=StatusResponse)
async def delete_step(
        step_id: uuid.UUID,
        session: AsyncSession = Depends(get_db_session)
):
    text_step = await miniapp_db_fcn.get_text_step(step_id=step_id, session=session)
    if text_step.image_url != None:
        await s3_client.delete_object(object_key=text_step.image_url)
    status = await miniapp_db_fcn.delete_step(step_id=step_id, session=session)
    return {"status": status}





