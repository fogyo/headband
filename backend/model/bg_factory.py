import os
from enum import Enum

from celery import Celery
from celery.bin.result import result

from backend.model import pricelist, analyzer, hair_recommender, face_hair_recommender, color_recommender, previewer

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
