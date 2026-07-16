import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.headbeauty import hb_session
from backend.database import HeadbeautySessionModel, FaceParametersModel, HaircutTemplateModel, \
    HaircutRecommendationModel, FaceHairTemplateModel, ColorTemplateModel, PermsTemplateModel, TokenModel, PreviewModel
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

async def update_session(session_id: uuid.UUID,
                         upd_data: dict,
                         session: AsyncSession):
    await HeadbeautySessionModel.update(session_id=session_id, session=session, update_data=upd_data)

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

async def get_session_chat_id(session_id: uuid.UUID, session: AsyncSession):
    user_session = await HeadbeautySessionModel.get_by_id(session_id=session_id, session=session)
    return user_session.chat_id

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

async def get_all_haircuts(session: AsyncSession):
    return await HaircutTemplateModel.get_all(session=session)

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

async def check_token_model(chat_id: int, session: AsyncSession):
    if await TokenModel.get_by_chat_id(chat_id=chat_id, session=session) == None:
        await TokenModel.create(chat_id=chat_id, session=session)
    return "success"

async def get_tokens_amount(chat_id: int, session: AsyncSession):
    token_by_id = await TokenModel.get_by_chat_id(session=session, chat_id=chat_id)
    return token_by_id.tokens, token_by_id.super_tokens

def get_haircut_by_id_sync(obj_id: uuid.UUID, session):
    return HaircutTemplateModel.get_by_id_sync(session=session, template_id=obj_id)

def get_beard_by_id_sync(obj_id: uuid.UUID, session):
    return FaceHairTemplateModel.get_by_id_sync(session=session, template_id=obj_id)

def get_perm_by_id_sync(obj_id: uuid.UUID, session):
    return PermsTemplateModel.get_by_id_sync(session=session, template_id=obj_id)

def get_color_by_id_sync(obj_id: uuid.UUID, session):
    return ColorTemplateModel.get_by_id_sync(session=session, template_id=obj_id)

def create_preview_sync(session_id: uuid.UUID, img_url: str, session, model: str):
    return PreviewModel.create_sync(session_id=session_id, img_url=img_url, model=model, session=session)


async def decrease_tokens(session, chat_id: int):
    await TokenModel.decrease_tokens(session=session, chat_id=chat_id)

async def decrease_super_tokens(session, chat_id: int):
    await TokenModel.decrease_super_tokens(session=session, chat_id=chat_id)

async def get_preview_by_id(session: AsyncSession, preview_id: uuid.UUID):
    return await PreviewModel.get_by_id(session=session, preview_id=preview_id)

async def update_preview_url(session: AsyncSession, preview_id: uuid.UUID, img_url: str):
    return await PreviewModel.update(preview_id=preview_id, new_img_url=img_url, session=session)

async def get_all_previews(session: AsyncSession, session_id: uuid.UUID):
    return await PreviewModel.get_by_session_id(session_id=session_id, session=session)

async def increase_tokens(session: AsyncSession, chat_id: int, amount: int):
    await TokenModel.add_tokens(session=session, chat_id=chat_id, amount=amount)