import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db_session, miniapp_db_fcn
from backend.database.responses import StatusResponse
from backend.model.bg_factory import TaskType, task_manager

router = APIRouter(
    prefix="/headbeauty/session",
    tags=["Headbeauty.Session"]
)

class ParametersResponse(StatusResponse):
    face_type: str
    hair_type: str

@router.get("/face_parameters", response_model=ParametersResponse)
async def get_parameters(session_id: uuid.UUID,
                         session: AsyncSession = Depends(get_db_session)):
    parameters = await miniapp_db_fcn.get_parameters(session_id=session_id, session=session)
    if parameters != None:
        return {"status": "success",
                "face_type": parameters.face_type,
                "hair_type": parameters.hair_type}
    return {"status": "no data",
            "face_type": "",
            "hair_type": ""}


@router.post("/start_face_analysis")
async def make_analysis(session_id: uuid.UUID,
                        session: AsyncSession = Depends(get_db_session)):
    image_url = await miniapp_db_fcn.get_session_image(session_id=session_id, session=session)
    task_request = {"ai_task": TaskType.FACE_PARAMS_ANALYZE.value,
                    "data": {"file_url": image_url,
                             "session_id": session_id}}
    task = task_manager.delay(task_request)
    return {"status": "processing",
            "task": task.id}