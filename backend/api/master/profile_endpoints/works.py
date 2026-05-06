import shutil
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import FileResponse

from backend import ALLOWED_IMG_EXT, UPLOAD_DIR, MAX_FILE_SIZE
from backend.database import get_db_session, miniapp_db_fcn
from backend.database.responses import StatusResponse

#Responses
class CategoryResponse(StatusResponse):
    categories: List[str]

#API
router = APIRouter(
    prefix="/master/profile/works",
    tags=["Master.Profile"])



@router.post("/upload-image", response_model=StatusResponse)
async def upload_and_link_image(
    master_id: uuid.UUID,
    name: str,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db_session)
):
    original_name = file.filename or "image.jpg"
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_IMG_EXT:
        raise HTTPException(400, f"Недопустимое расширение. Разрешены: {ALLOWED_IMG_EXT}")

    safe_filename = f"{uuid.uuid4().hex}{ext}"
    img_dir = UPLOAD_DIR / "master_works"
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
        await miniapp_db_fcn.create_workfile(filepath=filepath_str, master_id=master_id, name=name, session=session)
    except Exception as e:
        # Откат: если запись в БД не прошла, удаляем файл
        file_path.unlink(missing_ok=True)
        raise HTTPException(500, f"Ошибка записи в БД: {e}")
    return {"status": "success"}

@router.get("/", response_model=CategoryResponse)
async def get_categories(
        master_id: uuid.UUID,
        session: AsyncSession = Depends(get_db_session)
        ):
    files = await miniapp_db_fcn.get_by_master(master_id=master_id, session=session)
    names = [f.name for f in files]
    return {"status": "success",
            "categories": names}

@router.get("/{name}", response_model=List[str])
async def get_images(
    name: uuid.UUID,
    master_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session)
):
    """Получить список путей ко всем изображениям шага"""
    images = await miniapp_db_fcn.get_by_master_and_name(session=session, master_id=master_id, name=name)
    return [img.id for img in images]

@router.get("/images/{image_id}")
async def serve_image(
    image_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session)
):
    # 1. Получаем запись из БД
    img_obj = await miniapp_db_fcn.get_works_by_id(session=session, image_id=image_id)
    if not img_obj:
        raise HTTPException(404, "Изображение не найдено в базе данных")

    file_path = Path(img_obj.filepath)

    # 2. Проверяем существование файла на диске
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(404, "Файл изображения не найден на сервере")

    # 3. Определяем MIME-тип по расширению
    ext = file_path.suffix.lower()
    mime_types = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".webp": "image/webp",
        ".gif": "image/gif"
    }
    media_type = mime_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=file_path.name,
        headers={"Cache-Control": "public, max-age=31536000, immutable"}
    )