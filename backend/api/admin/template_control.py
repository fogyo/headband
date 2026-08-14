import uuid
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.responses import StatusResponse
from backend.database import get_db_session
from backend.database import miniapp_db_fcn

router = APIRouter(
    prefix="/admins/templates",
    tags=["Admin.Template"]
)

class Category(BaseModel):
    id: uuid.UUID
    name: str
    parental_name: str
    eng_name: str


class CategoryList(StatusResponse):
    categories: List[Category]


class CategoryCreate(BaseModel):
    name: str
    parental_name: str
    eng_name: str


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    parental_name: Optional[str] = None
    eng_name: Optional[str] = None


# ---------- HaircutTemplate ----------
class HaircutTemplate(BaseModel):
    id: uuid.UUID
    gender: bool
    name: str
    description: str
    face_type_recommendations: str
    hair_type_recommendations: str
    jawline: str
    forehead_height: str
    cheekbones: str
    neck_length: str
    img_url: str


class HaircutTemplateList(StatusResponse):
    haircuts: List[HaircutTemplate]   # или haircut_templates


class HaircutTemplateCreate(BaseModel):
    gender: bool
    name: str
    description: str
    face_type_recommendations: str
    hair_type_recommendations: str
    jawline: str
    forehead_height: str
    cheekbones: str
    neck_length: str
    img_url: str


class HaircutTemplateUpdate(BaseModel):
    gender: Optional[bool] = None
    name: Optional[str] = None
    description: Optional[str] = None
    face_type_recommendations: Optional[str] = None
    hair_type_recommendations: Optional[str] = None
    jawline: Optional[str] = None
    forehead_height: Optional[str] = None
    cheekbones: Optional[str] = None
    neck_length: Optional[str] = None
    img_url: Optional[str] = None


# ---------- FaceHairTemplate ----------
class FaceHairTemplate(BaseModel):
    id: uuid.UUID
    name: str
    description: str
    face_shape_recommendations: str
    facial_features_recommendations: str
    hair_color_recommendations: str
    img_url: str


class FaceHairTemplateList(StatusResponse):
    face_hair_templates: List[FaceHairTemplate]


class FaceHairTemplateCreate(BaseModel):
    name: str
    description: str
    face_shape_recommendations: str
    facial_features_recommendations: str
    hair_color_recommendations: str
    img_url: str


class FaceHairTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    face_shape_recommendations: Optional[str] = None
    facial_features_recommendations: Optional[str] = None
    hair_color_recommendations: Optional[str] = None
    img_url: Optional[str] = None


# ---------- ColorTemplate ----------
class ColorTemplate(BaseModel):
    id: uuid.UUID
    name: str
    hex: str
    skin_temperature: str
    contrast: str
    eye_color: str
    skin_condition: str


class ColorTemplateList(StatusResponse):
    color_templates: List[ColorTemplate]


class ColorTemplateCreate(BaseModel):
    name: str
    hex: str
    skin_temperature: str
    contrast: str
    eye_color: str
    skin_condition: str


class ColorTemplateUpdate(BaseModel):
    name: Optional[str] = None
    hex: Optional[str] = None
    skin_temperature: Optional[str] = None
    contrast: Optional[str] = None
    eye_color: Optional[str] = None
    skin_condition: Optional[str] = None


# ---------- PermsTemplate ----------
class PermsTemplate(BaseModel):
    id: uuid.UUID
    name: str
    img_url: str
    description: str


class PermsTemplateList(StatusResponse):
    perms_templates: List[PermsTemplate]


class PermsTemplateCreate(BaseModel):
    name: str
    img_url: str
    description: str


class PermsTemplateUpdate(BaseModel):
    name: Optional[str] = None
    img_url: Optional[str] = None
    description: Optional[str] = None


# ---------- CityTemplate ----------
class CityTemplate(BaseModel):
    id: uuid.UUID
    city: str
    location: str


class CityTemplateList(StatusResponse):
    city_templates: List[CityTemplate]


class CityTemplateCreate(BaseModel):
    location: str
    city: str


class CityTemplateUpdate(BaseModel):
    location: Optional[str] = None
    city: Optional[str] = None


# ---------- MetroTemplate ----------
class MetroTemplate(BaseModel):
    id: uuid.UUID
    name: str
    hex: str          # цвет линии в hex-формате, например "#ff0000"
    location: str   # WKT-строка
    city_id: uuid.UUID


class MetroTemplateList(StatusResponse):
    metro_templates: List[MetroTemplate]


class MetroTemplateCreate(BaseModel):
    name: str
    hex: str
    location: str
    city_id: uuid.UUID


class MetroTemplateUpdate(BaseModel):
    name: Optional[str] = None
    hex: Optional[str] = None
    location: Optional[str] = None
    city_id: Optional[uuid.UUID] = None

@router.get("/category_list", response_model=CategoryList)
async def get_all_categories(session: AsyncSession = Depends(get_db_session)):
    categories = await miniapp_db_fcn.check_data_categories(session=session)
    return {"status": "success",
            "categories": categories}

@router.delete("/category_delete", response_model=StatusResponse)
async def delete_category(category_id: uuid.UUID, chat_id: int, session: AsyncSession = Depends(get_db_session)):
    admin = await miniapp_db_fcn.get_admin_by_id(chat_id=chat_id, session=session)
    if admin.creator:
        await miniapp_db_fcn.delete_category(category_id=category_id, session=session)
        return {"status": "success"}
    return {"status": "not available"}

@router.post("/category_create", response_model=StatusResponse)
async def create_category(chat_id: int, request: CategoryCreate, session: AsyncSession = Depends(get_db_session)):
    admin = await miniapp_db_fcn.get_admin_by_id(chat_id=chat_id, session=session)
    if admin.creator:
        await miniapp_db_fcn.create_category(
            name=request.name,
            parental=request.parental_name,
            eng_name=request.eng_name,
            session=session
        )
        return {"status": "success"}
    return {"status": "not available"}

@router.patch("/update_category", response_model=StatusResponse)
async def update_category(chat_id: int,
                          category_id: uuid.UUID,
                          request: CategoryUpdate,
                          session: AsyncSession = Depends(get_db_session)):
    admin = await miniapp_db_fcn.get_admin_by_id(chat_id=chat_id, session=session)
    if admin.creator:
        upd_data = request.model_dump(exclude_unset=True)
        await miniapp_db_fcn.update_category(category_id=category_id, upd_data=upd_data, session=session)
        return {"status": "success"}
    return {"status": "not available"}

# ---------- HaircutTemplate ----------
@router.get("/haircut_template_list", response_model=HaircutTemplateList)
async def get_all_haircut_templates(session: AsyncSession = Depends(get_db_session)):
    items = await miniapp_db_fcn.get_all_haircuts(session=session)
    return {"status": "success", "haircuts": items}

@router.delete("/haircut_template_delete", response_model=StatusResponse)
async def delete_haircut_template(template_id: uuid.UUID, chat_id: int,
                                  session: AsyncSession = Depends(get_db_session)):
    admin = await miniapp_db_fcn.get_admin_by_id(chat_id=chat_id, session=session)
    if admin.creator:
        await miniapp_db_fcn.delete_haircut(haircut=template_id, session=session)
        return {"status": "success"}
    return {"status": "not available"}

@router.post("/haircut_template_create", response_model=StatusResponse)
async def create_haircut_template(chat_id: int, request: HaircutTemplateCreate,
                                  session: AsyncSession = Depends(get_db_session)):
    admin = await miniapp_db_fcn.get_admin_by_id(chat_id=chat_id, session=session)
    if admin.creator:
        await miniapp_db_fcn.create_cut_template(data=request.model_dump(), session=session)
        return {"status": "success"}
    return {"status": "not available"}


# ---------- FaceHairTemplate ----------
@router.get("/face_hair_template_list", response_model=FaceHairTemplateList)
async def get_all_face_hair_templates(session: AsyncSession = Depends(get_db_session)):
    items = await miniapp_db_fcn.get_beards(session=session)
    return {"status": "success", "face_hair_templates": items}

@router.delete("/face_hair_template_delete", response_model=StatusResponse)
async def delete_face_hair_template(template_id: uuid.UUID, chat_id: int,
                                    session: AsyncSession = Depends(get_db_session)):
    admin = await miniapp_db_fcn.get_admin_by_id(chat_id=chat_id, session=session)
    if admin.creator:
        await miniapp_db_fcn.delete_beard(beard=template_id, session=session)
        return {"status": "success"}
    return {"status": "not available"}

@router.post("/face_hair_template_create", response_model=StatusResponse)
async def create_face_hair_template(chat_id: int, request: FaceHairTemplateCreate,
                                    session: AsyncSession = Depends(get_db_session)):
    admin = await miniapp_db_fcn.get_admin_by_id(chat_id=chat_id, session=session)
    if admin.creator:
        await miniapp_db_fcn.create_face_hair_template(data=request.model_dump(), session=session)
        return {"status": "success"}
    return {"status": "not available"}


# ---------- ColorTemplate ----------
@router.get("/color_template_list", response_model=ColorTemplateList)
async def get_all_color_templates(session: AsyncSession = Depends(get_db_session)):
    items = await miniapp_db_fcn.get_colors(session=session)
    return {"status": "success", "color_templates": items}

@router.delete("/color_template_delete", response_model=StatusResponse)
async def delete_color_template(template_id: uuid.UUID, chat_id: int,
                                session: AsyncSession = Depends(get_db_session)):
    admin = await miniapp_db_fcn.get_admin_by_id(chat_id=chat_id, session=session)
    if admin.creator:
        await miniapp_db_fcn.delete_color(template_id=template_id, session=session)
        return {"status": "success"}
    return {"status": "not available"}

@router.post("/color_template_create", response_model=StatusResponse)
async def create_color_template(chat_id: int, request: ColorTemplateCreate,
                                session: AsyncSession = Depends(get_db_session)):
    admin = await miniapp_db_fcn.get_admin_by_id(chat_id=chat_id, session=session)
    if admin.creator:
        await miniapp_db_fcn.create_color_template(data=request.model_dump(), session=session)
        return {"status": "success"}
    return {"status": "not available"}


# ---------- PermsTemplate ----------
@router.get("/perms_template_list", response_model=PermsTemplateList)
async def get_all_perms_templates(session: AsyncSession = Depends(get_db_session)):
    items = await miniapp_db_fcn.get_perms(session=session)
    return {"status": "success", "perms_templates": items}

@router.delete("/perms_template_delete", response_model=StatusResponse)
async def delete_perms_template(template_id: uuid.UUID, chat_id: int,
                                session: AsyncSession = Depends(get_db_session)):
    admin = await miniapp_db_fcn.get_admin_by_id(chat_id=chat_id, session=session)
    if admin.creator:
        await miniapp_db_fcn.delete_perms(template_id=template_id, session=session)
        return {"status": "success"}
    return {"status": "not available"}

@router.post("/perms_template_create", response_model=StatusResponse)
async def create_perms_template(chat_id: int, request: PermsTemplateCreate,
                                session: AsyncSession = Depends(get_db_session)):
    admin = await miniapp_db_fcn.get_admin_by_id(chat_id=chat_id, session=session)
    if admin.creator:
        await miniapp_db_fcn.create_perm_template(data=request.model_dump(), session=session)
        return {"status": "success"}
    return {"status": "not available"}



# ---------- CityTemplate ----------
@router.get("/city_template_list", response_model=CityTemplateList)
async def get_all_city_templates(session: AsyncSession = Depends(get_db_session)):
    items = await miniapp_db_fcn.get_cities(session=session)
    return {"status": "success", "city_templates": items}

@router.delete("/city_template_delete", response_model=StatusResponse)
async def delete_city_template(template_id: uuid.UUID, chat_id: int,
                               session: AsyncSession = Depends(get_db_session)):
    admin = await miniapp_db_fcn.get_admin_by_id(chat_id=chat_id, session=session)
    if admin.creator:
        await miniapp_db_fcn.delete_city(city_id=template_id, session=session)
        return {"status": "success"}
    return {"status": "not available"}

@router.post("/city_template_create", response_model=StatusResponse)
async def create_city_template(chat_id: int, request: CityTemplateCreate,
                               session: AsyncSession = Depends(get_db_session)):
    admin = await miniapp_db_fcn.get_admin_by_id(chat_id=chat_id, session=session)
    if admin.creator:
        await miniapp_db_fcn.create_city(data=request.model_dump(), session=session)
        return {"status": "success"}
    return {"status": "not available"}


# ---------- MetroTemplate ----------
@router.get("/metro_template_list", response_model=MetroTemplateList)
async def get_all_metro_templates(session: AsyncSession = Depends(get_db_session)):
    items = await miniapp_db_fcn.get_all_metro(session=session)
    return {"status": "success", "metro_templates": items}

@router.delete("/metro_template_delete", response_model=StatusResponse)
async def delete_metro_template(template_id: uuid.UUID, chat_id: int,
                                session: AsyncSession = Depends(get_db_session)):
    admin = await miniapp_db_fcn.get_admin_by_id(chat_id=chat_id, session=session)
    if admin.creator:
        await miniapp_db_fcn.delete_metro(template_id=template_id, session=session)
        return {"status": "success"}
    return {"status": "not available"}

@router.post("/metro_template_create", response_model=StatusResponse)
async def create_metro_template(chat_id: int, request: MetroTemplateCreate,
                                session: AsyncSession = Depends(get_db_session)):
    admin = await miniapp_db_fcn.get_admin_by_id(chat_id=chat_id, session=session)
    if admin.creator:
        await miniapp_db_fcn.create_station(data=request.model_dump(), session=session)
        return {"status": "success"}
    return {"status": "not available"}