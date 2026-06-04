import logging
import os
from aiogram import Bot, Dispatcher, types, F
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.filters import CommandStart
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from dotenv import load_dotenv
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.context import FSMContext

from backend.database import miniapp_db_fcn, AsyncSessionLocal

load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN")
PROXY_URL = os.getenv("PROXY_URL")

MINI_APP_URL_CLIENT = os.getenv("MINI_APP_URL_CLIENT")
MINI_APP_URL_MASTER = os.getenv("MINI_APP_URL_MASTER")

storage = MemoryStorage()
bot = None
dp = Dispatcher()



class UserState(StatesGroup):
    role = State()

def get_main_keyboard(role: str) -> InlineKeyboardMarkup:
    if role == "client":
        app_url = MINI_APP_URL_CLIENT
    else:
        app_url = MINI_APP_URL_MASTER

    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📱 Открыть мини апп", web_app=WebAppInfo(url=app_url))],
        [InlineKeyboardButton(text="Сменить роль", callback_data="switch_role")]
    ])


def get_role_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Клиент", callback_data="role_user")],
        [InlineKeyboardButton(text="Мастер", callback_data="role_master")]
    ])


@dp.message(CommandStart())
async def cmd_start(message: types.Message, state: FSMContext):
    user_data = await state.get_data()
    role = user_data.get("role")

    if role is None:
        await message.answer(
            "👋 Добро пожаловать!\nВыберите кто пользуется приложением:",
            reply_markup=get_role_keyboard()
        )
    else:
        role_text = "Клиент" if role == "user" else "Мастер"
        await message.answer(
            f"✅ Ваша роль: {role_text}",
            reply_markup=get_main_keyboard(role)
        )

@dp.callback_query(F.data == "switch_role")
async def switch_role(callback: types.CallbackQuery, state: FSMContext):
    async with AsyncSessionLocal() as session:
        async with session.begin():
            data = await state.get_data()
            current_role = data.get("role")

            if current_role is None:
                await callback.message.edit_text(
                    "Сначала выберите роль:",
                    reply_markup=get_main_keyboard(current_role)
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


@dp.callback_query(F.data.in_(["role_user", "role_master"]))
async def handle_role_selection(callback: types.CallbackQuery, state: FSMContext):
    async with AsyncSessionLocal() as session:
        async with session.begin():
            new_role = "user" if callback.data == "role_user" else "master"
            await state.update_data(role=new_role)

            chat_id = callback.from_user.id
            username = callback.from_user.username
            if new_role == "master":
                role_text = "Мастер"
                if await miniapp_db_fcn.check_master(chat_id=chat_id, session=session):
                    await miniapp_db_fcn.create_master_tg(chat_id=chat_id, username=username, session=session)
            else:
                role_text = "Клиент"
                if await miniapp_db_fcn.check_user(chat_id=chat_id, session=session):
                    await miniapp_db_fcn.create_user(chat_id=chat_id, username=username, session=session)
            await callback.message.edit_text(
                f"Отлично! Вы выбрали роль '{role_text.lower()}' \nДля получения доступа к полному функционалу откройте наш MiniApp по ссылке ниже",
                reply_markup=get_main_keyboard(new_role)
            )
            await callback.answer()

async def test_proxy(bot: Bot) -> bool:
    """Проверяет, работает ли прокси, запрашивая информацию о боте"""
    try:
        me = await bot.get_me()
        logging.info(f"✅ Прокси работает! Бот подключён: @{me.username}")
        return True
    except Exception as e:
        logging.error(f"❌ Ошибка через прокси: {e}")
        return False


async def start_bot():
    global bot
    session = None
    try:
        if PROXY_URL:
            logging.info(f"Попытка подключения через прокси: {PROXY_URL}")
            session = AiohttpSession(proxy=PROXY_URL)
            bot = Bot(token=BOT_TOKEN, session=session)
        else:
            bot = Bot(token=BOT_TOKEN)
            logging.warning("Прокси не настроен, работаем напрямую")

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

async def stop_bot():
    """Корректная остановка бота"""
    await dp.stop_polling()
    if bot and hasattr(bot, 'session') and bot.session:
        await bot.session.close()
    logging.info("Остановка бота завершена.")