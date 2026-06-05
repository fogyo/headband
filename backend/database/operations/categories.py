import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import CategoryModel, MasterCategoryModel

'''async def get_all_categories(session: AsyncSession):
    """Получение всех категорий"""
    categories = await CategoryModel.get_all(session=session)
    return [
        {
            "id": cat.id,
            "name": cat.name
        }
        for cat in categories
    ]'''


async def create_category(
        name: str,
        session: AsyncSession
):
    """Создание категории"""
    data = {"name": name}
    return await CategoryModel.create(session=session, data=data)

async def check_category(category_id: uuid.UUID,
                         master_id: uuid.UUID,
                         session: AsyncSession):
    cats = await MasterCategoryModel.get_categories_by_master(id=master_id, session=session)
    if category_id in cats:
        return True
    return False

