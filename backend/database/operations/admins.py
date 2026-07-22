import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AdminModel, SupportModel


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