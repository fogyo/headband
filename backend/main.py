import asyncio
import logging
import multiprocessing
import os
import subprocess
import sys
from multiprocessing import Process

import uvicorn
from dotenv import load_dotenv
import database as db
from backend import app
from backend.api import create_categories, create_haircut_template, create_beards_template, create_hair_colors_template, \
    create_hair_perms_template, create_admin
from backend.api.headbeauty import hb_welcome, hb_session
from backend.api.master.profile_endpoints import personal, guides, prices, schedule, notifications, earnings, works
from backend.api.user import welcome_user, price, masters, booking
from backend.api.admin import statistics, guide_moderation

load_dotenv()
from backend.api.master import guides, profile, schedule, welcome, profile_endpoints
from backend.auth import telegram_middleware
from backend.database import obj_storage
from backend.api import admin_endpoints

app.include_router(welcome.router)
app.include_router(profile.router)
app.include_router(profile_endpoints.personal.router)
app.include_router(profile_endpoints.guides.router)
app.include_router(profile_endpoints.prices.router)
app.include_router(profile_endpoints.schedule.router)
app.include_router(profile_endpoints.notifications.router)
app.include_router(profile_endpoints.earnings.router)
app.include_router(profile_endpoints.works.router)
app.include_router(guides.router)
app.include_router(schedule.router)
app.include_router(welcome_user.router)
app.include_router(price.router)
app.include_router(masters.router)
app.include_router(booking.router)
app.include_router(telegram_middleware.router)
app.include_router(obj_storage.router)
app.include_router(admin_endpoints.router)
app.include_router(hb_welcome.router)
app.include_router(hb_session.router)
app.include_router(statistics.router)
app.include_router(guide_moderation.router)

"""@asynccontextmanager
async def lifespan(app: FastAPI):
    global bot_task
    bot_task = asyncio.create_task(start_bot())
    logging.info("Бот запущен")
    yield
    bot_task.cancel()
    try:
        await bot_task
    except asyncio.CancelledError:
        pass
    logging.info("Бот остановлен")
"""

"""async def main():
    try:
        if await db.setup_database():
            logging.info("База данных инициализирована")
        #await start_bot()
        uvicorn.run("main:app",reload=True)
    except Exception as e:
        logging.error(f"Ошибка запуска: {e}")
    finally:
        await db.close_connection()"""

async def init_db():
    await create_admin()
    await create_categories()
    await create_haircut_template()
    await create_beards_template()
    await create_hair_colors_template()
    await create_hair_perms_template()

def run_celery_process():
    current_env = os.environ.copy()

    subprocess.run(
        ["celery", "-A", "backend.model.bg_factory.factory", "worker", "--pool=threads", "--concurrency=4",
         "--loglevel=info"],
        check=True,
        env=current_env  # Передаем окружение в Celery
    )

def run_beat_process():
    subprocess.run(
        ["celery", "-A", "backend.model.bg_factory.factory", "beat",
         "--loglevel=info"],
        env=os.environ.copy()
    )

def run_server_process():
    async def start_server():
        if await db.setup_database():


            """await obj_storage.upload_folder(
                local_folder="C:\\Users\\Fog\\PycharmProjects\\headband\\frontend\\client\\assets\\women_haircuts", s3_prefix="woman\\")
            await obj_storage.upload_folder(
                local_folder="C:\\Users\\Fog\\PycharmProjects\\headband\\frontend\\client\\assets\\men_haircuts", s3_prefix="man\\")
            await obj_storage.upload_folder(
                local_folder="C:\\Users\\Fog\\PycharmProjects\\headband\\frontend\\client\\assets\\beards", s3_prefix="beards\\")
            await obj_storage.upload_folder(
                local_folder="C:\\Users\\Fog\\PycharmProjects\\headband\\frontend\\client\\assets\\perms", s3_prefix="perms\\")"""

            await init_db()
            logging.info("Database init")
        config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="info")
        server = uvicorn.Server(config)
        await server.serve()
    asyncio.run(start_server())

def run_bot_process():
    logging.info("Бот запущен")
    async def start_bot():
        from backend.telegram_bot.bot_main import start_bot
        await start_bot()
    asyncio.run(start_bot())


if __name__ == "__main__":
    multiprocessing.freeze_support()
    bot_process = Process(target=run_bot_process)
    server_process = Process(target=run_server_process)
    celery_process = Process(target=run_celery_process)
    beat_process = Process(target=run_beat_process)

    bot_process.start()
    server_process.start()
    celery_process.start()
    beat_process.start()

    bot_process.join()
    server_process.join()
    celery_process.join()
    beat_process.join()