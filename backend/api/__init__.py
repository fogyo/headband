from backend.database import miniapp_db_fcn, AsyncSessionLocal

CategoryList = ["Стрижка волос", "Стрижка бороды", "Окрашивание", "Косметология и Skincare", "Маникюр", "Педикюр", "Брови", "Ресницы", "Депиляция", "Эпиляция", "Makeup", "Солярий", "Массажи и SPA", "Консультации", "Другое"]

async def create_categories():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            for cat in CategoryList:
                await miniapp_db_fcn.create_category(name=cat, session=session)

