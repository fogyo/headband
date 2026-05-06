import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import WorkFilesModel


async def create_workfile(filepath: str, master_id: uuid.UUID, name: str, session: AsyncSession):
    return await WorkFilesModel.create(data={"master_id": master_id,
                                             "name": name,
                                             "filepath": filepath}, session=session)

async def get_by_master(master_id: uuid.UUID, session: AsyncSession):
    return await WorkFilesModel.get_by_master_id(master_id=master_id, session=session)

async def get_by_master_and_name(master_id: uuid.UUID, name: str, session: AsyncSession):
    return await WorkFilesModel.get_by_master_name(master_id=master_id, name=name, session=session)

async def get_works_by_id(image_id: uuid.UUID, session: AsyncSession):
    return await WorkFilesModel.get_by_id(session=session, file_id=image_id)