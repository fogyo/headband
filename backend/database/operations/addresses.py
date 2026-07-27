import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AddressModel, CityTemplateModel, MetroTemplateModel



async def create_address(
    master_id: uuid.UUID,
    address: str,
    session: AsyncSession
):
    """Создание адреса"""
    data = {
        "master_id": master_id,
        "address": address
    }
    return await AddressModel.create(session=session, data=data)


async def get_addresses_by_master(
    master_id: uuid.UUID,
    session: AsyncSession
):
    """Получение всех адресов мастера"""
    addresses = await AddressModel.get_by_master_id(
        session=session,
        master_id=master_id
    )
    return [
        {
            "id": str(addr.id),
            "address": addr.address
        }
        for addr in addresses
    ]

async def get_address_by_id(
    id: uuid.UUID,
    session: AsyncSession
):
    """Получение всех адресов мастера"""
    address = await AddressModel.get_by_id(session=session, address_id=id)
    return address.address

async def delete_address(
    address_id: uuid.UUID,
    session: AsyncSession
):
    """Удаление адреса"""
    return await AddressModel.delete(session=session, address_id=address_id)


async def update_address(address_id: uuid.UUID, address: str, session: AsyncSession):
    return await AddressModel.update(session=session, address_id=address_id, update_data={"address": address})

async def get_cities(session: AsyncSession):
    return await CityTemplateModel.get_all(session=session)

async def create_city(data: dict, session: AsyncSession):
    return await CityTemplateModel.create(session=session, data=data)

async def create_station(data: dict, session: AsyncSession):
    return await MetroTemplateModel.create(session=session, data=data)
