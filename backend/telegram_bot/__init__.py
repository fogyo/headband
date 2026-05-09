import logging
import os

from aiogram import Bot, Dispatcher, types
from sqlalchemy.ext.asyncio import AsyncSession



BOT_TOKEN = os.getenv('BOT_TOKEN')
BOT_URL = os.getenv('BOT_URL')



'''async def handle_deeplink(message: types.Message, args: str, session: AsyncSession):
    user = message.from_user
    chat = message.chat
    logging.info(args)
    user_category, res = await db_functions.user_master_deeplink(args=args, session=session)
    if user_category == 0:
        status = await db_functions.create_master(user=user, chat=chat, organization_id=res, session=session)
        logging.info(f"{status} master with id {chat.id}")
        if status.__eq__("error"):
            return "Создать мастера не получилось"
        return "Мастер добавлен в организацию, добро пожаловать!"
    elif user_category == 1:
        status = await db_functions.create_user(user, chat, res)
        logging.info(f"{status} user with id {chat.id}")
        return "Добро пожаловать, для ознакомления с ассортиментом зайдите в tg mini app"
    return "Ссылка недействительна"'''

