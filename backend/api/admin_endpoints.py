import uuid

from celery.result import AsyncResult
from fastapi import Depends, APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db_session, miniapp_db_fcn
from backend.database.responses import StatusResponse
from backend.model.bg_factory import task_manager

router = APIRouter(
    prefix="/admins",
    tags=["Admin"]
)

@router.patch("/set_ambassador", response_model=StatusResponse)
async def set_amba(
        chat_id: int,
        session: AsyncSession = Depends(get_db_session)):
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    status = await miniapp_db_fcn.set_ambassador(master_id=master_id, session=session)
    return {"status": status}

@router.get("/task")
async def get_task(task_id: str):
    if task_id == "atomic_operation":
        return {"status": "success"}
    else:
        task_result = AsyncResult(task_id, app=task_manager.app)

        if not task_result.ready():
            return {"status": "pending"}
        if task_result.successful():
            return {"status": "success"}
        else:
            # failed
            error = str(task_result.result) if task_result.result else "Unknown error"
            return {"status": "failed", "error": error}
