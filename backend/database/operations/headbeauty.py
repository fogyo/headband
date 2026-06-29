import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.headbeauty import hb_session
from backend.database import HeadbeautySessionModel, FaceParametersModel, HaircutTemplateModel, \
    HaircutRecommendationModel, FaceHairTemplateModel, ColorTemplateModel, PermsTemplateModel
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

async def delete_session(session_id: uuid.UUID, session: AsyncSession):
    return await HeadbeautySessionModel.delete(session_id=session_id, session=session)

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

async def create_face_hair_template(data: dict, session: AsyncSession):
    return await FaceHairTemplateModel.create(session=session, data=data)

async def create_color_template(data: dict, session: AsyncSession):
    return await ColorTemplateModel.create(session=session, data=data)

async def create_perm_template(data: dict, session: AsyncSession):
    return await PermsTemplateModel.create(session=session, data=data)

async def update_hair(data: dict, session_id: uuid.UUID, session: AsyncSession):
    params = await FaceParametersModel.get_by_session_id(session=session, session_id=session_id)
    return await FaceParametersModel.update(param_id=params.id, update_data=data, session=session)

async def get_haircuts(session_id: uuid.UUID, session: AsyncSession):
    working_session = await HeadbeautySessionModel.get_by_id(session_id=session_id, session=session)
    return await HaircutTemplateModel.get_all_by_gender(gender=working_session.gender, session=session)

async def get_beards(session: AsyncSession):
    return await FaceHairTemplateModel.get_all(session=session)

async def get_colors(session: AsyncSession):
    return await ColorTemplateModel.get_all(session=session)

async def get_perms(session: AsyncSession):
    return await PermsTemplateModel.get_all(session=session)

def create_or_update_recommendations_hair(session_id: uuid.UUID, data: dict, session):
    rec = HaircutRecommendationModel.get_by_session_id_sync(session_id=session_id, session=session)
    data["session_id"] = session_id
    if rec == None:
        HaircutRecommendationModel.create(session=session, data=data)
        return "success"
    HaircutRecommendationModel.update(session=session, update_data=data, rec_id=rec.id)
    return "success"

async def get_recs(session_id: uuid.UUID, session: AsyncSession):
    return await HaircutRecommendationModel.get_by_session_id(session_id=session_id, session=session)

async def get_haircut_by_id(haircut_id: uuid.UUID, session: AsyncSession):
    return await HaircutTemplateModel.get_by_id(template_id=haircut_id, session=session)

async def get_beard_by_id(beard_id: uuid.UUID, session: AsyncSession):
    return await FaceHairTemplateModel.get_by_id(template_id=beard_id, session=session)

async def get_color_by_id(color_id: uuid.UUID, session: AsyncSession):
    return await ColorTemplateModel.get_by_id(template_id=color_id, session=session)