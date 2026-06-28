import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db_session, miniapp_db_fcn
from backend.database.obj_storage import s3_domain
from backend.database.responses import StatusResponse
from backend.model.bg_factory import TaskType, task_manager

router = APIRouter(
    prefix="/headbeauty/session",
    tags=["Headbeauty.Session"]
)

class ParametersResponse(StatusResponse):
    face_type: str
    hair_type: Optional[str] = "None"
    jawline: str
    forehead_height: str
    cheekbones: str
    neck_length: str

class HairUpdateRequest(BaseModel):
    hair_type: str

class Color(BaseModel):
    id: uuid.UUID
    name: str
    hex: str

class ColorResponse(StatusResponse):
    colors: List[Color]

class Haircut(BaseModel):
    id: uuid.UUID
    name: str
    img_url: str

class HaircutResponse(StatusResponse):
    haircuts: List[Haircut]

class ImgResponse(StatusResponse):
    img_url: str

class RecommendationResponse(StatusResponse):
    recommended: List[Haircut]

class RecommendationColorResponse(StatusResponse):
    recommended: List[Color]

@router.get("/face_parameters", response_model=ParametersResponse)
async def get_parameters(session_id: uuid.UUID,
                         session: AsyncSession = Depends(get_db_session)):
    parameters = await miniapp_db_fcn.get_parameters(session_id=session_id, session=session)
    return {"status": "success",
            "face_type": parameters.face_type,
            "hair_type": parameters.hair_type,
            "jawline": parameters.jawline,
            "forehead_height": parameters.forehead_height,
            "cheekbones": parameters.cheekbones,
            "neck_length": parameters.neck_length
            }



@router.post("/start_face_analysis")
async def make_analysis(session_id: uuid.UUID,
                        session: AsyncSession = Depends(get_db_session)):
    parameters = await miniapp_db_fcn.get_parameters(session_id=session_id, session=session)
    if parameters == None:
        image_url = await miniapp_db_fcn.get_session_image(session_id=session_id, session=session)
        task_request = {"ai_task": TaskType.FACE_PARAMS_ANALYZE.value,
                        "data": {"file_url": image_url,
                                 "session_id": session_id}}
        task = task_manager.delay(task_request)
        return {"status": "processing",
                "task": task.id}
    return {"status": "processing",
            "task": "atomic_operation"}


@router.patch("/update_hair_type", response_model=StatusResponse)
async def update_hair_type(session_id: uuid.UUID,
                           request: HairUpdateRequest,
                           session: AsyncSession = Depends(get_db_session)):
    resp = await miniapp_db_fcn.update_hair(session_id=session_id, data=request.model_dump(), session=session)
    return {"status": "success"}

@router.get("/haircuts", response_model=HaircutResponse)
async def get_haircuts(session_id: uuid.UUID,
                       session: AsyncSession = Depends(get_db_session)):
    haircuts = await miniapp_db_fcn.get_haircuts(session_id=session_id, session=session)
    return {"status": "success",
            "haircuts": [{"id": h.id,
                          "name": h.name,
                          "img_url": f"{s3_domain}{h.img_url}"} for h in haircuts]}

@router.get("/hair_recommends")
async def get_hair_recommends(session_id: uuid.UUID,
                          session: AsyncSession = Depends(get_db_session)):
    parameters = await miniapp_db_fcn.get_parameters(session_id=session_id, session=session)
    haircuts = await miniapp_db_fcn.get_haircuts(session_id=session_id, session=session)
    task_request = {"ai_task": TaskType.HAIR_RECOMMENDATIONS.value,
                    "data":
                        {
                        "session_id": session_id,
                        "user":
                             {"face_type": parameters.face_type,
                              "hair_type": parameters.hair_type,
                              "jawline": parameters.jawline,
                              "forehead_height": parameters.forehead_height,
                              "cheekbones": parameters.cheekbones,
                              "neck_length": parameters.neck_length
                              },
                        "haircuts":
                             [{"id": h.id,
                                "face_type": h.face_type_recommendations,
                                "hair_type": h.hair_type_recommendations,
                                "jawline": h.jawline,
                                "forehead_height": h.forehead_height,
                                "cheekbones": h.cheekbones,
                                "neck_length": h.neck_length
                               } for h in haircuts]
                        },
                    }
    task = task_manager.delay(task_request)
    return {"status": "processing",
            "task": task.id}

@router.get("/ready_hair_recommendations", response_model=RecommendationResponse)
async def get_ready_hair_recommendations(session_id: uuid.UUID,
                          session: AsyncSession = Depends(get_db_session)):
    recs = await miniapp_db_fcn.get_recs(session_id=session_id, session=session)
    id_array = recs.recommended_haircuts.split(" ")
    haircuts = []
    for id in id_array:
        haircut = await miniapp_db_fcn.get_haircut_by_id(haircut_id=id, session=session)
        haircuts.append({"id": id,
                         "name": haircut.name,
                         "img_url": f"{s3_domain}{haircut.img_url}"})
    return {"status": "success",
            "recommended": haircuts}

@router.get("/beards", response_model=HaircutResponse)
async def get_beards(session: AsyncSession = Depends(get_db_session)):
    beards = await miniapp_db_fcn.get_beards(session=session)
    return {"status": "success",
            "haircuts": [{"id": b.id,
                          "name": b.name,
                          "img_url": f"{s3_domain}{b.img_url}"} for b in beards]}

@router.get("/beard_recommends")
async def get_beard_recommends(session_id: uuid.UUID,
                          session: AsyncSession = Depends(get_db_session)):
    parameters = await miniapp_db_fcn.get_parameters(session_id=session_id, session=session)
    beards = await miniapp_db_fcn.get_beards(session=session)
    task_request = {"ai_task": TaskType.FACE_HAIR_RECOMMENDATIONS.value,
                    "data":
                        {
                        "session_id": session_id,
                        "user":
                             {"face_type": parameters.face_type,
                              "hair_color": parameters.hair_color,
                              "facial_features": parameters.beard_facial_features
                              },
                        "beards":
                             [{"id": b.id,
                                "face_type": b.face_shape_recommendations,
                                "hair_color": b.hair_color_recommendations,
                                "facial_features": b.facial_features_recommendations,
                               } for b in beards]
                        },
                    }
    task = task_manager.delay(task_request)
    return {"status": "processing",
            "task": task.id}

@router.get("/ready_beard_recommendations", response_model=RecommendationResponse)
async def get_ready_beard_recommendations(session_id: uuid.UUID,
                          session: AsyncSession = Depends(get_db_session)):
    recs = await miniapp_db_fcn.get_recs(session_id=session_id, session=session)
    id_array = recs.recommended_beards.split(" ")
    beards = []
    for id in id_array:
        beard = await miniapp_db_fcn.get_beard_by_id(beard_id=id, session=session)
        beards.append({"id": id,
                         "name": beard.name,
                         "img_url": f"{s3_domain}{beard.img_url}"})
    return {"status": "success",
            "recommended": beards}

@router.get("/get_bg", response_model=ImgResponse)
async def get_bg_url(session_id: uuid.UUID,
                     session: AsyncSession = Depends(get_db_session)):
    url = await miniapp_db_fcn.get_session_image(session_id=session_id, session=session)
    return {"status": "success",
            "img_url": url}

@router.get("/colors", response_model=ColorResponse)
async def get_colors(session: AsyncSession = Depends(get_db_session)):
    colors = await miniapp_db_fcn.get_colors(session=session)
    return {"status": "success",
            "colors": [{"id": c.id,
                          "name": c.name,
                          "hex": c.hex} for c in colors]}

@router.get("/color_recommends")
async def get_color_recommends(session_id: uuid.UUID,
                          session: AsyncSession = Depends(get_db_session)):
    parameters = await miniapp_db_fcn.get_parameters(session_id=session_id, session=session)
    colors = await miniapp_db_fcn.get_colors(session=session)
    task_request = {"ai_task": TaskType.COLOR_RECOMMENDATIONS.value,
                    "data":
                        {
                        "session_id": session_id,
                        "user":
                             {"skin_temperature": parameters.skin_temperature,
                              "contrast": parameters.contrast,
                              "eye_color": parameters.eye_color
                              },
                        "colors":
                             [{"id": c.id,
                                "skin_temperature": c.skin_temperature,
                                "contrast": c.contrast,
                                "eye_color": c.eye_color
                               } for c in colors]
                        },
                    }
    task = task_manager.delay(task_request)
    return {"status": "processing",
            "task": task.id}

@router.get("/ready_color_recommendations", response_model=RecommendationColorResponse)
async def get_ready_color_recommendations(session_id: uuid.UUID,
                          session: AsyncSession = Depends(get_db_session)):
    recs = await miniapp_db_fcn.get_recs(session_id=session_id, session=session)
    id_array = recs.recommended_colors.split(" ")
    colors = []
    for id in id_array:
        color = await miniapp_db_fcn.get_color_by_id(color_id=id, session=session)
        colors.append({"id": id,
                         "name": color.name,
                         "hex": color.hex})
    return {"status": "success",
            "recommended": colors}