import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import UserModel, MasterConstantUsersModel


async def check_user(chat_id: int,
                     session: AsyncSession):
    return await UserModel.get_by_chat_id(session=session, chat_id=chat_id) == None


async def create_user(
        username: str | None,
        chat_id: int ,
        session: AsyncSession
):
    """Создание пользователя"""
    user = {"chat_id": chat_id,
            "username": username}
    created = await UserModel.create(session=session, data=user)
    if created:
        return "success"
    return "unable to create"

async def get_consonant_users(master_id: uuid.UUID, session: AsyncSession):
    return len(await MasterConstantUsersModel.get_by_master_id(master_id=master_id, session=session))

async def get_user_id(chat_id: int, session: AsyncSession):
    user = await UserModel.get_by_chat_id(chat_id=chat_id, session=session)
    return user.id

"""async def create_user_from_deeplink(
        chat_id: int,
        username: str,
        referrer_master_id: Optional[uuid.UUID],
        session: AsyncSession
):
    try:
        user_data = UserCreateRequest(
            chat_id=chat_id,
            username=username
        )
        user_id = await UserModel.create(session=session, data=user_data.model_dump())

        # Для пользователей реферал засчитывается сразу (если нужно)
        if referrer_master_id:
            referrer = await MasterModel.get_by_id(session=session, master_id=referrer_master_id)
            if referrer:
                await MasterReferralModel.increment_users(
                    session=session,
                    master_id=referrer_master_id
                )

        return "success", user_id
    except Exception as e:
        logging.error(f"Ошибка создания пользователя: {e}")
        return f"error: {str(e)}", uuid.UUID(int=0)"""