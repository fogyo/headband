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

from backend.telegram_bot.keyboards import get_main_keyboard, get_payments_keyboard, get_role_keyboard, get_subscriptions_keyboard
from backend.telegram_bot import dp, bot

from backend.database import miniapp_db_fcn, AsyncSessionLocal


class UserState(StatesGroup):
    role = State()

@dp.message(CommandStart(deep_link=False))
async def cmd_start_simple(message: types.Message, state: FSMContext):
    # логика для /start без аргументов
    user_data = await state.get_data()
    role = user_data.get("role")
    if role is None:
        await message.answer(
            "👋 Добро пожаловать!\nВыберите кто пользуется приложением:",
            reply_markup=get_role_keyboard()
        )
    else:
        role_text = "Клиент" if role == "client" else "Мастер"
        await message.answer(
            f"✅ Ваша роль: {role_text}\nДля получения доступа к полному функционалу откройте наш MiniApp по ссылке ниже",
            reply_markup=get_main_keyboard(role)
        )

@dp.message(CommandStart(deep_link=True, magic=F.args))
async def cmd_start(message: types.Message, command: CommandStart, state: FSMContext):
    user_data = await state.get_data()
    role = user_data.get("role")
    ref_code = command.args
    if ref_code != "":
        async with AsyncSessionLocal() as session:
            async with session.begin():
                chat_id = message.from_user.id
                username = message.from_user.username

                dev_link = await miniapp_db_fcn.get_by_id_dev_link(link=uuid.UUID(ref_code), session=session)
                if dev_link!=None:
                    if dev_link.status == 1:
                        await message.answer(
                        f"❌ К сожалению ссылка была активирована ранее.\n"
                        f"С количеством Ваших актуальных подписок Вы можете ознакомиться в Настройки->Подписки. Там же происходит и активация подписок, которая позволит клиентам записываться к Вам.\nС функционалом приложения Вы можете ознакомиться по ссылке ниже.",
                        reply_markup=get_main_keyboard(role)
                    )
                    elif await miniapp_db_fcn.check_master(chat_id=chat_id, session=session) == None:
                        status, master_id = await miniapp_db_fcn.create_master_tg(chat_id=chat_id, username=username, session=session, referrer_master_id=master_id)
                        status = await miniapp_db_fcn.add_to_sub_bank(level=dev_link.level, master_id=master_id, session=session)
                        dev_link.status = 1
                        await session.flush()
                        await state.update_data(role="master")
                        await message.answer(
                        f"✅ Отлично! Вы зашли по реферальной ссылке от разработчика. Ваша учетная запись была создана.\n"
                        f"Также Вам доступен месяц пробного периода. С количеством Ваших актуальных подписок Вы можете ознакомиться в Настройки->Подписки. Там же происходит и активация подписок, которая позволит клиентам записываться к Вам.\nС функционалом приложения Вы можете ознакомиться по ссылке ниже.",
                        reply_markup=get_main_keyboard(role)
                    )
                    elif await miniapp_db_fcn.check_master(chat_id=chat_id, session=session) != None: 
                        new_master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
                        status = await miniapp_db_fcn.add_to_sub_bank(level=dev_link.level, master_id=new_master.id, session=session)
                        dev_link.status = 1
                        await session.flush()
                        await state.update_data(role="master")
                        await message.answer(
                        f"✅ Отлично! Вы зашли по реферальной ссылке от разработчика.\n"
                        f"Вам доступен месяц пробного периода. С количеством Ваших актуальных подписок Вы можете ознакомиться в Настройки->Подписки. Там же происходит и активация подписок, которая позволит клиентам записываться к Вам.\nС функционалом приложения Вы можете ознакомиться по ссылке ниже.",
                        reply_markup=get_main_keyboard(role)
                    )

                else:
                    invited_role, master_id = await miniapp_db_fcn.get_referral_owner(link_id=uuid.UUID(ref_code), session=session)
                    if invited_role=="client":
                        if await miniapp_db_fcn.check_user(chat_id=chat_id, session=session):
                            await miniapp_db_fcn.create_user(chat_id=chat_id, username=username, session=session)
                        user_id = await miniapp_db_fcn.get_user_id(chat_id=chat_id, session=session)
                        status = await miniapp_db_fcn.make_relationship_user_to_master(master_id=master_id, user_id=user_id, session=session)
                        await state.update_data(role="client")
                        logging.info("User added by deeplink")
                        await message.answer(
                            f"✅ Отлично! Вы добавлены в список постоянных клиентов мастера. Для Вас это означает, что Вы будете при записи видеть этого мастера в первую очередь\n"
                            f"Для получения доступа к полному функционалу откройте наш MiniApp по ссылке ниже",
                            reply_markup=get_main_keyboard(role)
                        )
                    elif invited_role=="master":
                        if await miniapp_db_fcn.check_master(chat_id=chat_id, session=session) == None:
                            await miniapp_db_fcn.create_master_tg(chat_id=chat_id, username=username, session=session, referrer_master_id=master_id)
                            await state.update_data(role="master")
                            logging.info("Master created by deeplink")
                            await message.answer(
                            f"✅ Отлично! Вы зашли по реферальной ссылке мастера. Ваша учетная запись была создана.\n"
                            f"Оформите подписку, чтобы клиенты могли записываться к Вам. Это также необходимо для получения бонусов пригласившему Вас мастеру!",
                            reply_markup=get_main_keyboard(role)
                        )
                        else:
                            new_master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
                            active, end_date, status = await miniapp_db_fcn.get_subscription_level(master_id=new_master.id, session=session)
                            if new_master.id == master_id:
                                await state.update_data(role="master")
                                logging.info("Master info added by deeplink")
                                await message.answer(
                                    f"❌ К сожалению, по условиям нашей акции, можно использовать только чужие реферальные ссылки.\n"
                                    f"Надеемся на Ваше понимание! Спасибо, что выбираете headband\n",
                                    reply_markup=get_main_keyboard(role))
                            elif (status == "no sub") and (new_master.referrer_id == None):
                                upd_data = {"referrer_id": master_id}
                                await miniapp_db_fcn.update_master(master_id=new_master.id, update_data=upd_data, session=session)
                                await state.update_data(role="master")
                                logging.info("Master info added by deeplink")
                                await message.answer(
                                f"✅ Отлично! Вы зашли по реферальной ссылке мастера.\n"
                                f"Оформите подписку, чтобы клиенты могли записываться к Вам. Это также необходимо для получения бонусов пригласившему Вас мастеру!",
                                reply_markup=get_main_keyboard(role))
                            elif (active):
                                await state.update_data(role="master")
                                logging.info("Master has subscription")
                                await message.answer(
                                f"❌ К сожалению, по условиям нашей акции, эта реферальная ссылка подходит только для новых аккаунтов, на которых еще не было подписок и не активировались другие приглашения.\n"
                                f"Надеемся на Ваше понимание! Спасибо, что выбираете headband\n",
                                reply_markup=get_main_keyboard(role))
                            else:
                                await state.update_data(role="master")
                                logging.info("Master has activated")
                                await message.answer(
                                f"❌ К сожалению, по условиям нашей акции, эта реферальная ссылка подходит только для новых аккаунтов, на которых еще не было подписок и не активировались другие приглашения.\n"
                                f"Надеемся на Ваше понимание! Оформите подписку, чтобы клиенты могли записываться к Вам.\n",
                                reply_markup=get_main_keyboard(role))
                await session.commit()

@dp.callback_query(F.data.in_(["role_client", "role_master"]))
async def handle_role_selection(callback: types.CallbackQuery, state: FSMContext):
    async with AsyncSessionLocal() as session:
        async with session.begin():
            new_role = "client" if callback.data == "role_client" else "master"
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
            await session.commit()
            await callback.answer()

@dp.callback_query(F.data == "back_to_main")
async def back_to_main(callback: types.CallbackQuery, state: FSMContext):
    user_data = await state.get_data()
    role = user_data.get("role", "client")
    role_text = "Клиент" if role == "client" else "Мастер"
    await callback.message.edit_text(
        f"✅ Ваша роль: {role_text}\nДля получения доступа к полному функционалу откройте наш MiniApp по ссылке ниже",
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

async def send_single_message(chat_id: int, text: str) -> bool:
    """Отправляет одно сообщение, логирует успех/ошибку и возвращает статус."""
    async with sem:
        try:
            await bot.send_message(chat_id=chat_id, text=text)
            logging.info(f"Notification was sent to user {chat_id}")
            return True
        except Exception as e:
            logging.error(f"Notification wasn't sent to user {chat_id}: {e}")
            return False


async def notify_all(messages: List[dict]):
    """Отправляет все сообщения параллельно, логируя каждую ошибку отдельно."""
    if not messages:
        logging.info("No messages")
        return

    tasks = [
        send_single_message(msg["chat_id"], msg["text"])
        for msg in messages
    ]
    results = await asyncio.gather(*tasks)

    success_count = sum(results)
    logging.info(f"Отправлено {success_count} из {len(messages)} уведомлений")
