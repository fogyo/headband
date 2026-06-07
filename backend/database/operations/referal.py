import os
import uuid

from sqlalchemy.ext.asyncio import AsyncSession


from backend.database import MasterReferralModel, MasterModel, MasterConstantUsersModel

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

async def make_relationship_user_to_master(user_id: uuid.UUID, master_id: uuid.UUID, session: AsyncSession):
    data_to_create = {"master_id": master_id,
                      "user_id": user_id}
    if not (await MasterConstantUsersModel.is_constant(session=session, master_id=master_id, user_id=user_id)):
        await MasterConstantUsersModel.create(session=session, data=data_to_create)
    return "success"

async def get_referral_owner(
        link_id: uuid.UUID,
        session: AsyncSession
):
    master = await MasterModel.get_by_link_id(ref=link_id, session=session)
    if master.master_link_id == link_id:
        return "master", master.id
    else:
        return "client", master.id