from datetime import date
from enum import Enum
import os
from typing import List, Optional

from fastapi import APIRouter
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db_session, miniapp_db_fcn
from backend.database.responses import StatusResponse

BOT_NAME = os.getenv('BOT_URL')

router = APIRouter(
    prefix="/admins/control",
    tags=["Admin.Control"]
)

class Level(Enum):
    BASE = 1
    PARTNER = 2

class LinkCreationResponse(StatusResponse):
    link: str

class Link(BaseModel):
    link: str
    level: int
    created: date
    activation: int  

class LinksHistoryResponse(StatusResponse):
    links: Optional[List[Link]] = None

class AdminListResponse(StatusResponse):
    admins: List[int]

@router.post("/create_unique_link", response_model=LinkCreationResponse)
async def generate_link(chat_id: int,
                        level: int,
                        session: AsyncSession = Depends(get_db_session)):
    admin = await miniapp_db_fcn.get_admin_by_id(chat_id=chat_id, session=session)
    if admin.creator:
        link = await miniapp_db_fcn.generate_link_free_month(level=level, session=session)
        return {"status": "success",
                "link": f"{BOT_NAME}?start={link}"}
    return {"status": "no rights",
                "link": ""}


@router.get("/get_links", response_model=LinksHistoryResponse)
async def get_history_of_links(session: AsyncSession = Depends(get_db_session)):
    links = await miniapp_db_fcn.get_all_links(session=session)
    if len(links) == 0:
        return {"status": "success"}
    resp = []
    for link in links:
        resp.append({"link": f"{BOT_NAME}?start={link.id}",
                    "level": link.level,
                    "created": link.created_at,
                    "activation": link.status})
    return {"status": "success",
            "links": resp}

@router.patch("/increase_tokens", response_model=StatusResponse)
async def increase_tokens(chat_id: int,
                          chat_id_to_give: int, 
                          amount: int,
                          type_token: int,
                        session: AsyncSession = Depends(get_db_session)):
    admin = await miniapp_db_fcn.get_admin_by_id(chat_id=chat_id, session=session)
    if admin.creator:
        if type_token == 1:
            await miniapp_db_fcn.increase_tokens(session=session, chat_id=chat_id_to_give, amount=amount)
            return {"status": "success"}
        elif type_token == 2:
            await miniapp_db_fcn.increase_super_tokens(session=session, chat_id=chat_id_to_give, amount=amount)
            return {"status": "success"}
        return {"status": "unpredictable error"}
    return {"status": "no rights to do it"}

@router.post("/create_admin", response_model=StatusResponse)
async def create_admin(chat_id: int,
                       chat_id_of_new_admin: int,
                       session: AsyncSession = Depends(get_db_session)):
    admin = await miniapp_db_fcn.get_admin_by_id(chat_id=chat_id, session=session)
    if admin.creator:
        await miniapp_db_fcn.create_admin(chat_id=chat_id_of_new_admin, password=os.getenv("PASSWORD"), session=session)
        return {"status": "success"}
    return {"status": "no rights to do it"}

@router.delete("/delete_admin", response_model=StatusResponse)
async def delete_admin(chat_id: int,
                       chat_id_of_del_admin: int,
                       session: AsyncSession = Depends(get_db_session)):
    admin = await miniapp_db_fcn.get_admin_by_id(chat_id=chat_id, session=session)
    if admin.creator:
        await miniapp_db_fcn.delete_admin(chat_id=chat_id_of_del_admin, session=session)
        return {"status": "success"}
    return {"status": "no rights to do it"}

@router.get("/list_of_admins", response_model=AdminListResponse)
async def get_list(session: AsyncSession = Depends(get_db_session)):
    admins = await miniapp_db_fcn.get_all_admins(session=session)
    resp = []
    for admin in admins:
        resp.append(admin.chat_id)
    return {"status": "success",
            "admins": resp}