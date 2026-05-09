import uuid
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import PriceModel, CategoryModel, MasterCategoryModel


async def get_price_by_id(
        price_id: uuid.UUID,
        session: AsyncSession
):
    return await PriceModel.get_by_id(session=session, price_id=price_id)

async def create_price_position(
    price: dict,
    session: AsyncSession
):
    """Создание позиции прайса"""
    cat_id = await CategoryModel.get_by_name(name=price["category"], session=session)
    await MasterCategoryModel.add_category_to_master(master_id=price["master_id"], category_id=cat_id)
    return await PriceModel.create(session=session, data=price)


async def update_price(
    update_data: dict,
    session: AsyncSession
):
    """Обновление позиции прайса"""
    id = update_data["id"]
    del update_data["id"]
    price = await PriceModel.get_by_id(price_id=id, session=session)
    prices = await get_prices_by_category(category_id=price.category_id, master_id=price.master_id, session=session)
    if (len(prices) == 1 and update_data["category_id"]!=price.category_id):
        await MasterCategoryModel.remove_category_from_master(master_id=price.master_id, category_id=price.category_id)
    return await PriceModel.update(
        session=session,
        price_id=id,
        update_data=update_data
    )


async def delete_price(
    price_id: uuid.UUID,
    session: AsyncSession
):
    """Удаление позиции прайса"""
    price = await PriceModel.get_by_id(price_id=price_id, session=session)
    prices = await get_prices_by_category(category_id=price.category_id, master_id=price.master_id, session=session)
    if len(prices)==1:
        await MasterCategoryModel.remove_category_from_master(master_id=price.master_id, category_id=price.category_id)
    return await PriceModel.delete(session=session, price_id=price_id)


async def get_prices_by_master(master_id: uuid.UUID, session: AsyncSession):
    prices = await PriceModel.get_by_master_id(session=session, master_id=master_id)
    resp = [{
        "id": p.id,
        "name": p.name,
        "price": p.price,
        "category": await CategoryModel.get_by_id(session=session, category_id=p.category_id),
        "approximate_time": p.approximate_time,
        "master_id": p.master_id
    } for p in prices]
    return resp


async def get_prices_by_category(
    master_id: uuid.UUID,
    category_id: uuid.UUID,
    session: AsyncSession
):
    prices = await PriceModel.get_by_category(
        session=session,
        master_id=master_id,
        category_id=category_id
    )
    resp = [{
        "id": str(p.id),
        "name": p.name,
        "price": p.price,
        "category": await CategoryModel.get_by_id(session=session, category_id=p.category_id),
        "approximate_time": p.approximate_time,
        "master_id": str(p.master_id)
    } for p in prices]
    return "success", resp


async def create_pricelist(data: List, master_id: uuid.UUID, session: AsyncSession):
    for d in data:
        p = {}
        p["name"] = d["name"]
        p["price"] = d["price"]
        p["approximate_time"] = d["approximate_time"]
        p["category_id"] = await CategoryModel.get_by_name(session=session, name=d["category"])
        p["master_id"] = master_id
        d["id"] = await PriceModel.create(session=session, data=p)
    return data
