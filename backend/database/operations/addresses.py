import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AddressModel, CityTemplateModel, MetroTemplateModel



async def create_address(
    address: dict,
    session: AsyncSession
):
    """Создание адреса"""
    return await AddressModel.create(session=session, data=address)


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
            "location": addr.location.ST_AsText(),
            "full_address": addr.full_address,
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



async def update_address(address_id: uuid.UUID, upd_data: dict, session: AsyncSession):
    if upd_data["long"] == None or upd_data["lat"] == None:
        location = f"POINT ({upd_data["long"]} {upd_data["lat"]})"
        upd_data.pop("long")
        upd_data.pop("lat") 
        upd_data["location"] = location
    return await AddressModel.update(session=session, address_id=address_id, update_data=upd_data)

async def get_cities(session: AsyncSession):
    cities = await CityTemplateModel.get_all(session=session)
    response_data = []
    for city in cities:
        response_data.append({"id": city.id,
                              "city": city.city,
                              "location": city.location.ST_AsText()})

async def create_city(data: dict, session: AsyncSession):
    return await CityTemplateModel.create(session=session, data=data)

async def create_station(data: dict, session: AsyncSession):
    return await MetroTemplateModel.create(session=session, data=data)
