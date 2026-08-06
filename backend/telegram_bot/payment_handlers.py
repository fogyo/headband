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

class ActivationState(StatesGroup):
    choosing_level = State()

@dp.callback_query(F.data == "subscriptions_menu")
async def handle_subscriptions(callback: types.CallbackQuery, state: FSMContext):
    user_data = await state.get_data()
    role = user_data.get("role")
    
    # Если роль не мастер – показываем сообщение и возвращаемся в платежи
    if role != "master":
        await callback.message.edit_text(
            "📋 Этот раздел доступен только для мастеров.",
            reply_markup=get_payments_keyboard()
        )
        await callback.answer()
        return

    chat_id = callback.from_user.id
    async with AsyncSessionLocal() as session:
        async with session.begin():
            # 1. Получаем мастера
            master = await miniapp_db_fcn.get_master_by_chat(chat_id, session)
            if not master:
                await callback.message.edit_text(
                    "❌ Вы не зарегистрированы как мастер. Сначала выберите роль 'Мастер'.",
                    reply_markup=get_payments_keyboard()
                )
                await callback.answer()
                return
            active, end_date, status = await miniapp_db_fcn.get_subscription_level(master.id, session)

            sub_bank = await miniapp_db_fcn.get_unused_subs(master_id=master.id, session=session)

            if active:
                level_text = "базовая" if status ==  1 else "партнёрская" if status == 2 else status
                end_date_str = end_date.strftime('%d.%m.%Y') if end_date else "неизвестно"
                text = f"📋 Ваша текущая подписка: **{level_text}**\nАктивна до: {end_date_str}\n\n"
            else:
                text = "📋 У вас нет активной подписки.\n\n"

            text += f"Количество базовых подписок: {sub_bank["base_sub"]}\nКоличество партнерских подписок: {sub_bank["partner_sub"]}\n\n"
            
            unused = sub_bank["base_sub"]+sub_bank["partner_sub"] 
            # 5. Получаем клавиатуру
            keyboard = get_subscriptions_keyboard(active=active, has_unused=(unused>0))

            await callback.message.edit_text(
                text + "Выберите действие:",
                reply_markup=keyboard
            )
            await session.commit()
    
    await callback.answer()


@dp.callback_query(F.data == "change_level")
async def change_subscription_level(callback: types.CallbackQuery, state: FSMContext):
    user_data = await state.get_data()
    role = user_data.get("role")
    
    # Если роль не мастер – показываем сообщение и возвращаемся в платежи
    if role != "master":
        await callback.message.edit_text(
            "📋 Этот раздел доступен только для мастеров.",
            reply_markup=get_payments_keyboard()
        )
        await callback.answer()
        return

    chat_id = callback.from_user.id
    async with AsyncSessionLocal() as session:
        async with session.begin():
            # 1. Получаем мастера
            master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
            status = await miniapp_db_fcn.change_sub_level(master_id=master.id, session=session)
        await session.commit()
    await callback.message.edit_text(
        "🔄 Вы поставили флажок на смену уровня подписки. Уровень автоматически сменится по окончании действующей подписки",
        reply_markup=get_payments_keyboard()
    )
    await callback.answer()


@dp.callback_query(F.data == "activate_sub")
async def activate_subscription(callback: types.CallbackQuery, state: FSMContext):
    user_data = await state.get_data()
    role = user_data.get("role")
    if role != "master":
        await callback.answer("Только для мастеров", show_alert=True)
        return

    chat_id = callback.from_user.id
    async with AsyncSessionLocal() as session:
        async with session.begin():
            master = await miniapp_db_fcn.get_master_by_chat(chat_id, session)
            if not master:
                await callback.message.edit_text(
                    "❌ Вы не зарегистрированы как мастер.",
                    reply_markup=get_payments_keyboard()
                )
                await callback.answer()
                return

            sub_bank = await miniapp_db_fcn.get_unused_subs(master_id=master.id, session=session)
            unused = sub_bank["base_sub"]+sub_bank["partner_sub"] 
            if unused==0:
                await callback.message.edit_text(
                    "❌ У вас нет неиспользованных подписок для активации.",
                    reply_markup=get_subscriptions_keyboard(active=False, has_unused=False)  # или get_payments_keyboard()
                )
                await callback.answer()
                return

            # Если только один уровень, можно сразу показать подтверждение, либо предложить выбор (для единообразия)
            # Покажем выбор всегда для простоты (даже если один уровень)
            available_levels = []
            if sub_bank["base_sub"]>0:
                available_levels.append("BASE")
            elif sub_bank["partner_sub"]>0:
                available_levels.append("PARTNER")

            await state.set_state(ActivationState.choosing_level)
            await state.update_data(available_levels=available_levels)

            await callback.message.edit_text(
                "📦 Выберите уровень подписки для активации:",
                reply_markup=get_activation_level_keyboard(available_levels)
            )
            await session.commit()
    await callback.answer()


def get_activation_level_keyboard(available_levels: List[str]) -> InlineKeyboardMarkup:
    """
    Возвращает клавиатуру с кнопками для каждого доступного уровня подписки.
    Если уровень только один, клавиатура всё равно будет содержать одну кнопку,
    либо можно сразу активировать, но здесь сделаем с одной кнопкой.
    """
    buttons = []
    for level in available_levels:
        level_display = "базовая" if level == "base" else "партнёрская" if level == "partner" else level
        buttons.append([InlineKeyboardButton(
            text=f"📦 Активировать {level_display}",
            callback_data=f"activate_confirm_{level}"
        )])
    # Добавляем кнопку "Назад"
    buttons.append([InlineKeyboardButton(text="🔙 Назад", callback_data="subscriptions_menu")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)