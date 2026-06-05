import os
import uuid

from sqlalchemy.ext.asyncio import AsyncSession


from backend.database import MasterReferralModel, MasterModel


BOT_NAME = os.getenv('BOT_URL')


async def get_referral_stats(
        master_id: uuid.UUID,
        session: AsyncSession
):
    """Получение статистики рефералов мастера"""
    return await MasterReferralModel.get_stats(
        session=session,
        master_id=master_id
    )


async def get_master_referral_links(
        master_id: uuid.UUID,
        session: AsyncSession
):
    """Получение реферальных ссылок мастера"""
    master = await MasterModel.get_by_id(session=session, master_id=master_id)

    if not master:
        return None, None

    # Формируем ссылки для бота
    master_link = f"{BOT_NAME}?start={master.master_link_id}"
    user_link = f"{BOT_NAME}?start={master.user_link_id}"

    return master_link, user_link