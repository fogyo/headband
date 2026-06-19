from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import HeadbeautySessionModel


async def get_all_sessions(chat_id: int, session: AsyncSession):
    return await HeadbeautySessionModel.get_by_chat_id(chat_id=chat_id, session=session)

async def create_session(chat_id: int,
                         gender: bool,
                         img_url: str,
                         session: AsyncSession):
    data = {"chat_id": chat_id,
            "gender": gender,
            "img_url": img_url}
    return await HeadbeautySessionModel.create(data=data, session=session)