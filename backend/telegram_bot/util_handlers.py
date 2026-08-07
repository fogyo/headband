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

from backend.database import AsyncSessionLocal, miniapp_db_fcn
from backend.telegram_bot.keyboards import get_main_keyboard, get_payments_keyboard, get_role_keyboard, get_subscriptions_keyboard
from backend.telegram_bot import dp

