import asyncio
import logging
from collections import deque
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

LOG_BUFFER = deque(maxlen=5000)

class AllLogHandler(logging.Handler):
    def emit(self, record):
        log_entry = self.format(record)
        # Сохраняем кортеж (уровень, сообщение) для фильтрации
        LOG_BUFFER.append((record.levelno, log_entry))

all_handler = AllLogHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
all_handler.setFormatter(formatter)
logging.getLogger().addHandler(all_handler)
logging.getLogger().setLevel(logging.INFO)

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



