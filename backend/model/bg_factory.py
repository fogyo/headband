import asyncio
import logging
import os
from datetime import date, timedelta
from enum import Enum
from typing import List

from celery import Celery
from celery.schedules import crontab


from backend.database import miniapp_db_fcn, SubLevel
from backend.model import pricelist, analyzer, hair_recommender, face_hair_recommender, color_recommender, previewer, \
    SyncSessionLocal
from backend.telegram_bot.bot_main import notify_all

broker = os.getenv("BROKER")

factory = Celery('headband', broker=broker, backend=broker)
factory.conf.update(
    task_time_limit=60,
    task_soft_time_limit=55,
    result_expires=3600,
    task_track_started=True,
    task_default_max_retries=3,
    task_default_retry_delay=5,
)
factory.conf.timezone = 'Europe/Moscow'

factory.conf.beat_schedule = {
    'check-subscriptions-daily': {
        'task': 'backend.model.bg_factory.check_subs',
        'schedule': crontab(minute=0, hour=19),
        'args': (),
    },
    'notify_users': {
        'task': 'backend.model.bg_factory.notify_users',
        'schedule': crontab(minute=0, hour=19),
        'args': (),
    },
    'confirm_reminding': {
        'task': 'backend.model.bg_factory.master_confirm_notification',
        'schedule': crontab(minute=0, hour=20),
        'args': (),
    }
}


class TaskType(Enum):
    PRICELIST_MANAGING = 1
    FACE_PARAMS_ANALYZE = 2
    HAIR_RECOMMENDATIONS = 3
    FACE_HAIR_RECOMMENDATIONS = 4
    COLOR_RECOMMENDATIONS = 5
    PREVIEWING = 6

@factory.task(bind=True, max_retries=5)
def task_manager(self, data: dict):
    try:
        ai_task = data["ai_task"]
        if ai_task == TaskType.PRICELIST_MANAGING.value:
            result = pricelist.run_sync(request=data["data"])
        elif ai_task == TaskType.FACE_PARAMS_ANALYZE.value:
            result = analyzer.run_sync(request=data["data"])
        elif ai_task == TaskType.HAIR_RECOMMENDATIONS.value:
            result = hair_recommender.run_sync(request=data["data"])
        elif ai_task == TaskType.FACE_HAIR_RECOMMENDATIONS.value:
            result = face_hair_recommender.run_sync(request=data["data"])
        elif ai_task == TaskType.COLOR_RECOMMENDATIONS.value:
            result = color_recommender.run_sync(request=data["data"])
        elif ai_task == TaskType.PREVIEWING.value:
            result = previewer.run_sync(request=data["data"], cfg=data["config_data"])
        return result
    except Exception as e:
        raise self.retry(exc=e, countdown=5)

@factory.task
def notify_users():
    with SyncSessionLocal() as session:
        users = miniapp_db_fcn.get_all_users_with_tommorrow_appointments(session=session)
        messages = []
        for chat_id in users:
            messages.append({"chat_id": chat_id,
                             "text": "❗ Сообщение системы headband:\n\nНапоминаем, что вы записаны на завтрашнее число. Уточнить детали и связаться с мастером Вы сможете в нашем mini app в карточке записи\n\nС уважением,\nкоманда headband"})
        asyncio.run(notify_all(messages=messages, session=session))
        session.commit()
        logging.info(f"NOTIFIED {len(messages)} users")

@factory.task
def check_subs():
    with SyncSessionLocal() as session:
        masters = miniapp_db_fcn.get_expiring_masters(session=session)
        messages = []
        for master in masters:
            if master.subscription.end_date == date.today() and master.notifications.subscription_ending_notification:
                #Последний день
                if master.subscription_bank.stop_sub:
                    #Остановки подписки
                    messages.append({"chat_id": master.chat_id_tg,
                                     "text": "❗ Сообщение системы headband:\n\nЗавтра в 00:00 Ваша подписка истекает. Вы указали, что продлевать не будете. \n\nЕсли Вы передумали, то Вы легко можете установить автоматическое продление в Платежи->Подписки!"})
                else:
                    #Продление подписки
                    level = master.subscription.level
                    if master.subscription_bank.change_level:
                        if level==SubLevel.HEADBAND_BASE.value:
                            partner_sub_amount = master.subscription_bank.partner_sub
                            if partner_sub_amount==0:
                                messages.append({"chat_id": master.chat_id_tg,
                                                 "text": "❗ Сообщение системы headband:\n\nСегодня в 23:59 подписка истекает. Вы указали, что хотите сменить уровень на партнерский, но на Вашем счету на данный момент нет партнерских подписок.\n\nВы легко можете продлить свою подписку в Платежи->Подписки!"})
                            else:
                                messages.append({"chat_id": master.chat_id_tg,
                                                 "text": f"❗ Сообщение системы headband:\n\nСегодня в 23:59 подписка истекает. Вы указали, что хотите сменить уровень на партнерский.\n\nКоличество оставшихся у Вас партнерских подписок: {partner_sub_amount}. \n\nВ 00:00 завтра подписка автоматически продлится!"})
                        else:
                            base_sub_amount = master.subscription_bank.base_sub
                            if base_sub_amount==0:
                                messages.append({"chat_id": master.chat_id_tg,
                                                 "text": "❗ Сообщение системы headband:\n\nСегодня в 23:59 подписка истекает. Вы указали, что хотите сменить уровень на базовый, но на Вашем счету на данный момент нет базовых подписок. \n\nВы легко можете продлить свою подписку в Платежи->Подписки!"})
                            else:
                                messages.append({"chat_id": master.chat_id_tg,
                                                "text": f"❗ Сообщение системы headband:\n\nСегодня в 23:59 подписка истекает. Вы указали, что хотите сменить уровень на базовый.\n\nКоличество оставшихся у Вас базовых подписок: {base_sub_amount}. \n\nВ 00:00 завтра подписка автоматически продлится!"})
                    else:
                        if level==SubLevel.HEADBAND_BASE.value:
                            base_sub_amount = master.subscription_bank.base_sub
                            if base_sub_amount == 0:
                                messages.append({"chat_id": master.chat_id_tg,
                                                 "text": "❗ Сообщение системы headband:\n\nСегодня в 23:59 подписка истекает. Вы тарифицируетесь в соответствии с базовым уровнем, но на Вашем счету на данный момент нет базовых подписок. \n\nВы легко можете продлить свою подписку в Платежи->Подписки!"})
                            else:
                                messages.append({"chat_id": master.chat_id_tg,
                                                 "text": f"❗ Сообщение системы headband:\n\nСегодня в 23:59 подписка истекает. Вы тарифицируетесь в соответствии с базовым уровнем.\n\nКоличество оставшихся у Вас базовых подписок: {base_sub_amount}. \n\nВ 00:00 завтра подписка автоматически продлится!"})
                        else:
                            partner_sub_amount = master.subscription_bank.partner_sub
                            if partner_sub_amount==0:
                                messages.append({"chat_id": master.chat_id_tg,
                                                 "text": "❗ Сообщение системы headband:\n\nСегодня в 23:59 подписка истекает. Вы тарифицируетесь в соответствии с партнерским уровнем, но на Вашем счету на данный момент нет партнерских подписок. \n\nВы легко можете продлить свою подписку в Платежи->Подписки!"})
                            else:
                                messages.append({"chat_id": master.chat_id_tg,
                                                 "text": f"❗ Сообщение системы headband:\n\nСегодня в 23:59 подписка истекает. Вы тарифицируетесь в соответствии с партнерским уровнем.\n\nКоличество оставшихся у Вас партнерских подписок: {partner_sub_amount}. \n\nВ 00:00 завтра подписка автоматически продлится!"})
            elif (master.subscription.end_date+timedelta(days=1)) == date.today() and master.notifications.subscription_ending_notification:
                if master.subscription_bank.stop_sub:
                    #Остановки подписки
                    messages.append({"chat_id": master.chat_id_tg,
                                     "text": "❗ Сообщение системы headband:\n\nВаша подписка истекла.\n\nВы указали, что продлевать не будете, Но Вы в любой момент можете опять активировать headband в Платежи->Подписки.\n\nСпасибо, что были с нами!\nС уважением,\nКоманда headband"})
                else:
                    #Продление подписки
                    level = master.subscription.level
                    if master.subscription_bank.change_level:
                        if level==SubLevel.HEADBAND_BASE.value:
                            partner_sub_amount = master.subscription_bank.partner_sub
                            if partner_sub_amount==0:
                                messages.append({"chat_id": master.chat_id_tg,
                                                 "text": "❗ Сообщение системы headband:\n\nВаша подписка истекла. Вы указали, что хотите сменить уровень на партнерский, но на Вашем счету на данный момент нет партнерских подписок. \n\nВы легко можете продлить свою подписку в Платежи->Подписки!"})
                            else:
                                end_date = miniapp_db_fcn.extend_subscription_sync(master_id=master.id, sub_id=master.subscription.id, duration_days=30,
                                                                         level=SubLevel.HEADBAND_PARTNER.value, session=session)

                                messages.append({"chat_id": master.chat_id_tg,
                                                 "text": f"❗ Сообщение системы headband:\n\nВаша подписка была автоматически продлена в соответствии с партнерским уровнем до {end_date}.\n\nСпасибо, что остаетесь с headband!"})
                        else:
                            base_sub_amount = master.subscription_bank.base_sub
                            if base_sub_amount==0:
                                messages.append({"chat_id": master.chat_id_tg,
                                                 "text": "❗ Сообщение системы headband:\n\nВаша подписка истекла. Вы указали, что хотите сменить уровень на базовый, но на Вашем счету на данный момент нет базовых подписок. \n\nВы легко можете продлить свою подписку в Платежи->Подписки!"})
                            else:
                                end_date = miniapp_db_fcn.extend_subscription_sync(master_id=master.id,
                                                                                   sub_id=master.subscription.id,
                                                                                   duration_days=30,
                                                                                   level=SubLevel.HEADBAND_BASE.value, session=session)
                                messages.append({"chat_id": master.chat_id_tg,
                                                 "text": f"❗ Сообщение системы headband:\n\nВаша подписка была автоматически продлена в соответствии с базовым уровнем до {end_date}.\n\nСпасибо, что остаетесь с headband!"})

                    else:
                        if level==SubLevel.HEADBAND_BASE.value:
                            base_sub_amount = master.subscription_bank.base_sub
                            if base_sub_amount == 0:
                                messages.append({"chat_id": master.chat_id_tg,
                                                 "text": "❗ Сообщение системы headband:\n\nВаша подписка истекла. На Вашем счету на данный момент нет базовых подписок. \n\nВы легко можете продлить свою подписку в Платежи->Подписки!"})
                            else:
                                end_date = miniapp_db_fcn.extend_subscription_sync(master_id=master.id,
                                                                                   sub_id=master.subscription.id,
                                                                                   duration_days=30,
                                                                                   level=level, session=session)
                                messages.append({"chat_id": master.chat_id_tg,
                                                 "text": f"❗ Сообщение системы headband:\n\nВаша подписка была автоматически продлена в соответствии с базовым уровнем до {end_date}.\n\nСпасибо, что остаетесь с headband!"})
                        else:
                            partner_sub_amount = master.subscription_bank.partner_sub
                            if partner_sub_amount == 0:
                                messages.append({"chat_id": master.chat_id_tg,
                                                 "text": "❗ Сообщение системы headband:\n\nВаша подписка истекла. На Вашем счету на данный момент нет партнерских подписок. \n\nВы легко можете продлить свою подписку в Платежи->Подписки!"})
                            else:
                                end_date = miniapp_db_fcn.extend_subscription_sync(master_id=master.id,
                                                                                   sub_id=master.subscription.id,
                                                                                   duration_days=30,
                                                                                   level=level, session=session)

                                messages.append({"chat_id": master.chat_id_tg,
                                                 "text": f"❗ Сообщение системы headband:\n\nВаша подписка была автоматически продлена в соответствии с партнерским уровнем до {end_date}.\n\nСпасибо, что остаетесь с headband!"})

        asyncio.run(notify_all(messages=messages, session=session))
        session.commit()
        logging.info(f"NOTIFIED {len(messages)} users")

@factory.task
def master_confirm_notification():
    
    with SyncSessionLocal() as session:
        masters = miniapp_db_fcn.get_masters_to_confirm_appointments(session=session)
        messages = []
        for master in masters:
            if master.notifications.appointment_confirm_notification:
                messages.append({"chat_id": master.chat_id_tg,
                                 "text": "❗ Сообщение системы headband:\n\nУ вас есть неподтвержденные записи\n\nПодтвердите их! Это позволит пользователям оценить Вашу работу, а также поможет Вам отслеживать свои доходы\n\nЭто можно сделать в MiniApp->Профиль->Доходы"})
        asyncio.run(notify_all(messages=messages, session=session))
        logging.info(f"NOTIFIED {len(messages)} users")


