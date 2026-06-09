import os
import uuid
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any

from aiobotocore.session import get_session
from botocore.config import Config
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.database.responses import StatusResponse

router = APIRouter(
    prefix="/media",
    tags=["Media"]
)

#Requests
class PresignedUrlRequest(BaseModel):
    filename: str
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
