import mimetypes
import os
import uuid
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any

import httpx
from aiobotocore.session import get_session
from botocore.config import Config
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl

from backend.database.responses import StatusResponse

router = APIRouter(
    prefix="/media",
    tags=["Media"]
)

#Requests
class PresignedUrlRequest(BaseModel):
    filename: str
    content_type: Optional[str] = None

class UploadFromUrlRequest(BaseModel):
    photo_url: HttpUrl
    filename: Optional[str] = None
    content_type: Optional[str] = None

#Response
class PresignedUrlResponse(StatusResponse):
    upload_url: str
    file_key: str

class S3Client:
    def __init__(self,
                 access_key: str,
                 secret_key: str,
                 endpoint_url: str,
                 bucket_name: str,
                 region_name: str = 'ru-3'):  # добавили регион
        self.config = {
            "aws_access_key_id": access_key,
            "aws_secret_access_key": secret_key,
            "endpoint_url": endpoint_url,
            "region_name": region_name,
        }
        self.bucket_name = bucket_name
        self.session = get_session()

    async def upload_bytes(
            self,
            object_key: str,
            file_data: bytes,
            content_type: Optional[str] = None,
            extra_args: Optional[Dict[str, Any]] = None
    ) -> None:
        """Загружает байтовые данные в S3."""
        extra = extra_args or {}
        if content_type:
            extra["ContentType"] = content_type
        async with self.get_client() as client:
            await client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=file_data,
                **extra
            )

    async def upload_file(
            self,
            object_key: str,
            file_path: str,
            content_type: Optional[str] = None,
            extra_args: Optional[Dict[str, Any]] = None
    ) -> None:
        """Загружает файл из локальной файловой системы в S3."""
        with open(file_path, "rb") as f:
            file_data = f.read()
        extra = extra_args or {}
        if content_type:
            extra["ContentType"] = content_type
        async with self.get_client() as client:
            await client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=file_data,
                **extra
            )


    @asynccontextmanager
    async def get_client(self):
        aws_config = Config(
            region_name=self.config['region_name'],
            s3={'addressing_style': 'virtual'}
        )
        async with self.session.create_client(
            "s3",
            config=aws_config,
            **self.config
        ) as client:
            yield client

    async def get_presigned_url(
        self,
        object_key: str,
        method: str = "put_object",
        expiration: int = 3600,
        extra_params: Optional[Dict[str, Any]] = None
    ) -> str:
        params = {
            'Bucket': self.bucket_name,
            'Key': object_key
        }
        if extra_params:
            params.update(extra_params)
        async with self.get_client() as client:
            url = await client.generate_presigned_url(
                ClientMethod=method,
                Params=params,
                ExpiresIn=expiration
            )
        return url

    async def delete_object(self, object_key: str) -> None:
        """Асинхронно удаляет объект из S3."""
        async with self.get_client() as client:
            await client.delete_object(Bucket=self.bucket_name, Key=object_key)

access_key = os.getenv('S3_ACCESS_KEY')
secret_key = os.getenv('S3_SECRET_KEY')
bucket_name = os.getenv('BUCKET_NAME')
s3_domain = os.getenv('S3_DOMAIN')

s3_client = S3Client(
    access_key=access_key,
    secret_key=secret_key,
    endpoint_url="https://s3.ru-3.storage.selcloud.ru",
    bucket_name=bucket_name
)

@router.post("/upload-url", response_model=PresignedUrlResponse)
async def get_upload_url(request: PresignedUrlRequest):
    ext = request.filename.split('.')[-1] if '.' in request.filename else ''
    object_key = f"{uuid.uuid4()}.{ext}"

    extra_params = {}
    if request.content_type:
        extra_params["ContentType"] = request.content_type

    try:
        url = await s3_client.get_presigned_url(
            object_key=object_key,
            method="put_object",
            expiration=3600,
            extra_params=extra_params
        )
        return {"status": "success",
                "upload_url": url,
                "file_key": object_key}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def upload_folder(local_folder: str, s3_prefix: str = ""):
    for root, dirs, files in os.walk(local_folder):
        for file in files:
            local_path = os.path.join(root, file)
            relative_path = os.path.relpath(local_path, local_folder)
            object_key = os.path.join(s3_prefix, relative_path).replace("\\", "/")
            import mimetypes
            content_type, _ = mimetypes.guess_type(local_path)
            await s3_client.upload_file(object_key, local_path, content_type=content_type)
            print(f"Загружено: {object_key} \n Файл по пути {local_path}")

async def upload_from_url(request: UploadFromUrlRequest):
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(str(request.photo_url))
            resp.raise_for_status()  # выбросит исключение при статусе 4xx/5xx
            file_data = resp.content
            # Пытаемся определить content-type из ответа, если не передан явно
            content_type = request.content_type or resp.headers.get("content-type")
            if not content_type:
                # Если не удалось, пробуем угадать по расширению
                guessed_type, _ = mimetypes.guess_type(request.filename or "")
                content_type = guessed_type or "application/octet-stream"
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail=f"Ошибка скачивания: {e.response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Не удалось скачать файл: {str(e)}")

    # 2. Определяем имя файла в S3
    if request.filename:
        # Пользователь указал имя – используем его
        ext = request.filename.split('.')[-1] if '.' in request.filename else ''
        base_name = request.filename
    else:
        # Берём имя из URL (последний сегмент)
        url_path = request.photo_url.path
        base_name = url_path.split('/')[-1] if url_path else "image"
        ext = base_name.split('.')[-1] if '.' in base_name else 'jpg'

    # Генерируем уникальный ключ (можно и без UUID, если хочешь сохранить оригинальное имя)
    object_key = f"{uuid.uuid4()}.{ext}" if ext else f"{uuid.uuid4()}"

    # 3. Загружаем в S3
    try:
        await s3_client.upload_bytes(
            object_key=object_key,
            file_data=file_data,
            content_type=content_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки в S3: {str(e)}")

    # 4. Возвращаем ключ (или можно вернуть ссылку на файл, если у тебя есть публичный доступ)
    return {
        "status": "success",
        "file_key": object_key
    }