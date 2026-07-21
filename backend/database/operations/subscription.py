import logging
import uuid
from datetime import date, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import SubscriptionModel, MasterModel, MasterReferralModel, SubLevel, SubscriptionBankModel


async def create_subscription(
        master_id: uuid.UUID,
        duration_days: int,
        level: int,
        session: AsyncSession
):
    """
    Создание/продление подписки для мастера.
    Возвращает: (status, subscription_id, is_referral_counted)
    """
    try:
        start_date = date.today()

        existing = await SubscriptionModel.get_by_master_id(
            session=session,
            master_id=master_id
        )

        if existing:
            if existing.end_date > start_date:
                end_date = existing.end_date + timedelta(days=duration_days)
            else:
                end_date = start_date + timedelta(days=duration_days)
            update_data = {
                "end_date": end_date,
                "level": level
            }
            await SubscriptionModel.update(
                session=session,
                subscription_id=existing.id,
                update_data=update_data
            )
        else:
            end_date = start_date + timedelta(days=duration_days)
            data = {
                "master_id": master_id,
                "start_date": start_date,
                "end_date": end_date,
                "level": level
            }
            await SubscriptionModel.create(session=session, data=data)
            referrer_id = await MasterModel.get_referrer_id(
                session=session,
                master_id=master_id
            )
            if 1<=level<=2:
                if referrer_id:
                    master = await MasterModel.get_by_id(session=session, master_id=master_id)
                    if master and not master.referral_counted:
                        # Засчитываем реферал
                        await MasterReferralModel.increment_masters(
                            session=session,
                            master_id=referrer_id
                        )

                        # Отмечаем, что реферал засчитан
                        await MasterModel.mark_referral_counted(
                            session=session,
                            master_id=master_id
                        )

            #todo для юзера
        return "success"
    except Exception as e:
        logging.error(f"Ошибка создания подписки: {e}")
        return f"error: {str(e)}", uuid.UUID(int=0)

def extend_subscription_sync(
        master_id: uuid.UUID,
        sub_id: uuid.UUID,
        duration_days: int,
        level: int,
        session
):
    end_date = date.today()+timedelta(days=duration_days)
    update_data = {"end_date": end_date,
                   "level": level}
    SubscriptionModel.update_sync(session=session, subscription_id=sub_id, update_data=update_data)
    if level==1:
        SubscriptionBankModel.decrease_base_sub_sync(session=session, master_id=master_id)
    else:
        SubscriptionBankModel.decrease_partner_sub_sync(session=session, master_id=master_id)
    return end_date


async def get_subscription_level(
        master_id: uuid.UUID,
        session: AsyncSession
):
    """Проверка статуса подписки"""
    subscription = await SubscriptionModel.get_by_master_id(
        session=session,
        master_id=master_id
    )

    if not subscription:
        return False, None, "no sub"

    if subscription.end_date < date.today():
        return False, subscription.end_date, subscription.level

    return True, subscription.end_date, subscription.level
