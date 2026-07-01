import logging
import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import MasterModel, MasterReferralModel, MasterNotificationModel, MasterConstantUsersModel, \
    TokenModel
from backend.database.operations import headbeauty
from backend.database.requests import MasterCreateRequestTG


async def update_master(master_id: uuid.UUID, update_data: dict, session: AsyncSession) -> str:
    """Обновление данных мастера"""

    return await MasterModel.update(
        session=session,
        master_id=master_id,
        update_data=update_data
    )

async def check_master(chat_id: int, session: AsyncSession):
    return await MasterModel.get_by_chat_id_tg(session=session, chat_id=chat_id) == None



async def create_master_tg(
        chat_id: int,
        username: str,
        session: AsyncSession,
        referrer_master_id: Optional[uuid.UUID] = None
):
    """Создание мастера по диплинку с отслеживанием реферала"""
    try:
        # Генерируем персональные реферальные ссылки для нового мастера
        new_master_link_id = uuid.uuid4()  # для приглашения мастеров
        new_user_link_id = uuid.uuid4()  # для приглашения клиентов

        master_data = MasterCreateRequestTG(
            chat_id_tg=chat_id,
            username_tg=username,
            master_link_id=new_master_link_id,
            user_link_id=new_user_link_id
        )
        master_dict = master_data.model_dump()

        if referrer_master_id:
            master_dict["referrer_id"] = referrer_master_id
            master_dict["referral_counted"] = False

        master_id = await MasterModel.create(session=session, data=master_dict)

        await MasterNotificationModel.create(session=session, master_id=master_id)

        await MasterReferralModel.create(session=session, master_id=master_id)

        await headbeauty.check_token_model(chat_id=chat_id, session=session)

        return "success", master_id
    except Exception as e:
        logging.error(f"Ошибка создания мастера: {e}")
        return f"error: {str(e)}", uuid.UUID(int=0)


async def get_master_categories(master_id: uuid.UUID, session: AsyncSession):
    """Получение категорий мастера"""
    return await MasterModel.get_categories(session=session, master_id=master_id)


async def get_master(master_id: uuid.UUID, session: AsyncSession) -> MasterModel:
    return await MasterModel.get_by_id(master_id=master_id, session=session)

async def get_master_by_chat(chat_id: int, session: AsyncSession) -> MasterModel:
    return await MasterModel.get_by_chat_id_tg(chat_id=chat_id, session=session)

async def get_constant_masters(user_id: uuid.UUID, session: AsyncSession):
    return await MasterConstantUsersModel.get_by_user_id(user_id=user_id, session=session)

async def get_ambassadors(session: AsyncSession):
    return await MasterModel.get_ambassadors(session=session)

async def set_ambassador(master_id: uuid.UUID, session: AsyncSession):
    upd_data = {"ambassador": True}
    return await MasterModel.update(session=session, master_id=master_id, update_data=upd_data)