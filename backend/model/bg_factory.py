import os
from enum import Enum

from celery import Celery

from backend.model import pricelist

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

class TaskType(Enum):
    PRICELIST_MANAGING =1

@factory.task(bind=True, max_retries=5)
def task_manager(self, data: dict):
    try:
        ai_task = data["ai_task"]
        if ai_task == TaskType.PRICELIST_MANAGING.value:
            result = pricelist.run_sync(request=data["data"])
        
        return result
    except Exception as e:
        raise self.retry(exc=e, countdown=5)
