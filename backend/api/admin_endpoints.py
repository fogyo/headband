import uuid

from celery.result import AsyncResult
from fastapi import Depends, APIRouter
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db_session, miniapp_db_fcn
from backend.database.responses import StatusResponse
from backend.model.bg_factory import task_manager

router = APIRouter(
    prefix="/admins",
    tags=["Admin"]
)

class SubRequest(BaseModel):
    level: int

@router.patch("/set_moderator", response_model=StatusResponse)
async def set_moderator(
        chat_id: int,
        session: AsyncSession = Depends(get_db_session)):
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    status = await miniapp_db_fcn.set_moderator(master_id=master_id, session=session)
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
            return task_result.get()
        else:
            # failed
            error = str(task_result.result) if task_result.result else "Unknown error"
            return {"status": "failed", "error": error}

@router.patch("/increase_tokens", response_model=StatusResponse)
async def increase_tokens(chat_id: int,
                   session: AsyncSession = Depends(get_db_session)):
    await miniapp_db_fcn.increase_tokens(session=session, chat_id=chat_id, amount=1)
    return {"status": "success"}

@router.post("/set_master_sub", response_model=StatusResponse)
async def set_sub(chat_id: int,
                  request: SubRequest,
                  session: AsyncSession = Depends(get_db_session)):
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    await miniapp_db_fcn.create_subscription(master_id=master.id, duration_days=30, level=request.level, session=session)
    return {"status": "success"}
