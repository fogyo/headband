from backend.api.headbeauty import haircuts, face_hair, hair_colors, perms
from backend.database import miniapp_db_fcn, AsyncSessionLocal


CategoryList = [{"name": "Стрижки",
                    "parental_name": "hairdressing",
                 "eng_name": "haircut"},
                {"name": "Борода и усы",
                    "parental_name": "hairdressing",
                 "eng_name": "barber"},
                {"name": "Окрашивание",
                    "parental_name": "hairdressing",
                 "eng_name": "coloring"},
                {"name": "Завивки",
                    "parental_name": "hairdressing",
                 "eng_name": "perms"},
                {"name": "Косметология и Skincare",
                    "parental_name": "cosmetology",
                 "eng_name": "cosmetology & skincare"},
                {"name": "Маникюр",
                    "parental_name": "nails",
                 "eng_name": "manicure"},
                {"name": "Педикюр",
                    "parental_name": "nails",
                 "eng_name": "pedicure"},
                {"name": "Брови",
                    "parental_name": "brows-lashes",
                 "eng_name": "brows"},
                {"name": "Ресницы",
                    "parental_name": "brows-lashes",
                 "eng_name": "lashes"},
                {"name": "Депиляция",
                    "parental_name": "epilation",
                 "eng_name": "depilation"},
                {"name": "Эпиляция",
                    "parental_name": "epilation",
                 "eng_name": "epilation"},
                {"name": "Makeup",
                    "parental_name": "makeup",
                 "eng_name": "makeup"},
                {"name":  "Солярий",
                    "parental_name": "solarium",
                 "eng_name": "solarium"},
                {"name": "Массажи и SPA",
                    "parental_name": "massage-spa",
                 "eng_name": "massage & SPA"},
                {"name": "Консультации",
                    "parental_name": "consultations",
                 "eng_name": "consultation"},
                {"name": "Другое",
                    "parental_name": "other",
                 "eng_name": "other"}]

admin = {"chat_id": 980609742,
         "password": "d22877a5c696fd3b181eb59717956273057490e5ca0413aa42d6910c3e935244"}

async def create_admin():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            admin = await miniapp_db_fcn.check_admin(chat_id=980609742, session=session)
            if not admin:
                await miniapp_db_fcn.create_admin(chat_id=admin["chat_id"], password=admin["password"], session=session)

async def create_categories():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            cats = await miniapp_db_fcn.check_data_categories(session=session)
            if not cats:
                for cat in CategoryList:
                    await miniapp_db_fcn.create_category(name=cat["name"], parental=cat["parental_name"], eng_name=cat["eng_name"], session=session)

async def delete_all_categories():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            cats = await miniapp_db_fcn.get_all_categories(session=session)
            for cat in cats:
                await miniapp_db_fcn.delete_category(category_id=cat["id"], session=session)

async def create_haircut_template():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            ready_haircuts = await miniapp_db_fcn.get_all_haircuts(session=session)
            if len(ready_haircuts)==0:
                for cut in haircuts["mens_haircuts"]:
                    cut["gender"] = False
                    await miniapp_db_fcn.create_cut_template(data=cut, session=session)
                for cut in haircuts["womens_haircuts"]:
                    cut["gender"] = True
                    await miniapp_db_fcn.create_cut_template(data=cut, session=session)

async def create_beards_template():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            beards = await miniapp_db_fcn.get_beards(session=session)
            if len(beards) == 0:
                for beard in face_hair["beards"]:
                    await miniapp_db_fcn.create_face_hair_template(data=beard, session=session)
                for mustach in face_hair["mustaches"]:
                    await miniapp_db_fcn.create_face_hair_template(data=mustach, session=session)

async def create_hair_colors_template():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            colors = await miniapp_db_fcn.get_colors(session=session)
            if len(colors) == 0:
                for color in hair_colors:
                    await miniapp_db_fcn.create_color_template(data=color, session=session)

async def create_hair_perms_template():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            perms = await miniapp_db_fcn.get_perms(session=session)
            if len(perms) == 0:
                for perm in perms:
                    await miniapp_db_fcn.create_perm_template(data=perm, session=session)
