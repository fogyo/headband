import shutil
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession


from backend.database import get_db_session, miniapp_db_fcn
from backend.database.responses import StatusResponse
from backend.database.obj_storage import s3_domain


#Responses
class CategoryResponse(StatusResponse):
    categories: List[str]

class WorkFile(BaseModel):
    name: str
    filepath: str

class WorkFileResp(WorkFile):
    id: uuid.UUID

class WorkFilesResponse(StatusResponse):
    files: Optional[List[WorkFileResp]] = None

#API
router = APIRouter(
    prefix="/master/profile/works",
    tags=["Master.Profile"])



@router.post("/upload_work_file", response_model=StatusResponse)
async def upload_and_link_image(
    chat_id: int,
    request: WorkFile,
    session: AsyncSession = Depends(get_db_session)
):
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session) 
    await miniapp_db_fcn.create_workfile(filepath=request.filepath, master_id=master.id, name=requets.name, session=session)
    return {"status": "success"}

@router.get("/", response_model=CategoryResponse)
async def get_images(
        chat_id: int,
        session: AsyncSession = Depends(get_db_session)
        ):
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session) 
    files = await miniapp_db_fcn.get_by_master(master_id=master.id, session=session)
    resp = []
    for f in files:
        resp.append({"id": f.id,
                     "name": f.name,
                     "filepath": f"{s3_domain}{f.filepath}"})
    return {"status": "success",
            "files": resp}

@router.delete("/delete_file", response_model=StatusResponse)
async def delete_file(file_id: uuid.UUID,
                      session: AsyncSession = Depends(get_db_session)
        ):
    status = await miniapp_db_fcn.delete_file_from_works(file_id=file_id, session=session)
    return {"status": status}