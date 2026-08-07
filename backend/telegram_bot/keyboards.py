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

MINI_APP_URL_CLIENT = os.getenv("MINI_APP_URL_CLIENT")
MINI_APP_URL_MASTER = os.getenv("MINI_APP_URL_MASTER")

def get_main_keyboard(role: str) -> InlineKeyboardMarkup:
    if role == "client":
        app_url = MINI_APP_URL_CLIENT
    else:
        app_url = MINI_APP_URL_MASTER

    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📱 Открыть мини апп", web_app=WebAppInfo(url=app_url))],
        [InlineKeyboardButton(text="💳 Платежи", callback_data="payments_menu")],
        [InlineKeyboardButton(text="Сменить роль", callback_data="switch_role")]
    ])

def get_payments_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📋 Подписки", callback_data="subs_menu")],
        [InlineKeyboardButton(text="🪙 Токены", callback_data="tokens_menu")],
        [InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_main")]
    ])

def get_rating_keyboard(appointment_id: uuid.UUID) -> InlineKeyboardMarkup:
    buttons = [
        [InlineKeyboardButton(text=str(i), callback_data=f"rating_{i}_{appointment_id}")]
        for i in range(1, 6)
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_role_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Клиент", callback_data="role_client")],
        [InlineKeyboardButton(text="Мастер", callback_data="role_master")]
    ])


def get_subscriptions_keyboard(active: bool, has_unused: bool = False) -> InlineKeyboardMarkup:
    keyboard = []
    keyboard.append([InlineKeyboardButton(text="Купить месяц базовой подписки", callback_data="buy_base")])
    keyboard.append([InlineKeyboardButton(text="Купить месяц партнёрской подписки", callback_data="buy_partner")])
    
    if has_unused:
        keyboard.append([InlineKeyboardButton(text="✅ Активировать подписку", callback_data="activate_sub")])
    elif active: 
        keyboard.append([InlineKeyboardButton(text="🔄 Сменить уровень", callback_data="change_level")])
    
    return InlineKeyboardMarkup(inline_keyboard=keyboard)
