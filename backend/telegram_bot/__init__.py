
import asyncio
import logging
import os
import uuid
from typing import List

from aiogram import Bot, Dispatcher, types, F
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.filters import CommandStart, Command
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from dotenv import load_dotenv
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.context import FSMContext


BOT_TOKEN = os.getenv('BOT_TOKEN')
BOT_URL = os.getenv('BOT_URL')
PROXY_URL = os.getenv('PROXY_URL')

storage = MemoryStorage()
session = AiohttpSession(proxy=PROXY_URL)
bot = Bot(token=BOT_TOKEN, session=session)
dp = Dispatcher()


async def start_bot():
    global bot
    session = None
    try:
        if not await test_proxy(bot):
            logging.error("Прокси не работает, останов.")
            await bot.session.close()
            return

        await bot.delete_webhook(drop_pending_updates=True)
        logging.info("Бот успешно запущен.")
        await dp.start_polling(bot)

    except Exception as e:
        logging.error(f"Критическая ошибка при запуске бота: {e}")
        if "Connector is closed" in str(e):
            logging.error("Не удалось установить соединение. Проверьте URL и порт прокси.")
        if session:
            await session.close()

async def test_proxy(bot: Bot) -> bool:
    """Проверяет, работает ли прокси, запрашивая информацию о боте"""
    try:
        me = await bot.get_me()
        logging.info(f"✅ Прокси работает! Бот подключён: @{me.username}")
        return True
    except Exception as e:
        logging.error(f"❌ Ошибка через прокси: {e}")
        return False

async def stop_bot():
    """Корректная остановка бота"""
    await dp.stop_polling()
    if bot and hasattr(bot, 'session') and bot.session:
        await bot.session.close()
    logging.info("Остановка бота завершена.")
