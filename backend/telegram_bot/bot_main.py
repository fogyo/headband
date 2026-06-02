import asyncio
import logging
import os
import aiogram
from aiogram import Bot, types, Dispatcher, F
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from dotenv import load_dotenv


load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN")
PROXY_URL = os.getenv("PROXY_URL")
MINI_APP_URL = os.getenv("MINI_APP_URL", "https://example.com/miniapp")


bot = Bot(token=BOT_TOKEN, proxy=PROXY_URL)
dp = Dispatcher()

def get_main_keyboard() -> InlineKeyboardMarkup:
    builder = types.InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="📱 Открыть мини апп", web_app=WebAppInfo(url=MINI_APP_URL))
    )
    builder.row(
        InlineKeyboardButton(text="👥 Выбор: пользователь / мастер", callback_data="choose_role")
    )
    builder.row(
        InlineKeyboardButton(text="💳 Купить услугу", callback_data="buy_service")
    )
    return builder.as_markup()

def get_role_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Пользователь", callback_data="role_user")],
        [InlineKeyboardButton(text="Мастер", callback_data="role_master")]
    ])

def get_services_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔹 Базовая консультация — 500₽", callback_data="srv_basic")],
        [InlineKeyboardButton(text="🔸 Премиум-поддержка — 1500₽", callback_data="srv_premium")],
        [InlineKeyboardButton(text="🔙 Назад в меню", callback_data="back_menu")]
    ])


@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    await message.answer(
        "👋 Добро пожаловать!\nВыберите действие:",
        reply_markup=get_main_keyboard()
    )

@dp.callback_query(F.data == "choose_role")
async def handle_choose_role(callback: types.CallbackQuery):
    await callback.message.edit_text(
        "🎭 Выберите вашу роль:",
        reply_markup=get_role_keyboard()
    )
    await callback.answer()

@dp.callback_query(F.data.in_(("role_user", "role_master")))
async def handle_role_selection(callback: types.CallbackQuery):
    role = "Пользователь" if callback.data == "role_user" else "Мастер"
    # Здесь можно сохранить роль в БД или FSM
    await callback.message.edit_text(f"✅ Роль установлена: <b>{role}</b>")
    await callback.answer()

@dp.callback_query(F.data == "buy_service")
async def handle_buy_service(callback: types.CallbackQuery):
    await callback.message.edit_text(
        "🛒 Доступные услуги:",
        reply_markup=get_services_keyboard()
    )
    await callback.answer()

@dp.callback_query(F.data.startswith("srv_"))
async def handle_service_purchase(callback: types.CallbackQuery):
    service_name = "Базовая консультация" if callback.data == "srv_basic" else "Премиум-поддержка"
    await callback.message.answer(f"📦 Вы выбрали: <b>{service_name}</b>\n💡 Для оплаты подключите Telegram Payments или Stripe.")
    await callback.answer()

@dp.callback_query(F.data == "back_menu")
async def handle_back(callback: types.CallbackQuery):
    await callback.message.edit_text(
        "👋 Главное меню:",
        reply_markup=get_main_keyboard()
    )
    await callback.answer()


async def start_bot():
    try:
        await bot.delete_webhook(drop_pending_updates=True)
        logging.info("Telegram bot started")
        await dp.start_polling(bot)
    except Exception as e:
        logging.error(f"Ошибка в боте: {e}")

async def stop_bot():
    """Корректная остановка бота"""
    await dp.stop_polling()
    await bot.session.close()
    logging.info("Telegram bot stopped")