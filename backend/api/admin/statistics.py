from datetime import date
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db_session, miniapp_db_fcn, TokenTypes
from backend.database.responses import StatusResponse

router = APIRouter(
    prefix="/admins/stats",
    tags=["Admin"])

class UserRecord(BaseModel):
    amount: int
    date_record: date

class SavedPercentage(BaseModel):
    total: int
    saved: int
    model: str

class UsersResponse(BaseModel):
    masters_dynamic: List[UserRecord]
    users_dynamic: List[UserRecord]

class FinanceResponse(BaseModel):
    tokens_spent: int
    super_tokens_spent: int
    tokens_purchased: int
    super_tokens_purchased: int
    tokens_spent_cost: int
    super_tokens_spent_cost: int
    tokens_purchased_cost: int
    super_tokens_purchased_cost: int
    base_masters: int
    partner_masters: int

class AIResponse(BaseModel):
    man_sessions: int
    woman_sessions: int
    results_base: SavedPercentage
    results_improve: SavedPercentage

class AppointmentResponse(BaseModel):
    appointments_amount: int
    appointments_future: int
    appointments_confirmed: int

class StatsResponse(StatusResponse):
    users: UsersResponse
    finance: FinanceResponse
    ai: AIResponse
    appointments: AppointmentResponse


async def getUsers(session: AsyncSession):
    masters = await miniapp_db_fcn.get_master_progression(session=session)
    users = await miniapp_db_fcn.get_user_progression(session=session)
    return {"masters_dynamic": masters,
            "users_dynamic": users}

async def getFinance(session: AsyncSession):
    tokens_dict = await miniapp_db_fcn.get_finance(session=session, token=TokenTypes.BASE)
    super_tokens_dict = await miniapp_db_fcn.get_finance(session=session, token=TokenTypes.SUPER)
    base_masters = await miniapp_db_fcn.get_subs(session=session, level=1)
    partner_masters = await miniapp_db_fcn.get_subs(session=session, level=2)
    return {"tokens_spent": tokens_dict["total_spent"],
            "super_tokens_spent": super_tokens_dict["total_spent"],
            "tokens_purchased": tokens_dict["total_purchased"],
            "super_tokens_purchased": super_tokens_dict["total_purchased"],
            "tokens_spent_cost": int(tokens_dict["total_spent"]*5.5),
            "super_tokens_spent_cost": int(super_tokens_dict["total_spent"]*19.5),
            "tokens_purchased_cost": tokens_dict["total_purchased_costage"],
            "super_tokens_purchased_cost": super_tokens_dict["total_purchased_costage"],
            "base_masters": base_masters,
            "partner_masters": partner_masters
            }

async def getAI(session: AsyncSession):
    man_sessions = await miniapp_db_fcn.get_gender_sessions(session=session, gender=False)
    woman_sessions = await miniapp_db_fcn.get_gender_sessions(session=session, gender=True)
    stats_base = await miniapp_db_fcn.get_saved_percent(session=session, model="base")
    stats_improve = await miniapp_db_fcn.get_saved_percent(session=session, model="improve")
    return {"man_sessions": man_sessions,
            "woman_sessions": woman_sessions,
            "results_base": stats_base,
            "results_improve": stats_improve}

async def getAppointments(session: AsyncSession):
    appointments_amount = await miniapp_db_fcn.get_all_appointments(session=session)
    future_appointments_amount = await miniapp_db_fcn.get_all_future_appointments(session=session)
    confirmed_appointments = await miniapp_db_fcn.get_all_confirmed_appointments(session=session)
    return {"appointments_amount": appointments_amount,
            "appointments_future": future_appointments_amount,
            "appointments_confirmed": confirmed_appointments,
            }


@router.get("/", response_model=StatsResponse)
async def get_stats(session: AsyncSession = Depends(get_db_session)):
    users = await getUsers(session=session)
    finance = await getFinance(session=session)
    ai = await getAI(session=session)
    appointments = await getAppointments(session=session)
    return {"status": "success",
            "users": users,
            "finance": finance,
            "ai": ai,
            "appointments": appointments}
