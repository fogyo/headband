import uuid
from datetime import date
from typing import List

from fastapi import APIRouter, Depends

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.responses import StatusResponse
from backend.database import get_db_session
from backend.database import miniapp_db_fcn
from backend.telegram_bot.bot_main import bot

router = APIRouter(
    prefix="/admins/support",
    tags=["Admin.Support"]
)

class Feedback(BaseModel):
    text: str

class FeedbackResponse(Feedback):
    problem_id: uuid.UUID

class Problem(BaseModel):
    problem_id: uuid.UUID
    created: date
    text: str

class ProblemPageResponse(StatusResponse):
    pending_problems: List[Problem]
    solved_problems: List[Problem]

@router.get("/", response_model=ProblemPageResponse)
async def get_problem_tickets(session: AsyncSession = Depends(get_db_session)):
    pending_problems = await miniapp_db_fcn.get_problem_tickets(session=session)
    solved_problems = await miniapp_db_fcn.get_solved_tickets(session=session)
    return {"status": "success",
            "pending_problems": pending_problems,
            "solved_problems": solved_problems}

@router.post("/communication_response", response_model=StatusResponse)
async def dev_help(chat_id: int,
                   request: FeedbackResponse,
                   session: AsyncSession = Depends(get_db_session)):
    status = await miniapp_db_fcn.solve_problem(problem_id=request.problem_id, session=session)
    await bot.send_message(chat_id=chat_id, text=f"Ответ от разработчика:\n {request.text} \n С уважением, \n команда headband")
    return {"status": status}