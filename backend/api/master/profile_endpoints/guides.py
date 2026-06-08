import shutil
import uuid
from datetime import date
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend import UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_IMG_EXT, ALLOWED_VID_EXT
from backend.database import get_db_session, miniapp_db_fcn
from backend.database.responses import StatusResponse



#Requests
class DenyRequest(BaseModel):
    guide_id: uuid.UUID
    comment: str

class GuideTextRequest(BaseModel):
    text: str

class GuideUpdateTextRequest(BaseModel):
    step_id: uuid.UUID
    text: Optional[str] = None

class GuideCreateRequest(BaseModel):
    master_id: uuid.UUID
    name: str
    category: str
    steps: List[GuideTextRequest]

class GuideUpdateRequest(BaseModel):
    guide_id: uuid.UUID
    name: Optional[str] = None
    category: Optional[str] = None
    steps: List[GuideUpdateTextRequest]

class GuideVideoRequest(GuideTextRequest):
    filepath: str

class UpdateVideoRequest(GuideUpdateTextRequest):
    filepath: Optional[str] = None

class GuideCreateVideoRequest(BaseModel):
    master_id: uuid.UUID
    name: str
    category: str
    video: GuideVideoRequest

class GuideUpdateVideoRequest(BaseModel):
    guide_id: uuid.UUID
    name: Optional[str] = None
    category: Optional[str] = None
    video: Optional[UpdateVideoRequest] = None

#Responses
class BaseGuideResponse(BaseModel):
    name: str
    category: str
    guide_type: int

class StatGuideResponse(BaseGuideResponse):
    views: int
    likes: int
    like: bool

class MyGuidesResponse(StatGuideResponse):
    created: date
    changed: date
    approved: date

class VideoContentResponse(StatusResponse):
    filepath: str


class GuidesPageResponse(StatusResponse):
    my_guides: List[MyGuidesResponse]
    liked_guides: List[StatGuideResponse]
    approve_guides: Optional[List[BaseGuideResponse]] = []


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

    master_guides, liked_guides = miniapp_db_fcn.preuploaded_data(master_id=master_id, session=session)

    my_guides_resp = []
    for guide in master_guides:
        likes = sum(1 for stat in guide.guide_stats if stat.action == 1)
        views = sum(1 for stat in guide.guide_stats if stat.action == 0)

        liked_by_me = any(stat.master_id == master_id and stat.action == 1 for stat in guide.guide_stats)

        guide_type = 1 if guide.video_steps_list else 0

        my_guides_resp.append({
            "name": guide.name,
            "category": guide.category,
            "views": views,
            "likes": likes,
            "like": liked_by_me,
            "guide_type": guide_type,
            "created": guide.guide_created,
            "changed": guide.guide_last_change,
            "approved": guide.guide_approved,
        })


    liked_guides_resp = []
    for guide in liked_guides:
        likes = sum(1 for stat in guide.guide_stats if stat.action == 1)
        views = sum(1 for stat in guide.guide_stats if stat.action == 0)
        guide_type = 1 if guide.video_steps_list else 0

        liked_guides_resp.append({
            "name": guide.name,
            "category": guide.category,
            "views": views,
            "likes": likes,
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
                "name": guide.name,
                "category": guide.category,
                "guide_type": guide_type,
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
    #сделать отправку уведомления через бота мастеру
    return {"status": status}

@router.patch("/ambassador/deny", response_model=StatusResponse)
async def deny_guide(
        request: DenyRequest,
        session: AsyncSession = Depends(get_db_session)
):
    status = await miniapp_db_fcn.change_status(session=session, guide_id=request.guide_id, state=0)
    #сделать отправку уведомления через бота мастеру
    return {"status": status}

@router.post("/create_text", response_model=StatusResponse)
async def create_guide_text(
        request: GuideCreateRequest,
        session: AsyncSession = Depends(get_db_session)
):
    guide_id = miniapp_db_fcn.create_guide(request={"name": request.name,
                                                    "category": request.category,
                                                    "author": request.master_id,
                                                    "guide_created": date.today(),
                                                    "guide_last_change": date.today()},
                                           session=session)
    steps = []
    for i, step in enumerate(request.steps):
        a = {"guide_id": guide_id,
             "step_num": i+1,
             "text": step.text}
        steps.append(a)
    status = await miniapp_db_fcn.create_step(step_data=steps, session=session)
    return {"status": status}


@router.post("/create_video", response_model=StatusResponse)
async def create_guide_video(
        request: GuideCreateVideoRequest,
        session: AsyncSession = Depends(get_db_session)
):
    guide_id = miniapp_db_fcn.create_guide(request={"name": request.name,
                                                    "category": request.category,
                                                    "author": request.master_id,
                                                    "guide_created": date.today(),
                                                    "guide_last_change": date.today()},
                                           session=session)
    step = {"guide_id": guide_id,
            "step_num": 1,
            "video_name": request.name,
            "video_file_path": request.video.filepath,
            "description": request.video.text}
    status = await miniapp_db_fcn.create_video_step(step_data=step, session=session)
    return {"status": status}

@router.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    original_name = file.filename
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_VID_EXT:
        raise HTTPException(400, f"Недопустимое расширение файла. Разрешены: {ALLOWED_VID_EXT}")

    safe_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / "guide_videos" / safe_filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(500, f"Ошибка сохранения файла: {e}")

    if file_path.stat().st_size > MAX_FILE_SIZE:
        file_path.unlink()
        raise HTTPException(400, f"Файл превышает максимальный размер {MAX_FILE_SIZE // (1024**2)} МБ")

    return {"filepath": str(file_path.absolute())}

@router.patch("/update_text", response_model=StatusResponse)
async def update_text(
        request: GuideUpdateRequest,
        session: AsyncSession = Depends(get_db_session)
):
    steps = request.steps
    upd_guide = request.model_dump(exclude_unset=True)
    del upd_guide["steps"]
    upd_guide["guide_last_change"] = date.today()
    status = await miniapp_db_fcn.update_guide(update_data=upd_guide, session=session)
    for i, step in enumerate(steps):
        upd_step = step.model_dump(exclude_unset=True)
        del upd_step["step_id"]
        upd_step["step_num"] = i+1
        status = await miniapp_db_fcn.update_step(step_id=step.step_id, update_data=upd_step, session=session)
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
                 "description": video.text}
    exclude_video = {k: v for k, v in upd_video.items() if v is not None}
    status = await miniapp_db_fcn.update_video_step(step_id=video.step_id, update_data=exclude_video, session=session)
    return {"status": status}

@router.delete("/delete_guide", response_model=StatusResponse)
async def delete(
        guide_id: uuid.UUID,
        session: AsyncSession = Depends(get_db_session)
):
    status = await miniapp_db_fcn.delete_guide(guide_id=guide_id, session=session)
    return {"status": status}

@router.delete("/delete_text_step", response_model=StatusResponse)
async def delete(
        step_id: uuid.UUID,
        session: AsyncSession = Depends(get_db_session)
):
    status = await miniapp_db_fcn.delete_step(step_id=step_id, session=session)
    return {"status": status}

@router.post("/steps/{step_id}/upload-image", response_model=StatusResponse)
async def upload_and_link_image(
    step_id: uuid.UUID,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db_session)
):
    original_name = file.filename or "image.jpg"
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_IMG_EXT:
        raise HTTPException(400, f"Недопустимое расширение. Разрешены: {ALLOWED_IMG_EXT}")

    safe_filename = f"{uuid.uuid4().hex}{ext}"
    img_dir = UPLOAD_DIR / "guide_images"
    img_dir.mkdir(exist_ok=True)
    file_path = img_dir / safe_filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(500, f"Ошибка сохранения файла: {e}")

    if file_path.stat().st_size > MAX_FILE_SIZE:
        file_path.unlink()
        raise HTTPException(400, f"Файл превышает максимальный размер {MAX_FILE_SIZE // (1024**2)} МБ")

    filepath_str = str(file_path.absolute())
    try:
        await miniapp_db_fcn.add_image(session=session, step_id=step_id, filepath=filepath_str)
    except Exception as e:
        # Откат: если запись в БД не прошла, удаляем файл
        file_path.unlink(missing_ok=True)
        raise HTTPException(500, f"Ошибка записи в БД: {e}")
    return {"status": "success"}



@router.delete("/steps/images/{image_id}", response_model=StatusResponse)
async def delete_step_image(
    image_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session)
):
    """Удалить изображение из БД и с диска"""
    img_obj = await GuideTextStepImageModel.get_by_id(session=session, image_id=image_id)
    if not img_obj:
        return {"status": "no such image"}

    try:
        Path(img_obj.filepath).unlink(missing_ok=True)
    except Exception:
        pass

    status = await GuideTextStepImageModel.delete(session=session, image_id=image_id)
    return {"status": status}