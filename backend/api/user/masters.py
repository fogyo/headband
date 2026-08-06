import logging
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db_session, miniapp_db_fcn
from backend.database.obj_storage import s3_domain
from backend.database.responses import StatusResponse
from shapely import wkb


router = APIRouter(
    prefix="/users/master",
    tags=["User.Master"]
)

class MasterResponse(BaseModel):
    id: uuid.UUID
    name: str
    avatar: str
    rating: float
    rates: int
    partner: bool

class MasterPageResponse(StatusResponse):
    masters: Optional[List[MasterResponse]] = None

class PartnerCity(BaseModel):
    city_id: uuid.UUID
    name: str
    master_num: int
    addresses: List[uuid.UUID]

class PartnerMetro(BaseModel):
    metro_id: uuid.UUID
    name: str
    hex: str
    addresses: List[uuid.UUID]

class PartnerMetroResponse(StatusResponse):
    partner_by_metro: List[PartnerMetro]

class PartnerCityResponse(StatusResponse):
    partner_by_city: List[PartnerCity]

class AddressListRequest(BaseModel):
    addresses: List[uuid.UUID]

@router.get("/", response_model=MasterPageResponse)
async def get_master(chat_id: int,
                     parental_category: str,
                     session: AsyncSession = Depends(get_db_session)):
    category_ids = await miniapp_db_fcn.get_all_categories_parental(parental_name=parental_category, session=session)
    logging.info(category_ids)
    user_id = await miniapp_db_fcn.get_user_id(chat_id=chat_id, session=session)
    const_masters_ids = await miniapp_db_fcn.get_constant_masters(user_id=user_id, session=session)
    logging.info(const_masters_ids)
    cm_response = []
    for master_id in const_masters_ids:
        if await miniapp_db_fcn.check_category(master_id=master_id, category_ids=category_ids, session=session):
            active, end_date, level = await miniapp_db_fcn.get_subscription_level(master_id=master_id, session=session)
            logging.info(end_date)
            if active:
                master = await miniapp_db_fcn.get_master(master_id=master_id, session=session)
                average, rates = await miniapp_db_fcn.get_rating(master_id=master_id, session=session)
                response = {"id": master_id,
                            "name": master.full_name,
                            "avatar": f"{s3_domain}{master.avatar}",
                            "rating": average,
                            "rates": rates,
                            "partner": level == 2}
                cm_response.append(response)

    return {"status": "success",
            "masters": cm_response}

@router.get("/partner_masters_amount_by_city", response_model=PartnerCityResponse)
async def get_master_by_city(parental_category: str, session: AsyncSession = Depends(get_db_session)):
    cities = await miniapp_db_fcn.get_cities(session=session)
    resp = []
    category_ids = await miniapp_db_fcn.get_all_categories_parental(parental_name=parental_category, session=session)
    for city in cities:
        master_by_city = []
        address_by_city = []
        addresses = await miniapp_db_fcn.get_addresses_by_range(range=30000, session=session, center_location=city["location"])
        for address in addresses:
            check = await miniapp_db_fcn.check_category(master_id=address.master_id, category_ids=category_ids, session=session)
            active, end, level = await miniapp_db_fcn.get_subscription_level(master_id=address.master_id, session=session)
            if active and level == 2 and check:
                master_by_city.append(address.master_id)
                address_by_city.append(address.id)
        resp.append({"city_id": city["id"],
                     "name": city["city"],
                     "master_num": len(set(master_by_city)),
                     "addresses": address_by_city})
    return {"status": "success",
            "partner_by_city": resp}

@router.get("/partner_masters_amount_by_metro", response_model=PartnerMetroResponse)
async def get_master_by_metro(city_id: uuid.UUID, 
                              request: AddressListRequest,
                              session: AsyncSession = Depends(get_db_session)):
    
    async def add_or_create(metro: dict, resp: List, address_numerator: List, address_id: uuid.UUID):
        if metro["name"] in address_numerator:
            index = address_numerator.index(metro["name"])
            resp[index]["addresses"].append(address_id)
        else: 
            address_numerator.append(metro["name"])
            addresses = []
            addresses.append(address_id)
            resp.append({"metro_id": metro["id"],
                        "name": metro["name"],
                        "hex": metro["hex"],
                        "addresses": addresses})
        return resp, address_numerator
    
    resp = []
    address_numerator = []
    addresses = request.addresses
    for address_id in addresses:
        address = await miniapp_db_fcn.get_address_by_id(id=address_id, session=session)
        point = wkb.loads(bytes.fromhex(str(address.location)))
        address_location = f"POINT ({point.x} {point.y})"
        metro_dict = await miniapp_db_fcn.find_nearest_station(point=address_location, city_id=city_id, session=session)
        resp, address_numerator = await add_or_create(metro=metro_dict, resp=resp, address_numerator=address_numerator, address_id=address_id)
    return {"status": "success",
            "partner_by_metro": resp}     

@router.get("/partner_masters_by_station", response_model=MasterPageResponse)
async def get_partner_near_concrete_station(request: AddressListRequest,
                                            session: AsyncSession = Depends(get_db_session)):
    addresses = request.addresses
    master_ids = []
    for address in addresses:
        master_ids.append(address.master_id)
    master_ids = list(set(master_ids))
    resp = []
    for master_id in master_ids:
        master = await miniapp_db_fcn.get_master(master_id=master_id, session=session)
        average, rates = await miniapp_db_fcn.get_rating(master_id=master_id, session=session)
        resp.append({"id": master_id,
                    "name": master.full_name,
                    "avatar": f"{s3_domain}{master.avatar}",
                    "rating": average,
                    "rates": rates,
                    "partner": True})
    if len(resp)==0:
        return {"status": "empty"}
    return {"status": "success",
            "masters": resp}