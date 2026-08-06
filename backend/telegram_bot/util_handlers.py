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

@dp.callback_query(F.data == "switch_role")
async def switch_role(callback: types.CallbackQuery, state: FSMContext):
    async with AsyncSessionLocal() as session:
        async with session.begin():
            data = await state.get_data()
            current_role = data.get("role")

            if current_role is None:
                await callback.message.edit_text(
                    "Сначала выберите роль:",
                    reply_markup=get_role_keyboard()
                )
                await callback.answer()
                return

            new_role = "master" if current_role == "client" else "client"
            await state.update_data(role=new_role)
            chat_id = callback.from_user.id
            username = callback.from_user.username
            if new_role=="master":
                role_text = "Мастер"
                if await miniapp_db_fcn.check_master(chat_id=chat_id, session=session):
                    await miniapp_db_fcn.create_master_tg(chat_id=chat_id, username=username, session=session)
            else:
                role_text = "Клиент"
                if await miniapp_db_fcn.check_user(chat_id=chat_id, session=session):
                    await miniapp_db_fcn.create_user(chat_id=chat_id, username=username, session=session)
            await callback.message.edit_text(
                f"Отлично! Вы сменили роль на '{role_text.lower()}' \nДля получения доступа к полному функционалу откройте наш MiniApp по ссылке ниже",
                reply_markup=get_main_keyboard(new_role)
            )
            await callback.answer()
            await session.commit()

@dp.callback_query(F.data.startswith("rating_"))
async def handle_rating(callback: types.CallbackQuery, state: FSMContext):
    # 1. Получаем оценку (число от 1 до 5)
    rating, appointment_id = int(callback.data.split("_")[1]), uuid.UUID(callback.data.split("_")[2])

    async with AsyncSessionLocal() as session:
        async with session.begin():
            appointment = await miniapp_db_fcn.get_appointment(appointment_id=appointment_id, session=session)
            await miniapp_db_fcn.create_rating_record(rating=rating, master_id=appointment.master_id, user_id=appointment.user_id, session=session)
            await session.commit()
    user_data = await state.get_data()
    role = user_data.get("role", "client")

    await callback.message.edit_text(
        f"⭐ Спасибо за вашу оценку!\n"
        f"Для получения доступа к полному функционалу откройте наш MiniApp по ссылке ниже",
        reply_markup=get_main_keyboard(role)
    )

    await callback.answer()
