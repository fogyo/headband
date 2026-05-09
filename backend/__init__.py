import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI

logging.basicConfig(level=logging.INFO)

import database as db
from backend.telegram_bot.bot_main import stop_bot, start_bot



app = FastAPI(
    title="Headband API",
    description="API для сервиса записи в салоны красоты",
    version="1.0.0",
    openapi_tags=[
        {
            "name": "Master.Profile",
            "description": "Операции модуля мастера на странице профиля"
        },
        {
            "name": "Master.Schedule",
            "description": "Операции модуля мастера на странице расписания"
        },
        {
            "name": "Master.Welcome",
            "description": "Операции модуля мастера на первой странице"
        },
        {
            "name": "Master.Guide",
            "description": "Операции модуля мастера на странице гайдов"
        }
    ]
)





UPLOAD_DIR = Path("/var/uploads/guides")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
TEMPS_DIR = Path("/var/uploads/temps")
TEMPS_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB
ALLOWED_VID_EXT = {".mp4", ".mov", ".avi", ".webm", ".mkv"}
ALLOWED_IMG_EXT = {".jpg", ".jpeg", ".png"}



