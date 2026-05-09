import asyncio
import logging
import multiprocessing
import subprocess
import sys
from multiprocessing import Process

import uvicorn
from dotenv import load_dotenv
import database as db
from backend import app
from backend.api.master.profile_endpoints import personal, guides, prices, schedule, notifications, earnings, works

load_dotenv()
from backend.api.master import guides, profile, schedule, welcome, profile_endpoints

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

def run_server_process():
    async def start_server():
        if await db.setup_database():
            logging.info("База данных инициализирована")
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

    bot_process.start()
    server_process.start()

    bot_process.join()
    server_process.join()
