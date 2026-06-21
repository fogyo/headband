from backend.api.headbeauty import haircuts
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

async def create_haircut_template():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            for cut in haircuts["mens_haircuts"]:
                cut["gender"] = False
                await miniapp_db_fcn.create_cut_template(data=cut, session=session)
            for cut in haircuts["womens_haircuts"]:
                cut["gender"] = True
                await miniapp_db_fcn.create_cut_template(data=cut, session=session)