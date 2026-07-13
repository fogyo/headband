from backend.api.headbeauty import haircuts, face_hair, hair_colors, perms
from backend.database import miniapp_db_fcn, AsyncSessionLocal


CategoryList = [{"name": "Стрижки",
                    "parental_name": "Парикмахерские услуги"},
                {"name": "Борода и усы",
                    "parental_name": "Парикмахерские услуги"},
                {"name": "Окрашивание",
                    "parental_name": "Парикмахерские услуги"},
                {"name": "Косметология и Skincare",
                    "parental_name": "Косметология, Skincare"},
                {"name": "Маникюр",
                    "parental_name": "Маникюр, педикюр"},
                {"name": "Педикюр",
                    "parental_name": "Маникюр, педикюр"},
                {"name": "Брови",
                    "parental_name": "Брови, ресницы"},
                {"name": "Ресницы",
                    "parental_name": "Брови, ресницы"},
                {"name": "Депиляция",
                    "parental_name": "Депиляция, эпиляция"},
                {"name": "Эпиляция",
                    "parental_name": "Депиляция, эпиляция"},
                {"name": "Makeup",
                    "parental_name": "Makeup"},
                {"name":  "Солярий",
                    "parental_name": "Солярий"},
                {"name": "Массажи и SPA",
                    "parental_name": "Массажи, SPA"},
                {"name": "Консультации",
                    "parental_name": "Консультации"},
                {"name": "Другое",
                    "parental_name": "Другое"}]

async def create_categories():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            for cat in CategoryList:
                await miniapp_db_fcn.create_category(name=cat["name"], parental=cat["parental_name"], session=session)

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

async def create_beards_template():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            for beard in face_hair["beards"]:
                await miniapp_db_fcn.create_face_hair_template(data=beard, session=session)
            for mustach in face_hair["mustaches"]:
                await miniapp_db_fcn.create_face_hair_template(data=mustach, session=session)

async def create_hair_colors_template():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            for color in hair_colors:
                await miniapp_db_fcn.create_color_template(data=color, session=session)

async def create_hair_perms_template():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            for perm in perms:
                await miniapp_db_fcn.create_perm_template(data=perm, session=session)
