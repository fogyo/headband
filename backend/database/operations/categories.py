import logging
import uuid
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import CategoryModel, MasterCategoryModel, PriceModel


async def get_all_categories(session: AsyncSession):
    """Получение всех категорий"""
    categories = await CategoryModel.get_all(session=session)
    return [
        {
            "id": cat.id,
            "name": cat.name
        }
        for cat in categories
    ]

async def get_all_categories_parental(parental_name: str,
                                      session: AsyncSession):
    """Получение всех категорий"""
    return await CategoryModel.get_by_parental(session=session, parental_name=parental_name)


def get_all_categories_sync(session):
    """Получение всех категорий"""
    categories = CategoryModel.get_all_sync(session=session)
    return [
        {
            "id": cat.id,
            "name": cat.name
        }
        for cat in categories
    ]


async def create_category(
        name: str,
        parental: str,
        eng_name: str,
        session: AsyncSession
):
    """Создание категории"""
    data = {"name": name,
            "parental_name": parental,
            "eng_name": eng_name}
    return await CategoryModel.create(session=session, data=data)

async def check_category(category_ids: List[uuid.UUID],
                         master_id: uuid.UUID,
                         session: AsyncSession):
    cats = await PriceModel.get_cats_by_master_id(master_id=master_id, session=session)
    logging.info(cats)
    for category_id in category_ids:
        if category_id in cats:
            logging.info("Успешная проверка")
            return True
    return False

async def delete_category(category_id: uuid.UUID,
                          session: AsyncSession):
    return await CategoryModel.delete(session=session, category_id=category_id)

