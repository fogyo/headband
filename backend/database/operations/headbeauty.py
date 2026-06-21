import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.headbeauty import hb_session
from backend.database import HeadbeautySessionModel, FaceParametersModel, HaircutTemplateModel
from backend.database.obj_storage import s3_domain


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

async def get_parameters(session_id: uuid.UUID, session: AsyncSession):
    return await FaceParametersModel.get_by_session_id(session=session, session_id=session_id)

def create_face_parameters_sync(data: dict, session_id: uuid.UUID, session):
    data["session_id"] = session_id
    return FaceParametersModel.create(data=data, session=session)

async def get_session_image(session_id: uuid.UUID, session: AsyncSession):
    user_session = await HeadbeautySessionModel.get_by_id(session_id=session_id, session=session)
    return f"{s3_domain}{user_session.img_url}"

async def create_cut_template(data: dict, session: AsyncSession):
    return await HaircutTemplateModel.create(session=session, data=data)