import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import miniapp_db_fcn, get_db_session
from backend.database.responses import StatusResponse

#Requests
class MasterNotificationUpdateRequest(BaseModel):
    appointment_notification: Optional[bool] = None
    appointment_cancel_notification: Optional[bool] = None
    appointment_confirm_notification: Optional[bool] = None
    guide_approved_notification: Optional[bool] = None
    subscription_ending_notification: Optional[bool] = None

#Response
class MasterNotificationResponse(BaseModel):
    id: uuid.UUID
    master_id: uuid.UUID
    appointment_notification: bool
    appointment_cancel_notification: bool
    appointment_confirm_notification: bool
    guide_approved_notification: bool
    subscription_ending_notification: bool

class MasterNotificationGetResponse(StatusResponse):
    notification: MasterNotificationResponse

#API
router = APIRouter(
    prefix="/master/profile/notifications",
    tags=["Master.Profile"])


@router.get("/", response_model=MasterNotificationGetResponse)
async def get_master_notifications(
        chat_id: int,
        session: AsyncSession = Depends(get_db_session)
):
    """Получение настроек уведомлений мастера"""
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    status, notification = await miniapp_db_fcn.get_master_notification(
        master_id=master_id,
        session=session
    )

    if status != "success":
        raise HTTPException(status_code=404, detail=status)

    return {
        "status": status,
        "notification": notification
    }


@router.patch("/update", response_model=StatusResponse)
async def update_master_notification(
        chat_id: int,
        request: MasterNotificationUpdateRequest,
        session: AsyncSession = Depends(get_db_session)
):
    """Обновление настроек уведомлений мастера (можно обновлять отдельные поля)"""
    master = await miniapp_db_fcn.get_master_by_chat(chat_id=chat_id, session=session)
    master_id = master.id
    update_data = request.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    status = await miniapp_db_fcn.update_master_notification(
        master_id=master_id,
        update_data=update_data,
        session=session
    )

    if status != "success":
        raise HTTPException(status_code=404, detail=status)

    return {"status": status}