import logging
import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import MasterNotificationModel, MasterModel, AppointmentModel, GuidesModel


async def create_master_notification(
        master_id: uuid.UUID,
        session: AsyncSession
):
    """Создание настроек уведомлений для мастера"""
    return await MasterNotificationModel.create(session=session, master_id=master_id)


async def get_master_notification(
        master_id: uuid.UUID,
        session: AsyncSession
):
    """Получение настроек уведомлений мастера"""
    notification = await MasterNotificationModel.get_by_master_id(
        session=session,
        master_id=master_id
    )

    if not notification:
        return "notification not found", None

    resp = {
        "id": notification.id,
        "master_id": notification.master_id,
        "appointment_notification": notification.appointment_notification,
        "appointment_cancel_notification": notification.appointment_cancel_notification,
        "appointment_confirm_notification": notification.appointment_confirm_notification,
        "guide_approved_notification": notification.guide_approved_notification,
        "subscription_ending_notification": notification.subscription_ending_notification
    }

    return "success", resp


async def update_master_notification(
        master_id: uuid.UUID,
        update_data: dict,
        session: AsyncSession
):
    """Обновление настроек уведомлений мастера"""
    return await MasterNotificationModel.update(
        session=session,
        master_id=master_id,
        update_data=update_data
    )


