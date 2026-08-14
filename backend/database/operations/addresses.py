import uuid

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AddressModel, CityTemplateModel, MetroTemplateModel
from shapely import wkb


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
            "location": str(addr.location),
            "full_address": addr.full_address,
            "address": f"{(addr.full_address).split(",")[0]},{(addr.full_address).split(",")[1]},{(addr.full_address).split(",")[2]}" if addr.full_address != None else addr.address
        }
        for addr in addresses
    ]

async def get_address_by_id(
    id: uuid.UUID,
    session: AsyncSession
):
    """Получение всех адресов мастера"""
    address = await AddressModel.get_by_id(session=session, address_id=id)
    return address

async def delete_address(
    address_id: uuid.UUID,
    session: AsyncSession
):
    """Удаление адреса"""
    return await AddressModel.delete(session=session, address_id=address_id)

async def get_addresses_by_range(range: int, session: AsyncSession, center_location: str):
    return await AddressModel.get_within_radius(range=range, session=session, center_location=center_location)

async def update_address(address_id: uuid.UUID, upd_data: dict, session: AsyncSession):
    if upd_data["long"] != None and upd_data["lat"] != None:
        location = f"POINT ({upd_data["long"]} {upd_data["lat"]})"
        upd_data.pop("long")
        upd_data.pop("lat") 
        upd_data["location"] = location
    return await AddressModel.update(session=session, address_id=address_id, update_data=upd_data)

async def get_cities(session: AsyncSession):
    cities = await CityTemplateModel.get_all(session=session)
    response_data = []
    for city in cities:
        point = wkb.loads(bytes.fromhex(str(city.location)))
        response_data.append({"id": city.id,
                              "city": city.city,
                              "location": f"POINT ({point.x} {point.y})"})
    return response_data

async def create_city(data: dict, session: AsyncSession):
    return await CityTemplateModel.create(session=session, data=data)

async def create_station(data: dict, session: AsyncSession):
    return await MetroTemplateModel.create(session=session, data=data)

async def delete_city(city_id: uuid.UUID, session: AsyncSession):
    return await CityTemplateModel.delete(template_id=city_id, session=session)

async def get_all_stations_by_city(city_id: uuid.UUID, session: AsyncSession):
    return await MetroTemplateModel.get_by_city_id(city_id=city_id, session=session)

async def delete_metro(template_id: uuid.UUID, session: AsyncSession):
    return await MetroTemplateModel.delete(session=session, metro_id=template_id)

async def get_metro_by_id(station_id: uuid.UUID, session: AsyncSession):
    return await MetroTemplateModel.get_by_id(metro_id=station_id, session=session)

async def find_nearest_station(point: str, city_id: uuid.UUID, session: AsyncSession):
    return await MetroTemplateModel.find_nearest(point=point, city_id=city_id, session=session)