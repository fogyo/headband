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
    hair_type: str

class HairUpdateRequest(BaseModel):
    hair_type: str

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

@router.get("/face_parameters", response_model=ParametersResponse)
async def get_parameters(session_id: uuid.UUID,
                         session: AsyncSession = Depends(get_db_session)):
    parameters = await miniapp_db_fcn.get_parameters(session_id=session_id, session=session)
    return {"status": "success",
            "face_type": parameters.face_type,
            "hair_type": parameters.hair_type}



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

@router.get("/hair_recommends", response_model=HaircutResponse)
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
                              "hair_type": parameters.hair_type
                              },
                        "haircuts":
                             [{"id": h.id,
                            "face_type": h.face_type,
                            "hair_type": h.hair_type} for h in haircuts]
                        },
                    }
    task = task_manager.delay(task_request)
    return {"status": "processing",
            "task": task.id}

@router.get("/ready_hair_recommendations", response_model=RecommendationResponse)
async def get_ready_hair_recommendations(session_id: uuid.UUID,
                          session: AsyncSession = Depends(get_db_session)):
    ids = await miniapp_db_fcn.get_recs(session_id=session_id, session=session)
    id_array = ids.split(" ")
    haircuts = []
    for id in id_array:
        haircut = await miniapp_db_fcn.get_haircut_by_id(haircut_id=id, session=session)
        haircuts.append({"id": id,
                         "name": haircut.name,
                         "img_url": f"{s3_domain}{haircut.img_url}"})
    return {"status": "success",
            "recommended": haircuts}

@router.get("/get_bg", response_model=ImgResponse)
async def get_bg_url(session_id: uuid.UUID,
                     session: AsyncSession = Depends(get_db_session)):
    url = await miniapp_db_fcn.get_session_image(session_id=session_id, session=session)
    return {"status": "success",
            "img_url": url}