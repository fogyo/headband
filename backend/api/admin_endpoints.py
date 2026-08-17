import logging
import uuid

from celery.result import AsyncResult
from fastapi import Depends, APIRouter
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession


from backend.database import get_db_session, miniapp_db_fcn
from backend.database.responses import StatusResponse
from backend.model.bg_factory import task_manager
from backend.telegram_bot.bot_main import bot, send_all_delayed

router = APIRouter(
    prefix="/admins",
    tags=["Admin"]
)
class Password(BaseModel):
    password: str

class Account(StatusResponse):
    user: bool
    master: bool

class SubRequest(BaseModel):
    level: int

class Feedback(BaseModel):
    text: str

class FeedbackResponse(Feedback):
    problem_id: uuid.UUID

class LogResponse(StatusResponse):
    logs: list

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

@router.post("/communication", response_model=StatusResponse)
async def get_help(chat_id: int,
                   request: Feedback,
                   session: AsyncSession = Depends(get_db_session)):
    req_id = await miniapp_db_fcn.create_support_request(chat_id=chat_id, text=request.text, session=session)
    try:
        await bot.send_message(chat_id=980609742, text=f"Обратная связь: {request.text} \nID пользователя: {chat_id}\nID проблемы: {req_id}")
        await send_all_delayed(session=session)
    except Exception as e:
        logging.info(f"bot messages with {e}")
        await miniapp_db_fcn.create_delayed_message(chat_id=980609742, text=f"Обратная связь: {request.text} \nID пользователя: {chat_id}\nID проблемы: {req_id}", session=session)
    return {"status": "success"}



@router.post("/verify_admin", response_model=StatusResponse)
async def verify_admin(chat_id: int,
                       request: Password,
                       session: AsyncSession = Depends(get_db_session)):
    verify = await miniapp_db_fcn.verify_admin(chat_id=chat_id, password=request.password, session=session)
    if verify:
        return {"status": "success"}
    return {"status": "error"}

@router.get("/check_account", response_model=Account)
async def get_acc(chat_id: int,
                session: AsyncSession = Depends(get_db_session)):
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    user_id = await miniapp_db_fcn.get_user_id(chat_id=chat_id, session=session)
    master_flag = True
    user_flag = True
    if master == None:
        master_flag = False
    if user_id == None:
        user_flag = False
    return {"status": "success",
            "master": master_flag,
            "user": user_flag}


"""@router.get("/logs")
async def get_logs():
    return {"status": "success",
            "logs": [msg for _, msg in LOG_BUFFER]}"""
