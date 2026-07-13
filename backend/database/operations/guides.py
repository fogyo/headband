import uuid
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.util import await_only

from backend.database import MasterCategoryModel, GuidesModel, GuideTextStepModel, GuideVideoStepModel, GuideStatModel, \
    miniapp_db_fcn
from backend.database.obj_storage import s3_domain


async def get_guides(master_id: uuid.UUID, session: AsyncSession):
    """Получение гайдов по категориям мастера"""
    category_ids = await MasterCategoryModel.get_categories_by_master(id=master_id, session=session)
    g_fitable = await GuidesModel.get_by_categories(categories=category_ids, session=session)
    g_all = await GuidesModel.get_all(session=session)

    g_fit_resp = []
    g_all_resp = []

    for g in g_fitable:
        stat = await get_stats(guide_id=g.id, session=session)
        g_fit_resp.append({
            "id": g.id,
            "name": g.name,
            "category": g.category.name,
            "video": bool(await GuideVideoStepModel.get_by_guide_id(guide_id=g.id, session=session)),
            "liked": await GuideStatModel.check_like(guide_id=g.id, master_id=master_id, session=session),
            "likes": stat["likes"],
            "views": stat["views"]
        })

    for g in g_all:
        stat = await get_stats(guide_id=g.id, session=session)
        g_all_resp.append({
            "id": g.id,
            "name": g.name,
            "category": g.category.name,
            "video": bool(await GuideVideoStepModel.get_by_guide_id(guide_id=g.id, session=session)),
            "liked": await GuideStatModel.check_like(guide_id=g.id, master_id=master_id, session=session),
            "likes": stat["likes"],
            "views": stat["views"]
        })

    return "success", g_fit_resp, g_all_resp

async def get_text_step(step_id: uuid.UUID, session: AsyncSession):
    return await GuideTextStepModel.get_by_step_id(step_id=step_id, session=session)

async def get_steps(guide_id: uuid.UUID, session: AsyncSession):
    """Получение шагов гайда по ID"""
    steps = await GuideTextStepModel.get_by_guide_id(guide_id=guide_id, session=session)
    steps_resp = [{
        "step_id": s.id,
        "name": s.name,
        "step_num": s.step_num,
        "text": s.text,
        "img_urls": [f"{s3_domain}{u}" for u in s.image_url.split(" ")] if s.image_url != "" else None
    } for s in steps]
    return "success", steps_resp

async def create_step(step_data: List[dict], session: AsyncSession):
    """Создание шага гайда"""
    status = await GuideTextStepModel.create(session=session, data=step_data)
    return status

async def update_step(step_id: uuid.UUID, update_data: dict, session: AsyncSession):
    """Обновление шага гайда"""
    return await GuideTextStepModel.update(session=session, step_id=step_id, update_data=update_data)


async def delete_step(step_id: uuid.UUID, session: AsyncSession):
    """Удаление шага гайда"""
    return await GuideTextStepModel.delete(session=session, step_id=step_id)

async def update_guide(update_data: dict, session: AsyncSession):
    """Обновление гайда мастера"""
    id = update_data.pop("guide_id")
    return await GuidesModel.update(
        session=session,
        id=id,
        update_data=update_data
    )

async def create_guide(request, session: AsyncSession):
    guide_id = await GuidesModel.create(
        session=session,
        data=request
    )
    return guide_id


async def get_video_steps(guide_id: uuid.UUID, session: AsyncSession):
    """Получение видео-шагов гайда по ID"""
    step = await GuideVideoStepModel.get_by_guide_id(guide_id=guide_id, session=session)
    step_resp = {
        "status": "success",
        "step_id": step.id,
        "video_name": step.video_name,
        "description": step.description,
        "video_url": f"{s3_domain}{step.video_file_path}",
        "preview": f"{s3_domain}{step.preview}" if step.preview != None else None
    }
    return step_resp

async def create_video_step(step_data: dict, session: AsyncSession):
    """Создание видео-шага гайда"""
    step_id = await GuideVideoStepModel.create(session=session, data=step_data)
    return "success"

async def update_video_step(step_id: uuid.UUID, update_data: dict, session: AsyncSession):
    """Обновление видео-шага гайда"""
    status = await GuideVideoStepModel.update(session=session, step_id=step_id, update_data=update_data)
    return status

async def delete_video_step(step_id: uuid.UUID, session: AsyncSession):
    """Удаление видео-шага гайда"""
    status = await GuideVideoStepModel.delete(session=session, step_id=step_id)
    return {"status": status}

async def delete_guide(guide_id: uuid.UUID, session: AsyncSession):
    """Удаление видео-шага гайда"""
    return await GuidesModel.delete(guide_id=guide_id, session=session)

async def get_text_from_step(step_num: int, guide_id: uuid.UUID, session: AsyncSession):
    """Получение текста шага"""
    step = await GuideTextStepModel.get_by_num_id(step_num=step_num, guide_id=guide_id, session=session)
    if step:
        return step.text, ""
    else:
        video = await GuideVideoStepModel.get_by_num_id(step_num=step_num, guide_id=guide_id, session=session)
        return video.description, video.video_name

async def get_content_from_step(guide_id: uuid.UUID, session: AsyncSession):
    """Получение контента шага"""
    video = await GuideVideoStepModel.get_by_num_id(guide_id=guide_id, session=session)
    return video.video_file_path

async def add_view(master_id: uuid.UUID, guide_id: uuid.UUID, session: AsyncSession):
    """Добавление записи о просмотре"""
    id = await GuideStatModel.get_by_guide_master(guide_id=guide_id, master_id=master_id, session=session)
    if id == None:
        id = await GuideStatModel.create(data={"master_id": master_id,
                                               "guide_id": guide_id}, session=session)
    return id

async def change_state(master_id: uuid.UUID, guide_id: uuid.UUID, session: AsyncSession):
    """Лайк/дизлайк"""
    id = await GuideStatModel.get_by_guide_master(guide_id=guide_id, master_id=master_id, session=session)
    res = await GuideStatModel.toggle_action(stat_id=id, session=session)
    return res

async def get_liked_guides(master_id: uuid.UUID, session: AsyncSession):
    """Получить отмеченные мастером"""
    return await GuideStatModel.get_by_master_liked(master_id=master_id, session=session)

async def get_author_guides(master_id: uuid.UUID, session: AsyncSession):
    """Получить гайды мастера"""
    return await GuidesModel.get_by_author(author_id=master_id, session=session)

async def get_guide_type(guide_id: uuid.UUID, session: AsyncSession):
    """Получение типов гайдов"""
    status, step_video = await get_video_steps(guide_id=guide_id, session=session)
    if len(step_video) == 0:
        return 0
    else:
        return 1

async def get_stats(guide_id: uuid.UUID, session: AsyncSession):
    """Получение статистики гайда"""
    return await GuideStatModel.get_guide_stats(guide_id=guide_id, session=session)

async def get_guide(guide_id: uuid.UUID, session: AsyncSession):
    """Получение гайда"""
    return await GuidesModel.get_by_id(guide_id=guide_id, session=session)

async def check_like(guide_id: uuid.UUID, master_id: uuid.UUID, session: AsyncSession):
    return await GuideStatModel.check_like(guide_id=guide_id, master_id=master_id, session=session)

async def preuploaded_data(session: AsyncSession, master_id: uuid.UUID):
    return await GuidesModel.preupload_by_master(master_id=master_id, session=session), await GuideStatModel.preupload_liked(master_id=master_id, session=session)

async def pending_guides(session: AsyncSession):
    return await GuidesModel.get_pending_guides(session=session)

async def change_status(session: AsyncSession, guide_id: uuid.UUID, state: int):
    res = await GuidesModel.change_status(session=session, guide_id=guide_id, state=state)
    return res

