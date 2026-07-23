import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AdminModel, SupportModel, TokenUsageModel, UsageStatus, TokenTypes, MasterModel, UserModel, SubscriptionModel, \
    HeadbeautySessionModel, PreviewModel, AppointmentModel


async def check_admin(chat_id: int, session: AsyncSession):
    admin = await AdminModel.get_by_chat_id(chat_id=chat_id, session=session)
    if not admin:
        return False
    return True

async def solve_problem(problem_id: uuid.UUID, session: AsyncSession):
    return await SupportModel.mark_solved(session=session, request_id=problem_id)

async def create_support_request(chat_id: int, text: str, session: AsyncSession):
    return await SupportModel.create(session=session, chat_id=chat_id, text=text)

async def verify_admin(chat_id: int, password: str, session: AsyncSession):
    return await AdminModel.verify_password(chat_id=chat_id, password=password, session=session)

async def create_admin(chat_id: int, password: str, session: AsyncSession):
    return await AdminModel.create(chat_id=chat_id, session=session, password=password)

def spent_token_record(model: str, session):
    if model=="base":
        TokenUsageModel.create_sync(session=session, amount=1, status=UsageStatus.SPENT, token_type=TokenTypes.BASE)
    else:
        TokenUsageModel.create_sync(session=session, amount=1, status=UsageStatus.SPENT, token_type=TokenTypes.SUPER)

async def get_master_progression(session: AsyncSession):
    return await MasterModel.get_progression_masters(session=session)

async def get_user_progression(session: AsyncSession):
    return await UserModel.get_progression_users(session=session)

async def get_finance(session: AsyncSession, token: TokenTypes):
    return await TokenUsageModel.get_all_last_month(session=session, token_type=token)

async def get_subs(session: AsyncSession, level: int):
    return await SubscriptionModel.count_active_by_level(session=session, level=level)

async def get_gender_sessions(session: AsyncSession, gender: bool):
    return await HeadbeautySessionModel.count_gender_session(session=session, gender=gender)

async def get_saved_percent(session: AsyncSession, model: str):
    return await PreviewModel.get_saved_stats_by_model(session=session, model=model)

async def get_all_appointments(session: AsyncSession):
    return await AppointmentModel.get_all(session=session)

async def get_all_future_appointments(session: AsyncSession):
    return await AppointmentModel.get_all_future(session=session)

async def get_all_confirmed_appointments(session: AsyncSession):
    return await AppointmentModel.get_all_confirmed(session=session)
