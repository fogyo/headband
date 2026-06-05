from backend.database import miniapp_db_fcn, AsyncSessionLocal

CategoryList = ["Стрижки", "Борода и усы", "Окрашивание", "Косметология и Skincare", "Маникюр", "Педикюр", "Брови", "Ресницы", "Депиляция", "Эпиляция", "Makeup", "Солярий", "Массажи и SPA", "Консультации", "Другое"]

async def create_categories():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            for cat in CategoryList:
                await miniapp_db_fcn.create_category(name=cat, session=session)

async def delete_all_categories():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            cats = await miniapp_db_fcn.get_all_categories(session=session)
            for cat in cats:
                await miniapp_db_fcn.delete_category(category_id=cat["id"], session=session)