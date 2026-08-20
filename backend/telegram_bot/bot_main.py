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
from sqlalchemy.ext.asyncio import AsyncSession


BOT_TOKEN = os.getenv('BOT_TOKEN')
BOT_URL = os.getenv('BOT_URL')
PROXY_URL = os.getenv('PROXY_URL')

storage = MemoryStorage()
session = AiohttpSession(proxy=PROXY_URL)
bot = Bot(token=BOT_TOKEN, session=session)
dp = Dispatcher()

#------------BOT MAIN FUNC------------
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

from backend.database import miniapp_db_fcn, AsyncSessionLocal


MINI_APP_URL_CLIENT = os.getenv("MINI_APP_URL_CLIENT")
MINI_APP_URL_MASTER = os.getenv("MINI_APP_URL_MASTER")

async def make_user_answer(master_link: str):
    answer_txt = f"✅ Ваш статус: Клиент.\n\n"
    answer_txt+=f"📱 В нашем mini-app Вы можете записаться к мастерам разных профилей, а также оценить и попробовать на себе наш ИИ инструмент headbeauty.\n\n"
    answer_txt+=f"✏️ Записаться можно либо к мастерам, которые добавили Вас по своей личной headband ссылке, либо к мастерам, которые купили партнерскую подписку.\n\n"
    answer_txt+=f"⭐ Headbeauty AI позволит Вам посмотреть, как на Вас будет выглядеть определенная прическа, укладка или цвет волос. Предпросмотр осуществляется за токены. "
    answer_txt+=f"Приобрести, а также посмотреть количество токенов на Вашем аккаунте Вы можете в боте Платежи->Токены.\n\n"
    answer_txt+=f"🫶 Приглашайте мастеров по своей реферальной ссылке и получайте за это бонусные баллы, которые можно потратить на токены и подписки!\nВаша реферальная ссылка: {master_link}"
    return answer_txt

async def make_master_answer(master_link: str):
    answer_txt = f"✅ Ваш статус: Мастер.\n\n"
    answer_txt+=f"📱 В нашем mini-app Вы можете ознакомиться с предстоящими записями, просматривать и создавать обучающие материалы, а также предложить клиентам попробовать на себе различные образы при помощи ИИ инструмента headbeauty.\n\n"
    answer_txt+=f"✏️ Записаться к Вам смогут пользователи, которых Вы пригласили по ссылке, которая находится в Mini-App->Профиль->Персональная информация (для записи пользователей необходима базовая подписка). Если же у Вас есть партнерская подписка, Вы будете отображаться у всех пользователей по ближайшему метро к Вашему адресу.\n\n"
    answer_txt+=f"👤 Headband позволяет Вам гибко настроить свое виртуальное рабочее пространство, поэтому обязательно ознакомьтесь со всеми вкладками в разделе Аккаунт в профиле.\n\n"
    answer_txt+=f"🎓 Наша обучающая платформа предоставляет доступ к проверенным модерацией и высококвалифицированными профессионалами гайдам. Если у Вас есть желание поделиться своим опытом с другими мастерами, Вы можете создать собственный гайд в Mini-App->Профиль->Гайды->Добавить гайд.\n\n"
    answer_txt+=f"📋 Ознакомиться с количеством подписок, приобрести и активировать подписку Вы можете в Платежи->Подписки.\n\n"
    answer_txt+=f"🫶 Приглашайте мастеров по своей реферальной ссылке и получайте за это бонусные баллы, которые можно потратить на токены и подписки!\nВаша реферальная ссылка: {master_link}"
    return answer_txt

#------------BOT KEYBOARDS------------

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

def get_subscriptions_keyboard(active: bool, stopping: bool, has_unused: bool = False) -> InlineKeyboardMarkup:
    keyboard = []
    keyboard.append([InlineKeyboardButton(text="Купить месяц базовой подписки", callback_data="buy_base")])
    keyboard.append([InlineKeyboardButton(text="Купить месяц партнёрской подписки", callback_data="buy_partner")])
    
    if has_unused and active == False:
        keyboard.append([InlineKeyboardButton(text="✅ Активировать подписку", callback_data="activate_sub")])
    elif active and not stopping: 
        keyboard.append([InlineKeyboardButton(text="🔄 Сменить уровень", callback_data="change_level")])
        keyboard.append([InlineKeyboardButton(text="🚫 Остановить автоматическое продление", callback_data="stop_subscription")])
    elif active and stopping:
        keyboard.append([InlineKeyboardButton(text="🔄 Сменить уровень", callback_data="change_level")])
        keyboard.append([InlineKeyboardButton(text="✅ Возобновить автоматическое продление", callback_data="stop_subscription")])
    keyboard.append([InlineKeyboardButton(text="🔙 Назад", callback_data="payments_menu")])

    return InlineKeyboardMarkup(inline_keyboard=keyboard)

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

def get_tokens_main_keyboard() -> InlineKeyboardMarkup:
    """Главное меню раздела Токены"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🪙 Купить токены", callback_data="buy_tokens")],
        [InlineKeyboardButton(text="⭐ Купить супер токены", callback_data="buy_super_tokens")],
        [InlineKeyboardButton(text="🔙 Назад", callback_data="payments_menu")]
    ])

def get_token_packages_keyboard(token_type: str) -> InlineKeyboardMarkup:
    """
    Возвращает клавиатуру с пакетами токенов.
    token_type: 'regular' или 'super'
    """
    if token_type == "regular":
        packages = [
            ("1 токен", "1", "10"),
            ("5 токенов", "5", "45"),
            ("10 токенов", "10", "85"),
            ("25 токенов", "25", "200"),
            ("50 токенов", "50", "375"),
            ("100 токенов", "100", "650"),
        ]
        prefix = "regular"
        bonus = "25 токенов"
    else:  # super
        packages = [
            ("1 супер токен", "1", "25"),
            ("5 супер токенов", "5", "100"),
            ("10 супер токенов", "10", "175"),
            ("50 супер токенов", "50", "800"),
        ]
        prefix = "super"
        bonus = "10 супер токенов"

    keyboard = []
    for label, amount, price in packages:
        callback_data = f"buy_{prefix}_{amount}"  # например, buy_regular_100
        keyboard.append([InlineKeyboardButton(
            text=f"{label} – {price} руб.",
            callback_data=callback_data
        )])
    bonus_callback = f"buy_bonus_{prefix}"
    keyboard.append([InlineKeyboardButton(text=f"{bonus} - 1 бонусный балл",callback_data=bonus_callback)])
    # Кнопка назад (в главное меню токенов)
    keyboard.append([InlineKeyboardButton(text="🔙 Назад", callback_data="tokens_menu")])
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

class UserState(StatesGroup):
    role = State()

def get_purchase_methods_keyboard(subscription_type: str) -> InlineKeyboardMarkup:
    """
    Возвращает клавиатуру с выбором способа оплаты для подписки.
    subscription_type: 'base' или 'partner'
    """
    if subscription_type == "base":
        money_callback = "buy_base_money"
        points_callback = "buy_base_points"
        price_rub = "500 руб"
        price_points = "3 балла"
        sub_name = "базовой"
    else:
        money_callback = "buy_partner_money"
        price_rub = "1500 руб"
        price_points = "9 баллов"
        points_callback = "buy_partner_points"
        sub_name = "партнёрской"

    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f"💳 Купить за деньги: {price_rub}", callback_data=money_callback)],
        [InlineKeyboardButton(text=f"🎯 Купить за баллы: {price_points}", callback_data=points_callback)],
        [InlineKeyboardButton(text="🔙 Назад", callback_data="subscriptions_menu")]
    ])

#------------BOT START------------

@dp.message(CommandStart(deep_link=False))
async def cmd_start_simple(message: types.Message, state: FSMContext):
    # логика для /start без аргументов
    user_data = await state.get_data()
    role = user_data.get("role")
    if role is None:
        await message.answer(
            "👋 Добро пожаловать!\n\nВыберите кто пользуется приложением:",
            reply_markup=get_role_keyboard()
        )
    else:
        role_text = "Клиент" if role == "client" else "Мастер"
        async with AsyncSessionLocal() as session:
            async with session.begin():
                chat_id = message.from_user.id
                username = message.from_user.username
                if not await miniapp_db_fcn.check_master(chat_id=chat_id, session=session):
                    status, master_id = await miniapp_db_fcn.create_master_tg(chat_id=chat_id, username=username, session=session)
                else:    
                    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
                    master_id = master.id
                master_link, user_link = await miniapp_db_fcn.get_master_referral_links(master_id=master_id, session=session)
                
        if role == "client":
            answer_txt = await make_user_answer(master_link=master_link)
        else:
            answer_txt = await make_master_answer(master_link=master_link)         
        await message.answer(
            answer_txt,
            reply_markup=get_main_keyboard(role)
        )

@dp.message(CommandStart(deep_link=True, magic=F.args))
async def cmd_start(message: types.Message, command: CommandStart, state: FSMContext):
    user_data = await state.get_data()
    role = user_data.get("role")
    ref_code = command.args
    role_text = "Клиент" if role == "client" else "Мастер"
    if ref_code != "":
        async with AsyncSessionLocal() as session:
            async with session.begin():
                chat_id = message.from_user.id
                username = message.from_user.username
                dev_link = await miniapp_db_fcn.get_by_id_dev_link(link=uuid.UUID(ref_code), session=session)
                if dev_link!=None:
                    if dev_link.status == 1:
                        if not await miniapp_db_fcn.check_master(chat_id=chat_id, session=session):
                            status, master_id = await miniapp_db_fcn.create_master_tg(chat_id=chat_id, username=username, session=session)
                        else:    
                            master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
                            master_id = master.id
                        master_link, user_link = await miniapp_db_fcn.get_master_referral_links(master_id=master_id, session=session)
                        answer_txt=f"🔴 К сожалению, ссылка была активирована ранее.\n\n"
                        if role == "client":
                            answer_txt += await make_user_answer(master_link=master_link)
                        else:
                            answer_txt += await make_master_answer(master_link=master_link)       
                        await message.answer(
                        answer_txt,
                        reply_markup=get_main_keyboard(role)
                    )
                    elif not await miniapp_db_fcn.check_master(chat_id=chat_id, session=session):
                        status, master_id = await miniapp_db_fcn.create_master_tg(chat_id=chat_id, username=username, session=session, referrer_master_id=master_id)
                        status = await miniapp_db_fcn.add_to_sub_bank(level=dev_link.level, master_id=master_id, session=session)
                        dev_link.status = 1
                        master_link, user_link = await miniapp_db_fcn.get_master_referral_links(master_id=master_id, session=session)
                        await session.flush()
                         
                        await state.update_data(role="master")
                        answer_txt=f"🟢 Отлично! Вы зашли по реферальной ссылке от разработчика. Ваша учетная запись была создана. Вам доступен месяц пробного периода. С количеством Ваших актуальных подписок Вы можете ознакомиться в Платежи->Подписки. Там же происходит и активация подписок, которая позволит клиентам записываться к Вам.\n\n"
                        answer_txt+=await make_master_answer(master_link=master_link)

                        await message.answer(
                        answer_txt,
                        reply_markup=get_main_keyboard(role)
                    )
                    elif await miniapp_db_fcn.check_master(chat_id=chat_id, session=session): 
                        new_master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
                        status = await miniapp_db_fcn.add_to_sub_bank(level=dev_link.level, master_id=new_master.id, session=session)
                        dev_link.status = 1
                        master_link, user_link = await miniapp_db_fcn.get_master_referral_links(master_id=new_master.id, session=session)
                        
                        await session.flush()
                        await state.update_data(role="master")
                        answer_txt=f"🟢 Отлично! Вы зашли по реферальной ссылке от разработчика. Вам доступен месяц пробного периода. С количеством Ваших актуальных подписок Вы можете ознакомиться в Платежи->Подписки. Там же происходит и активация подписок, которая позволит клиентам записываться к Вам.\n\n"
                        answer_txt+=await make_master_answer(master_link=master_link)

                        await message.answer(
                        answer_txt,
                        reply_markup=get_main_keyboard(role)
                    )
                else:
                    invited_role, master_id = await miniapp_db_fcn.get_referral_owner(link_id=uuid.UUID(ref_code), session=session)
                    if invited_role=="client":
                        if not await miniapp_db_fcn.check_user(chat_id=chat_id, session=session):
                            await miniapp_db_fcn.create_user(chat_id=chat_id, username=username, session=session)
                        if not await miniapp_db_fcn.check_master(chat_id=chat_id, session=session): 
                            status, temp_master_id = await miniapp_db_fcn.create_master_tg(chat_id=chat_id, username=username, session=session)
                        if await miniapp_db_fcn.check_master(chat_id=chat_id, session=session): 
                            temp_master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
                            temp_master_id = temp_master.id
                        master_link, user_link = await miniapp_db_fcn.get_master_referral_links(master_id=temp_master_id, session=session)
                        
                        user_id = await miniapp_db_fcn.get_user_id(chat_id=chat_id, session=session)
                        status = await miniapp_db_fcn.make_relationship_user_to_master(master_id=master_id, user_id=user_id, session=session)
                        await state.update_data(role="client")
                        logging.info("User added by deeplink")
                        answer_txt=f"🟢 Отлично! Вы добавлены в список постоянных клиентов мастера. Для Вас это означает, что Вы будете при записи видеть этого мастера в первую очередь.\n\n"
                        answer_txt+=await make_user_answer(master_link=master_link)

                        await message.answer(
                            answer_txt,
                            reply_markup=get_main_keyboard(role)
                        )
                    elif invited_role=="master":
                        if not await miniapp_db_fcn.check_master(chat_id=chat_id, session=session):
                            status, master_id = await miniapp_db_fcn.create_master_tg(chat_id=chat_id, username=username, session=session, referrer_master_id=master_id)
                            master_link, user_link = await miniapp_db_fcn.get_master_referral_links(master_id=master_id, session=session)
                        
                            await state.update_data(role="master")
                            logging.info("Master created by deeplink")
                            answer_txt=f"🟢 Отлично! Вы зашли по реферальной ссылке мастера. Ваша учетная запись была создана.\n\n"
                            answer_txt+=await make_master_answer(master_link=master_link)

                            await message.answer(
                                answer_txt,
                            reply_markup=get_main_keyboard(role)
                        )
                        else:
                            new_master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
                            active, end_date, status = await miniapp_db_fcn.get_subscription_level(master_id=new_master.id, session=session)
                            master_link, user_link = await miniapp_db_fcn.get_master_referral_links(master_id=new_master.id, session=session)
                        
                            if new_master.id == master_id:
                                await state.update_data(role="master")
                                logging.info("Master info added by deeplink")
                                answer_txt=f"🔴 К сожалению, по условиям нашей акции, можно использовать только чужие реферальные ссылки.\n\n"
                                answer_txt+=await make_master_answer(master_link=master_link)
                                await message.answer(
                                    answer_txt,
                                reply_markup=get_main_keyboard(role)
                            )
                            elif (status == "no sub") and (new_master.referrer_id == None):
                                upd_data = {"referrer_id": master_id}
                                await miniapp_db_fcn.update_master(master_id=new_master.id, update_data=upd_data, session=session)
                                await state.update_data(role="master")
                                logging.info("Master info added by deeplink")
                                answer_txt=f"🟢 Отлично! Вы зашли по реферальной ссылке мастера.\n\n"
                                answer_txt+=await make_master_answer(master_link=master_link)
                                
                                await message.answer(
                                    answer_txt,
                                reply_markup=get_main_keyboard(role)
                            )
                            elif (active):
                                await state.update_data(role="master")
                                logging.info("Master has subscription")
                                answer_txt=f"🔴 К сожалению, по условиям нашей акции, эта реферальная ссылка подходит только для новых аккаунтов, на которых еще не было подписок и не активировались другие приглашения.\n\n"
                                answer_txt+=await make_master_answer(master_link=master_link)
                                await message.answer(
                                    answer_txt,
                                reply_markup=get_main_keyboard(role)
                            )
                            else:
                                await state.update_data(role="master")
                                logging.info("Master has activated")
                                answer_txt=f"🔴 К сожалению, по условиям нашей акции, эта реферальная ссылка подходит только для новых аккаунтов, на которых еще не было подписок и не активировались другие приглашения.\n\n"
                                answer_txt+=await make_master_answer(master_link=master_link)
                                await message.answer(
                                    answer_txt,
                                reply_markup=get_main_keyboard(role)
                            )
                await session.commit()

#------------BOT UTIL COMMANDS------------

@dp.callback_query(F.data.in_(["role_client", "role_master"]))
async def handle_role_selection(callback: types.CallbackQuery, state: FSMContext):
    async with AsyncSessionLocal() as session:
        async with session.begin():
            new_role = "client" if callback.data == "role_client" else "master"
            await state.update_data(role=new_role)

            chat_id = callback.from_user.id
            username = callback.from_user.username
            if not await miniapp_db_fcn.check_master(chat_id=chat_id, session=session):
                status, master_id = await miniapp_db_fcn.create_master_tg(chat_id=chat_id, username=username, session=session)
            else:
                master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
                master_id = master.id
            master_link, user_link = await miniapp_db_fcn.get_master_referral_links(master_id=master_id, session=session)
                        
            if new_role == "master":
                answer_txt =await make_master_answer(master_link=master_link)
                
            else:
                answer_txt =await make_user_answer(master_link=master_link)
                if not await miniapp_db_fcn.check_user(chat_id=chat_id, session=session):
                    await miniapp_db_fcn.create_user(chat_id=chat_id, username=username, session=session)
            
            await callback.message.edit_text(
                answer_txt,
                reply_markup=get_main_keyboard(new_role)
            )
            await session.commit()
            await callback.answer()

@dp.callback_query(F.data == "back_to_main")
async def back_to_main(callback: types.CallbackQuery, state: FSMContext):
    user_data = await state.get_data()
    role = user_data.get("role", "client")
    role_text = "Клиент" if role == "client" else "Мастер"
    async with AsyncSessionLocal() as session:
        async with session.begin():
            chat_id = callback.from_user.id
            username = callback.from_user.username
            if not await miniapp_db_fcn.check_master(chat_id=chat_id, session=session):
                status, master_id = await miniapp_db_fcn.create_master_tg(chat_id=chat_id, username=username, session=session)
            else:
                master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
                master_id = master.id
            master_link, user_link = await miniapp_db_fcn.get_master_referral_links(master_id=master_id, session=session)
            
    if role == "client":
        answer_txt = await make_user_answer(master_link=master_link)
    else:
        answer_txt = await make_master_answer(master_link=master_link)
    await callback.message.edit_text(
        answer_txt,
        reply_markup=get_main_keyboard(role)
    )
    await callback.answer()


@dp.callback_query(F.data == "payments_menu")
async def handle_payments_menu(callback: types.CallbackQuery, state: FSMContext):
    await callback.message.edit_text(
        "💳 Выберите нужный раздел:",
        reply_markup=get_payments_keyboard()
    )
    await callback.answer()

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
            if not await miniapp_db_fcn.check_master(chat_id=chat_id, session=session):
                status, master_id = await miniapp_db_fcn.create_master_tg(chat_id=chat_id, username=username, session=session)
            else:
                master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
                master_id = master.id
            master_link, user_link = await miniapp_db_fcn.get_master_referral_links(master_id=master_id, session=session)
            
            if new_role=="master":
                role_text = "Мастер"
                answer_txt = await make_master_answer(master_link=master_link)
            else:
                role_text = "Клиент"
                answer_txt = await make_user_answer(master_link=master_link)
                if not await miniapp_db_fcn.check_user(chat_id=chat_id, session=session):
                    await miniapp_db_fcn.create_user(chat_id=chat_id, username=username, session=session)
            await callback.message.edit_text(
                answer_txt,
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
            chat_id = callback.from_user.id
            username = callback.from_user.username
            if not await miniapp_db_fcn.check_master(chat_id=chat_id, session=session):
                status, master_id = await miniapp_db_fcn.create_master_tg(chat_id=chat_id, username=username, session=session)
            else:
                master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
                master_id = master.id
            master_link, user_link = await miniapp_db_fcn.get_master_referral_links(master_id=master_id, session=session)
            
            await session.commit()
    user_data = await state.get_data()
    role = user_data.get("role", "client")
    role_text = "Клиент" if role == "client" else "Мастер"
    answer_txt = "🔝 Спасибо за вашу оценку!\n\n"
    answer_txt+=await make_user_answer(master_link=master_link)
    await callback.message.edit_text(
        answer_txt,
        reply_markup=get_main_keyboard(role)
    )

    await callback.answer()


class ActivationState(StatesGroup):
    choosing_level = State()


#------------SUBSCRIPTION COMMANDS------------

@dp.callback_query(F.data == "subs_menu")
async def handle_subscriptions(callback: types.CallbackQuery, state: FSMContext):
    user_data = await state.get_data()
    role = user_data.get("role")
    logging.info("subs_click")
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
            if not master:
                await callback.message.edit_text(
                    "🔴 Вы не зарегистрированы как мастер. Сначала выберите роль 'Мастер'.",
                    reply_markup=get_payments_keyboard()
                )
                await callback.answer()
                return
            active, end_date, status = await miniapp_db_fcn.get_subscription_level(master_id=master.id, session=session)

            sub_bank = await miniapp_db_fcn.get_unused_subs(master_id=master.id, session=session)

            ref_stats = await miniapp_db_fcn.get_referral_stats(master_id=master.id, session=session)

            if active:
                level_text = "базовая" if status ==  1 else "партнёрская" if status == 2 else status
                end_date_str = end_date.strftime('%d.%m.%Y') if end_date else "неизвестно"
                text = f"📋 Ваша текущая подписка: **{level_text}**\nАктивна до: {end_date_str}\n\n"
            else:
                text = "📋 У вас нет активной подписки.\n\n"

            text += f"Количество базовых подписок: {sub_bank["base_sub"]}\nКоличество партнерских подписок: {sub_bank["partner_sub"]}\n\n"
            if sub_bank["change_level"]:
                text+="Вы указали, что будете менять уровень подписки\n\n"
            if sub_bank["stop_sub"]:
                text+="Вы указали, что подписка автоматически продляться не будет\n\n"
            unused = sub_bank["base_sub"]+sub_bank["partner_sub"] 
            if ref_stats !=None:
                text+=f"Реферальных баллов на Вашем счету: {ref_stats["invited_masters"]}\n\n"
            # 5. Получаем клавиатуру
            keyboard = get_subscriptions_keyboard(active=active, has_unused=(unused>0), stopping=sub_bank["stop_sub"])

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
                    reply_markup=get_subscriptions_keyboard(active=False, has_unused=False, stopping=sub_bank["stop_sub"])  # или get_payments_keyboard()
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

@dp.callback_query(F.data.startswith("activate_confirm_"))
async def activate_confirm(callback: types.CallbackQuery, state: FSMContext):
    """Обработка выбора уровня подписки для активации"""
    level_str = callback.data.split("_")[2]  # "base" или "partner"
    level_code = 1 if level_str == "base" else 2

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

            # Проверка наличия неиспользованной подписки выбранного уровня
            sub_bank = await miniapp_db_fcn.get_unused_subs(master_id=master.id, session=session)
            if level_str == "base":
                if sub_bank["base_sub"] <= 0:
                    await callback.answer("Нет доступных базовых подписок для активации", show_alert=True)
                    return
            else:  # partner
                if sub_bank["partner_sub"] <= 0:
                    await callback.answer("Нет доступных партнёрских подписок для активации", show_alert=True)
                    return

            # Вызов метода активации (ты реализуешь его в miniapp_db_fcn)
            success = await miniapp_db_fcn.create_subscription(master_id=master.id, duration_days=3, level=level_code, session=session)
            await miniapp_db_fcn.decrease_sub(master_id=master.id, level=level_code, session=session)
            if not success:
                await callback.message.edit_text(
                    "❌ Не удалось активировать подписку. Попробуйте позже.",
                    reply_markup=get_payments_keyboard()
                )
                await callback.answer()
                return

            await session.commit()

    await callback.message.edit_text(
        f"✅ Подписка уровня '{level_str}' успешно активирована!",
        reply_markup=get_payments_keyboard()
    )
    await callback.answer()

@dp.callback_query(F.data == "stop_subscription")
async def stop_subscription(callback: types.CallbackQuery, state: FSMContext):
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

            # Проверяем, активна ли подписка
            active, _, _ = await miniapp_db_fcn.get_subscription_level(master.id, session)
            if not active:
                await callback.message.edit_text(
                    "❌ У вас нет активной подписки для остановки.",
                    reply_markup=get_subscriptions_keyboard(active=False, has_unused=False, stopping=False)
                )
                await callback.answer()
                return

            # Останавливаем подписку (реализуй метод в miniapp_db_fcn)
            success = await miniapp_db_fcn.stop_subscription(master_id=master.id, session=session)
            if not success:
                await callback.message.edit_text(
                    "❌ Не удалось остановить подписку. Попробуйте позже.",
                    reply_markup=get_payments_keyboard()
                )
                await callback.answer()
                return

            await session.commit()
    await callback.message.edit_text(
        "💳 Выберите нужный раздел:",
        reply_markup=get_payments_keyboard()
    )
    await callback.answer()
    

@dp.callback_query(F.data == "buy_base")
async def buy_base_subscription(callback: types.CallbackQuery, state: FSMContext):
    """Показывает выбор способа оплаты для базовой подписки"""
    await callback.message.edit_text(
        "📦 Выберите способ оплаты базовой подписки:",
        reply_markup=get_purchase_methods_keyboard("base")
    )
    await callback.answer()

@dp.callback_query(F.data == "buy_partner")
async def buy_partner_subscription(callback: types.CallbackQuery, state: FSMContext):
    """Показывает выбор способа оплаты для партнёрской подписки"""
    await callback.message.edit_text(
        "📦 Выберите способ оплаты партнёрской подписки:",
        reply_markup=get_purchase_methods_keyboard("partner")
    )
    await callback.answer()
 
 #--------

@dp.callback_query(F.data == "buy_base_money")
async def buy_base_money(callback: types.CallbackQuery, state: FSMContext):
    """Заглушка покупки базовой подписки за деньги"""
    await callback.message.edit_text(
        "💳 Покупка базовой подписки за деньги будет реализована позже.\n"
        "Пока что это заглушка.",
        reply_markup=get_purchase_methods_keyboard("base")  # возвращаем к выбору способа
    )
    await callback.answer()

@dp.callback_query(F.data == "buy_base_points")
async def buy_base_points(callback: types.CallbackQuery, state: FSMContext):
    """Заглушка покупки базовой подписки за баллы"""
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
            ref_stats = await miniapp_db_fcn.get_referral_stats(master_id=master.id, session=session)
            points = ref_stats["invited_masters"]
            if points<3:
                await callback.message.edit_text(
                    "❌ Баллов на Вашем счету недостаточно.",
                    reply_markup=get_payments_keyboard()
                )
                await callback.answer()
                return
            await miniapp_db_fcn.decrease_points(master_id=master.id, amount=3, session=session)
            await miniapp_db_fcn.add_to_sub_bank(level=1, master_id=master.id, session=session)
        await session.commit()      
    await callback.message.edit_text(
        "🎯 Поздравляем с покупкой месяца базовой подписки за баллы!",
        reply_markup=get_purchase_methods_keyboard("base")
    )
    await callback.answer()

@dp.callback_query(F.data == "buy_partner_money")
async def buy_partner_money(callback: types.CallbackQuery, state: FSMContext):
    """Заглушка покупки партнёрской подписки за деньги"""
    await callback.message.edit_text(
        "💳 Покупка партнёрской подписки за деньги будет реализована позже.\n"
        "Пока что это заглушка.",
        reply_markup=get_purchase_methods_keyboard("partner")
    )
    await callback.answer()

@dp.callback_query(F.data == "buy_partner_points")
async def buy_partner_points(callback: types.CallbackQuery, state: FSMContext):
    """Заглушка покупки партнёрской подписки за баллы"""
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
            ref_stats = await miniapp_db_fcn.get_referral_stats(master_id=master.id, session=session)
            points = ref_stats["invited_masters"]
            if points<9:
                await callback.message.edit_text(
                    "❌ Баллов на Вашем счету недостаточно.",
                    reply_markup=get_payments_keyboard()
                )
                await callback.answer()
                return
            await miniapp_db_fcn.decrease_points(master_id=master.id, amount=9, session=session)
            await miniapp_db_fcn.add_to_sub_bank(level=2, master_id=master.id, session=session)
        await session.commit()     
    await callback.message.edit_text(
        "🎯 Поздравляем с покупкой месяца партнерской подписки за баллы!",
        reply_markup=get_purchase_methods_keyboard("partner")
    )
    await callback.answer()

#------------BOT TOKEN COMMANDS------------

@dp.callback_query(F.data == "tokens_menu")
async def handle_tokens_menu(callback: types.CallbackQuery, state: FSMContext):
    """Показывает главное меню токенов"""
    chat_id = callback.from_user.id
    async with AsyncSessionLocal() as session:
        async with session.begin():
            await miniapp_db_fcn.check_token_model(chat_id=chat_id, session=session)
            token, super_token = await miniapp_db_fcn.get_tokens_amount(chat_id=chat_id, session=session)
            await callback.message.edit_text(
                f"🪙 Раздел токенов\n\nНа Вашем счету:\nТокенов: {token}\nСупер токенов: {super_token}\n\nВыберите, что хотите приобрести:",
                reply_markup=get_tokens_main_keyboard()
            )
        await session.commit()
    await callback.answer()

@dp.callback_query(F.data == "buy_tokens")
async def handle_buy_tokens(callback: types.CallbackQuery, state: FSMContext):
    """Показывает прайс-лист обычных токенов"""
    await callback.message.edit_text(
        "🪙 Пакеты обычных токенов:\n\n"
        "Выберите нужное количество:",
        reply_markup=get_token_packages_keyboard("regular")
    )
    await callback.answer()

@dp.callback_query(F.data == "buy_super_tokens")
async def handle_buy_super_tokens(callback: types.CallbackQuery, state: FSMContext):
    """Показывает прайс-лист супер токенов"""
    await callback.message.edit_text(
        "⭐ Пакеты супер токенов:\n\n"
        "Выберите нужное количество:",
        reply_markup=get_token_packages_keyboard("super")
    )
    await callback.answer()

@dp.callback_query(F.data.startswith("buy_regular_"))
async def handle_buy_regular_package(callback: types.CallbackQuery, state: FSMContext):
    """Обработка выбора пакета обычных токенов (заглушка)"""
    amount = callback.data.split("_")[2]  # например, buy_regular_100 -> "100"
    # TODO: здесь будет логика оплаты
    await callback.message.edit_text(
        f"🛒 Вы выбрали пакет {amount} токенов.\n"
        "Оплата будет добавлена позже.\n"
        "Пока что это заглушка.",
        reply_markup=get_token_packages_keyboard("regular")  # остаёмся в этом же меню
    )
    await callback.answer()

@dp.callback_query(F.data.startswith("buy_bonus_regular"))
async def handle_buy_regular_package(callback: types.CallbackQuery, state: FSMContext):
    """Обработка выбора пакета обычных токенов (заглушка)"""
    chat_id = callback.from_user.id
    async with AsyncSessionLocal() as session:
        async with session.begin():
            master = await miniapp_db_fcn.get_master_by_chat(chat_id, session)
            ref_stats = await miniapp_db_fcn.get_referral_stats(master_id=master.id, session=session)
            points = ref_stats["invited_masters"]
            if points<1:
                await callback.message.edit_text(
                    "❌ Баллов на Вашем счету недостаточно.",
                    reply_markup=get_payments_keyboard()
                )
                await callback.answer()
                return
            await miniapp_db_fcn.decrease_points(master_id=master.id, amount=1, session=session)
            await miniapp_db_fcn.increase_tokens(session=session, chat_id=chat_id, amount=25)
        await session.commit()      
    await callback.message.edit_text(
        f"✅ На Ваш счет добавлено 25 токенов",
        reply_markup=get_token_packages_keyboard("regular")  # остаёмся в этом же меню
    )
    await callback.answer()

@dp.callback_query(F.data.startswith("buy_bonus_super"))
async def handle_buy_regular_package(callback: types.CallbackQuery, state: FSMContext):
    """Обработка выбора пакета обычных токенов (заглушка)"""
    chat_id = callback.from_user.id
    async with AsyncSessionLocal() as session:
        async with session.begin():
            master = await miniapp_db_fcn.get_master_by_chat(chat_id, session)
            ref_stats = await miniapp_db_fcn.get_referral_stats(master_id=master.id, session=session)
            points = ref_stats["invited_masters"]
            if points<1:
                await callback.message.edit_text(
                    "❌ Баллов на Вашем счету недостаточно.",
                    reply_markup=get_payments_keyboard()
                )
                await callback.answer()
                return
            await miniapp_db_fcn.decrease_points(master_id=master.id, amount=1, session=session)
            await miniapp_db_fcn.increase_super_tokens(session=session, chat_id=chat_id, amount=10)
        await session.commit()      
    await callback.message.edit_text(
        f"✅ На Ваш счет добавлено 10 супер токенов",
        reply_markup=get_token_packages_keyboard("super")  # остаёмся в этом же меню
    )
    await callback.answer()

@dp.callback_query(F.data.startswith("buy_super_"))
async def handle_buy_super_package(callback: types.CallbackQuery, state: FSMContext):
    """Обработка выбора пакета супер токенов (заглушка)"""
    amount = callback.data.split("_")[2]  # например, buy_super_10 -> "10"
    # TODO: здесь будет логика оплаты
    await callback.message.edit_text(
        f"🛒 Вы выбрали пакет {amount} супер токенов.\n"
        "Оплата будет добавлена позже.\n"
        "Пока что это заглушка.",
        reply_markup=get_token_packages_keyboard("super")  # остаёмся в этом же меню
    )
    await callback.answer()

#------------BOT ADDITIONAL FUNCS------------

async def send_notification(bot: Bot, chat_id: int, text: str):
    if bot is None:
        logging.error("Бот не инициализирован, сообщение не отправлено")
        return
    try:
        await bot.send_message(chat_id=chat_id, text=text)
        logging.info(f"Уведомление отправлено пользователю {chat_id}")
    except Exception as e:
        logging.error(f"Не удалось отправить сообщение {chat_id}: {e}")

sem = asyncio.Semaphore(20)

async def send_single_message(chat_id: int, text: str, session, session_type: str, id = None) -> bool:
    """Отправляет одно сообщение, логирует успех/ошибку и возвращает статус."""
    async with sem:
        try:
            await bot.send_message(chat_id=chat_id, text=text)
            logging.info(f"Notification was sent to user {chat_id}")
            if id!=None:
                if session_type=="sync":
                    miniapp_db_fcn.change_message_status_sync(message_id=id, session=session)
                else:
                    await miniapp_db_fcn.change_message_status(message_id=id, session=session)
            return True
        except Exception as e:
            logging.error(f"Notification wasn't sent to user {chat_id}: {e}")
            text+="\n\nПросим прощения за возможные неудобства. Сообщение было отправлено позже из-за временных проблем с прокси."
            if id == None:
                if session_type=="sync":
                    miniapp_db_fcn.create_delayed_message_sync(chat_id=chat_id, text=text, session=session)
                else:
                    await miniapp_db_fcn.create_delayed_message(chat_id=chat_id, text=text, session=session)
            return False

async def notify_all(messages: List[dict], session, session_type = "sync"):
    """Отправляет все сообщения параллельно, логируя каждую ошибку отдельно."""
    if not messages:
        logging.info("No messages")
        return

    tasks = [
        send_single_message(msg["chat_id"], msg["text"], session=session, id = msg["id"], session_type=session_type)
        for msg in messages
    ]
    results = await asyncio.gather(*tasks)

    success_count = sum(results)
    logging.info(f"Отправлено {success_count} из {len(messages)} уведомлений")


async def send_all_delayed(session: AsyncSession):
    messages = await miniapp_db_fcn.get_all_messages(session=session)
    delayed = []
    for msg in messages:
        delayed.append({"chat_id": msg.chat_id,
                       "text": msg.text,
                       "id": msg.id})
    await notify_all(messages=delayed, session=session, session_type = "async")
    return "success"