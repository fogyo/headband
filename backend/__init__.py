import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)

from backend import database as db
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # или ["*"] для разработки
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


UPLOAD_DIR = Path("/var/uploads/guides")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
TEMPS_DIR = Path("/var/uploads/temps")
TEMPS_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 10240 * 1024 * 1024
ALLOWED_VID_EXT = {".mp4", ".mov", ".avi", ".webm", ".mkv"}
ALLOWED_IMG_EXT = {".jpg", ".jpeg", ".png"}



