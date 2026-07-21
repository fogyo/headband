import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import RatingModel


async def get_rating(master_id: uuid.UUID, session: AsyncSession):
    average = await RatingModel.get_avg_rating_for_master(master_id=master_id, session=session)
    rates = len(await RatingModel.get_by_master_id(master_id=master_id, session=session))
    return rates, average

async def create_rating_record(master_id: uuid.UUID, user_id: uuid.UUID, rating: int, session: AsyncSession):
    data_to_create = {"master_id": master_id,
                      "user_id": user_id,
                      "rating": rating}
    await RatingModel.create(session=session, data=data_to_create)
    return "success"