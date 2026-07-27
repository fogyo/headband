import os

from backend.api.headbeauty import haircuts, face_hair, hair_colors, perms
from backend.database import miniapp_db_fcn, AsyncSessionLocal


CategoryList = [
    {"name": "Стрижки",
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
     "eng_name": "other"}
]

cities_templates = [
    {"location": f"POINT({30.3141} {59.9386})",
     "city": "Санкт-Петербург"},
    {"location": f"POINT({37.6173} {55.7558})",
     "city": "Москва"}
    ]

metro_spb_template = [
  {
    "name": "Девяткино",
    "hex": "#D6083B",
    "location": "POINT(30.4431 60.0515)"
  },
  {
    "name": "Гражданский проспект",
    "hex": "#D6083B",
    "location": "POINT(30.4183 60.0350)"
  },
  {
    "name": "Академическая",
    "hex": "#D6083B",
    "location": "POINT(30.3961 60.0128)"
  },
  {
    "name": "Политехническая",
    "hex": "#D6083B",
    "location": "POINT(30.3708 60.0089)"
  },
  {
    "name": "Площадь Мужества",
    "hex": "#D6083B",
    "location": "POINT(30.3658 59.9997)"
  },
  {
    "name": "Лесная",
    "hex": "#D6083B",
    "location": "POINT(30.3422 59.9848)"
  },
  {
    "name": "Выборгская",
    "hex": "#D6083B",
    "location": "POINT(30.3475 59.9711)"
  },
  {
    "name": "Площадь Ленина",
    "hex": "#D6083B",
    "location": "POINT(30.3556 59.9558)"
  },
  {
    "name": "Чернышевская",
    "hex": "#D6083B",
    "location": "POINT(30.3597 59.9445)"
  },
  {
    "name": "Площадь Восстания",
    "hex": "#D6083B",
    "location": "POINT(30.3606 59.9316)"
  },
  {
    "name": "Владимирская",
    "hex": "#D6083B",
    "location": "POINT(30.3483 59.9274)"
  },
  {
    "name": "Пушкинская",
    "hex": "#D6083B",
    "location": "POINT(30.3297 59.9206)"
  },
  {
    "name": "Технологический институт 1",
    "hex": "#D6083B",
    "location": "POINT(30.3184 59.9166)"
  },
  {
    "name": "Балтийская",
    "hex": "#D6083B",
    "location": "POINT(30.2997 59.9072)"
  },
  {
    "name": "Нарвская",
    "hex": "#D6083B",
    "location": "POINT(30.2783 59.9011)"
  },
  {
    "name": "Кировский завод",
    "hex": "#D6083B",
    "location": "POINT(30.2619 59.8797)"
  },
  {
    "name": "Автово",
    "hex": "#D6083B",
    "location": "POINT(30.2614 59.8673)"
  },
  {
    "name": "Ленинский проспект",
    "hex": "#D6083B",
    "location": "POINT(30.2683 59.8516)"
  },
  {
    "name": "Проспект Ветеранов",
    "hex": "#D6083B",
    "location": "POINT(30.2552 59.8416)"
  },
  {
    "name": "Парнас",
    "hex": "#0072C6",
    "location": "POINT(30.3338 60.0669)"
  },
  {
    "name": "Проспект Просвещения",
    "hex": "#0072C6",
    "location": "POINT(30.3326 60.0515)"
  },
  {
    "name": "Озерки",
    "hex": "#0072C6",
    "location": "POINT(30.3217 60.0372)"
  },
  {
    "name": "Удельная",
    "hex": "#0072C6",
    "location": "POINT(30.3155 60.0167)"
  },
  {
    "name": "Пионерская",
    "hex": "#0072C6",
    "location": "POINT(30.3006 60.0025)"
  },
  {
    "name": "Чёрная речка",
    "hex": "#0072C6",
    "location": "POINT(30.3061 59.9856)"
  },
  {
    "name": "Петроградская",
    "hex": "#0072C6",
    "location": "POINT(30.3114 59.9664)"
  },
  {
    "name": "Горьковская",
    "hex": "#0072C6",
    "location": "POINT(30.3191 59.9561)"
  },
  {
    "name": "Невский проспект",
    "hex": "#0072C6",
    "location": "POINT(30.3294 59.9351)"
  },
  {
    "name": "Сенная площадь",
    "hex": "#0072C6",
    "location": "POINT(30.3184 59.9270)"
  },
  {
    "name": "Технологический институт 2",
    "hex": "#0072C6",
    "location": "POINT(30.3184 59.9166)"
  },
  {
    "name": "Фрунзенская",
    "hex": "#0072C6",
    "location": "POINT(30.3180 59.9061)"
  },
  {
    "name": "Московские ворота",
    "hex": "#0072C6",
    "location": "POINT(30.3178 59.8918)"
  },
  {
    "name": "Электросила",
    "hex": "#0072C6",
    "location": "POINT(30.3186 59.8792)"
  },
  {
    "name": "Парк Победы",
    "hex": "#0072C6",
    "location": "POINT(30.3218 59.8664)"
  },
  {
    "name": "Московская",
    "hex": "#0072C6",
    "location": "POINT(30.3218 59.8514)"
  },
  {
    "name": "Звёздная",
    "hex": "#0072C6",
    "location": "POINT(30.3475 59.8333)"
  },
  {
    "name": "Купчино",
    "hex": "#0072C6",
    "location": "POINT(30.3778 59.8294)"
  },
  {
    "name": "Беговая",
    "hex": "#009A49",
    "location": "POINT(30.2012 59.9871)"
  },
  {
    "name": "Зенит",
    "hex": "#009A49",
    "location": "POINT(30.2226 59.9723)"
  },
  {
    "name": "Приморская",
    "hex": "#009A49",
    "location": "POINT(30.2351 59.9486)"
  },
  {
    "name": "Василеостровская",
    "hex": "#009A49",
    "location": "POINT(30.2783 59.9426)"
  },
  {
    "name": "Гостиный двор",
    "hex": "#009A49",
    "location": "POINT(30.3338 59.9338)"
  },
  {
    "name": "Маяковская",
    "hex": "#009A49",
    "location": "POINT(30.3550 59.9315)"
  },
  {
    "name": "Площадь Александра Невского 1",
    "hex": "#009A49",
    "location": "POINT(30.3853 59.9242)"
  },
  {
    "name": "Елизаровская",
    "hex": "#009A49",
    "location": "POINT(30.4237 59.8967)"
  },
  {
    "name": "Ломоносовская",
    "hex": "#009A49",
    "location": "POINT(30.4439 59.8776)"
  },
  {
    "name": "Пролетарская",
    "hex": "#009A49",
    "location": "POINT(30.4703 59.8653)"
  },
  {
    "name": "Обухово",
    "hex": "#009A49",
    "location": "POINT(30.4575 59.8486)"
  },
  {
    "name": "Рыбацкое",
    "hex": "#009A49",
    "location": "POINT(30.5008 59.8308)"
  },
  {
    "name": "Горный институт",
    "hex": "#EA7125",
    "location": "POINT(30.2781 59.9308)"
  },
  {
    "name": "Спасская",
    "hex": "#EA7125",
    "location": "POINT(30.3197 59.9267)"
  },
  {
    "name": "Достоевская",
    "hex": "#EA7125",
    "location": "POINT(30.3463 59.9282)"
  },
  {
    "name": "Лиговский проспект",
    "hex": "#EA7125",
    "location": "POINT(30.3551 59.9208)"
  },
  {
    "name": "Площадь Александра Невского 2",
    "hex": "#EA7125",
    "location": "POINT(30.3861 59.9236)"
  },
  {
    "name": "Новочеркасская",
    "hex": "#EA7125",
    "location": "POINT(30.4117 59.9292)"
  },
  {
    "name": "Ладожская",
    "hex": "#EA7125",
    "location": "POINT(30.4398 59.9325)"
  },
  {
    "name": "Проспект Большевиков",
    "hex": "#EA7125",
    "location": "POINT(30.4669 59.9197)"
  },
  {
    "name": "Улица Дыбенко",
    "hex": "#EA7125",
    "location": "POINT(30.4839 59.9073)"
  },
  {
    "name": "Комендантский проспект",
    "hex": "#702C8E",
    "location": "POINT(30.2583 60.0086)"
  },
  {
    "name": "Старая Деревня",
    "hex": "#702C8E",
    "location": "POINT(30.2536 59.9894)"
  },
  {
    "name": "Крестовский остров",
    "hex": "#702C8E",
    "location": "POINT(30.2594 59.9719)"
  },
  {
    "name": "Чкаловская",
    "hex": "#702C8E",
    "location": "POINT(30.2917 59.9611)"
  },
  {
    "name": "Спортивная",
    "hex": "#702C8E",
    "location": "POINT(30.2878 59.9522)"
  },
  {
    "name": "Адмиралтейская",
    "hex": "#702C8E",
    "location": "POINT(30.3142 59.9361)"
  },
  {
    "name": "Садовая",
    "hex": "#702C8E",
    "location": "POINT(30.3178 59.9264)"
  },
  {
    "name": "Звенигородская",
    "hex": "#702C8E",
    "location": "POINT(30.3361 59.9214)"
  },
  {
    "name": "Обводный канал",
    "hex": "#702C8E",
    "location": "POINT(30.3486 59.9147)"
  },
  {
    "name": "Волковская",
    "hex": "#702C8E",
    "location": "POINT(30.3575 59.8961)"
  },
  {
    "name": "Бухарестская",
    "hex": "#702C8E",
    "location": "POINT(30.3689 59.8836)"
  },
  {
    "name": "Международная",
    "hex": "#702C8E",
    "location": "POINT(30.3789 59.8703)"
  },
  {
    "name": "Проспект Славы",
    "hex": "#702C8E",
    "location": "POINT(30.3942 59.8572)"
  },
  {
    "name": "Дунайская",
    "hex": "#702C8E",
    "location": "POINT(30.4128 59.8403)"
  },
  {
    "name": "Шушары",
    "hex": "#702C8E",
    "location": "POINT(30.4314 59.8306)"
  }
]

metro_msk_template = [
  {
    "name": "Бульвар Рокоссовского",
    "hex": "#E52B2B",
    "location": "POINT(37.731770 55.815169)"
  },
  {
    "name": "Черкизовская",
    "hex": "#E52B2B",
    "location": "POINT(37.744833 55.803830)"
  },
  {
    "name": "Преображенская площадь",
    "hex": "#E52B2B",
    "location": "POINT(37.714990 55.795560)"
  },
  {
    "name": "Сокольники",
    "hex": "#E52B2B",
    "location": "POINT(37.679850 55.789340)"
  },
  {
    "name": "Красносельская",
    "hex": "#E52B2B",
    "location": "POINT(37.666970 55.780000)"
  },
  {
    "name": "Комсомольская",
    "hex": "#E52B2B",
    "location": "POINT(37.655980 55.774830)"
  },
  {
    "name": "Красные ворота",
    "hex": "#E52B2B",
    "location": "POINT(37.649620 55.769540)"
  },
  {
    "name": "Чистые пруды",
    "hex": "#E52B2B",
    "location": "POINT(37.638960 55.765420)"
  },
  {
    "name": "Лубянка",
    "hex": "#E52B2B",
    "location": "POINT(37.626110 55.759880)"
  },
  {
    "name": "Охотный Ряд",
    "hex": "#E52B2B",
    "location": "POINT(37.617100 55.757530)"
  },
  {
    "name": "Библиотека имени Ленина",
    "hex": "#E52B2B",
    "location": "POINT(37.610000 55.751200)"
  },
  {
    "name": "Кропоткинская",
    "hex": "#E52B2B",
    "location": "POINT(37.603700 55.745300)"
  },
  {
    "name": "Парк культуры",
    "hex": "#E52B2B",
    "location": "POINT(37.594300 55.735600)"
  },
  {
    "name": "Фрунзенская",
    "hex": "#E52B2B",
    "location": "POINT(37.578600 55.726700)"
  },
  {
    "name": "Спортивная",
    "hex": "#E52B2B",
    "location": "POINT(37.563900 55.723300)"
  },
  {
    "name": "Воробьёвы горы",
    "hex": "#E52B2B",
    "location": "POINT(37.559200 55.710300)"
  },
  {
    "name": "Университет",
    "hex": "#E52B2B",
    "location": "POINT(37.533300 55.692600)"
  },
  {
    "name": "Проспект Вернадского",
    "hex": "#E52B2B",
    "location": "POINT(37.506000 55.677100)"
  },
  {
    "name": "Юго-Западная",
    "hex": "#E52B2B",
    "location": "POINT(37.483300 55.663700)"
  },
  {
    "name": "Тропарёво",
    "hex": "#E52B2B",
    "location": "POINT(37.472500 55.645900)"
  },
  {
    "name": "Румянцево",
    "hex": "#E52B2B",
    "location": "POINT(37.441900 55.633000)"
  },
  {
    "name": "Саларьево",
    "hex": "#E52B2B",
    "location": "POINT(37.424200 55.621900)"
  },
  {
    "name": "Филатов Луг",
    "hex": "#E52B2B",
    "location": "POINT(37.407645 55.601367)"
  },
  {
    "name": "Прокшино",
    "hex": "#E52B2B",
    "location": "POINT(37.433802 55.586242)"
  },
  {
    "name": "Ольховая",
    "hex": "#E52B2B",
    "location": "POINT(37.459400 55.568600)"
  },
  {
    "name": "Новомосковская",
    "hex": "#E52B2B",
    "location": "POINT(37.468000 55.560000)"
  },
  {
    "name": "Потапово",
    "hex": "#E52B2B",
    "location": "POINT(37.501350 55.553351)"
  },
{
    "name": "Ховрино",
    "hex": "#44B85C",
    "location": "POINT(37.481493 55.878764)"
  },
  {
    "name": "Беломорская",
    "hex": "#44B85C",
    "location": "POINT(37.476389 55.865833)"
  },
  {
    "name": "Речной вокзал",
    "hex": "#44B85C",
    "location": "POINT(37.476234 55.854895)"
  },
  {
    "name": "Водный стадион",
    "hex": "#44B85C",
    "location": "POINT(37.486394 55.840114)"
  },
  {
    "name": "Войковская",
    "hex": "#44B85C",
    "location": "POINT(37.497500 55.819167)"
  },
  {
    "name": "Сокол",
    "hex": "#44B85C",
    "location": "POINT(37.515278 55.804722)"
  },
  {
    "name": "Аэропорт",
    "hex": "#44B85C",
    "location": "POINT(37.532500 55.800556)"
  },
  {
    "name": "Динамо",
    "hex": "#44B85C",
    "location": "POINT(37.557778 55.791389)"
  },
  {
    "name": "Белорусская",
    "hex": "#44B85C",
    "location": "POINT(37.583611 55.776944)"
  },
  {
    "name": "Маяковская",
    "hex": "#44B85C",
    "location": "POINT(37.595833 55.770000)"
  },
  {
    "name": "Тверская",
    "hex": "#44B85C",
    "location": "POINT(37.605556 55.764722)"
  },
  {
    "name": "Театральная",
    "hex": "#44B85C",
    "location": "POINT(37.618611 55.758611)"
  },
  {
    "name": "Новокузнецкая",
    "hex": "#44B85C",
    "location": "POINT(37.629167 55.741944)"
  },
  {
    "name": "Павелецкая",
    "hex": "#44B85C",
    "location": "POINT(37.637700 55.730500)"
  },
  {
    "name": "Автозаводская",
    "hex": "#44B85C",
    "location": "POINT(37.657222 55.707222)"
  },
  {
    "name": "Технопарк",
    "hex": "#44B85C",
    "location": "POINT(37.664722 55.694444)"
  },
  {
    "name": "Коломенская",
    "hex": "#44B85C",
    "location": "POINT(37.670000 55.678611)"
  },
  {
    "name": "Каширская",
    "hex": "#44B85C",
    "location": "POINT(37.648889 55.655000)"
  },
  {
    "name": "Кантемировская",
    "hex": "#44B85C",
    "location": "POINT(37.656389 55.635833)"
  },
  {
    "name": "Царицыно",
    "hex": "#44B85C",
    "location": "POINT(37.668611 55.621389)"
  },
  {
    "name": "Орехово",
    "hex": "#44B85C",
    "location": "POINT(37.695278 55.613611)"
  },
  {
    "name": "Домодедовская",
    "hex": "#44B85C",
    "location": "POINT(37.718889 55.610833)"
  },
  {
    "name": "Красногвардейская",
    "hex": "#44B85C",
    "location": "POINT(37.744444 55.613056)"
  },
  {
    "name": "Алма-Атинская",
    "hex": "#44B85C",
    "location": "POINT(37.766000 55.632600)"
  },
  {
    "name": "Пятницкое шоссе",
    "hex": "#0078BE",
    "location": "POINT(37.3544 55.8563)"
  },
  {
    "name": "Митино",
    "hex": "#0078BE",
    "location": "POINT(37.3622 55.8457)"
  },
  {
    "name": "Волоколамская",
    "hex": "#0078BE",
    "location": "POINT(37.3822 55.8354)"
  },
  {
    "name": "Мякинино",
    "hex": "#0078BE",
    "location": "POINT(37.3852 55.8252)"
  },
  {
    "name": "Строгино",
    "hex": "#0078BE",
    "location": "POINT(37.4031 55.8038)"
  },
  {
    "name": "Крылатское",
    "hex": "#0078BE",
    "location": "POINT(37.4081 55.7567)"
  },
  {
    "name": "Молодёжная",
    "hex": "#0078BE",
    "location": "POINT(37.4168 55.7408)"
  },
  {
    "name": "Кунцевская",
    "hex": "#0078BE",
    "location": "POINT(37.4459 55.7307)"
  },
  {
    "name": "Славянский бульвар",
    "hex": "#0078BE",
    "location": "POINT(37.4706 55.7296)"
  },
  {
    "name": "Парк Победы",
    "hex": "#0078BE",
    "location": "POINT(37.5182 55.7362)"
  },
  {
    "name": "Киевская",
    "hex": "#0078BE",
    "location": "POINT(37.5655 55.7443)"
  },
  {
    "name": "Смоленская",
    "hex": "#0078BE",
    "location": "POINT(37.5823 55.7474)"
  },
  {
    "name": "Арбатская",
    "hex": "#0078BE",
    "location": "POINT(37.6061 55.7522)"
  },
  {
    "name": "Площадь Революции",
    "hex": "#0078BE",
    "location": "POINT(37.6218 55.7566)"
  },
  {
    "name": "Курская",
    "hex": "#0078BE",
    "location": "POINT(37.6577 55.7576)"
  },
  {
    "name": "Бауманская",
    "hex": "#0078BE",
    "location": "POINT(37.6801 55.7728)"
  },
  {
    "name": "Электрозаводская",
    "hex": "#0078BE",
    "location": "POINT(37.7033 55.7831)"
  },
  {
    "name": "Семёновская",
    "hex": "#0078BE",
    "location": "POINT(37.7192 55.7839)"
  },
  {
    "name": "Партизанская",
    "hex": "#0078BE",
    "location": "POINT(37.7506 55.7883)"
  },
  {
    "name": "Измайловская",
    "hex": "#0078BE",
    "location": "POINT(37.7750 55.7877)"
  },
  {
    "name": "Первомайская",
    "hex": "#0078BE",
    "location": "POINT(37.7988 55.7949)"
  },
  {
    "name": "Щёлковская",
    "hex": "#0078BE",
    "location": "POINT(37.8175 55.8098)"
  },
    {
        "name": "Александровский сад",
        "hex": "#00BFFF",
        "location": "POINT(37.608655 55.752299)"
    },
    {
        "name": "Арбатская",
        "hex": "#00BFFF",
        "location": "POINT(37.600556 55.751944)"
    },
    {
        "name": "Смоленская",
        "hex": "#00BFFF",
        "location": "POINT(37.582500 55.748800)"
    },
    {
        "name": "Киевская",
        "hex": "#00BFFF",
        "location": "POINT(37.565500 55.743600)"
    },
    {
        "name": "Деловой центр",
        "hex": "#00BFFF",
        "location": "POINT(37.534263 55.748311)"
    },
    {
        "name": "Москва-Сити",
        "hex": "#00BFFF",
        "location": "POINT(37.534263 55.748311)"
    },
    {
        "name": "Студенческая",
        "hex": "#00BFFF",
        "location": "POINT(37.548271 55.738918)"
    },
    {
        "name": "Кутузовская",
        "hex": "#00BFFF",
        "location": "POINT(37.534400 55.739900)"
    },
    {
        "name": "Фили",
        "hex": "#00BFFF",
        "location": "POINT(37.515000 55.746000)"
    },
    {
        "name": "Багратионовская",
        "hex": "#00BFFF",
        "location": "POINT(37.497700 55.743800)"
    },
    {
        "name": "Филёвский парк",
        "hex": "#00BFFF",
        "location": "POINT(37.483612 55.739657)"
    },
    {
        "name": "Пионерская",
        "hex": "#00BFFF",
        "location": "POINT(37.467100 55.736000)"
    },
    {
        "name": "Кунцевская",
        "hex": "#00BFFF",
        "location": "POINT(37.446003 55.730791)"
    },
  {
    "name": "Парк культуры",
    "hex": "#8B5A2B",
    "location": "POINT(37.5940 55.7356)"
  },
  {
    "name": "Октябрьская",
    "hex": "#8B5A2B",
    "location": "POINT(37.6111 55.7300)"
  },
  {
    "name": "Добрынинская",
    "hex": "#8B5A2B",
    "location": "POINT(37.6222 55.7283)"
  },
  {
    "name": "Павелецкая",
    "hex": "#8B5A2B",
    "location": "POINT(37.6377 55.7305)"
  },
  {
    "name": "Таганская",
    "hex": "#8B5A2B",
    "location": "POINT(37.6522 55.7417)"
  },
  {
    "name": "Курская",
    "hex": "#8B5A2B",
    "location": "POINT(37.6577 55.7576)"
  },
  {
    "name": "Комсомольская",
    "hex": "#8B5A2B",
    "location": "POINT(37.6558 55.7748)"
  },
  {
    "name": "Проспект Мира",
    "hex": "#8B5A2B",
    "location": "POINT(37.6336 55.7796)"
  },
  {
    "name": "Новослободская",
    "hex": "#8B5A2B",
    "location": "POINT(37.6042 55.7794)"
  },
  {
    "name": "Белорусская",
    "hex": "#8B5A2B",
    "location": "POINT(37.5836 55.7769)"
  },
  {
    "name": "Краснопресненская",
    "hex": "#8B5A2B",
    "location": "POINT(37.5706 55.7608)"
  },
  {
    "name": "Киевская",
    "hex": "#8B5A2B",
    "location": "POINT(37.5655 55.7443)"
  },
    {
        "name": "Медведково",
        "hex": "#ED9121",
        "location": "POINT(37.6613 55.8872)"
    },
    {
        "name": "Бабушкинская",
        "hex": "#ED9121",
        "location": "POINT(37.6644 55.8694)"
    },
    {
        "name": "Свиблово",
        "hex": "#ED9121",
        "location": "POINT(37.6527 55.8552)"
    },
    {
        "name": "Ботанический сад",
        "hex": "#ED9121",
        "location": "POINT(37.6383 55.8449)"
    },
    {
        "name": "ВДНХ",
        "hex": "#ED9121",
        "location": "POINT(37.6411 55.8211)"
    },
    {
        "name": "Алексеевская",
        "hex": "#ED9121",
        "location": "POINT(37.6390 55.8088)"
    },
    {
        "name": "Рижская",
        "hex": "#ED9121",
        "location": "POINT(37.6362 55.7936)"
    },
    {
        "name": "Проспект Мира",
        "hex": "#ED9121",
        "location": "POINT(37.6318 55.7812)"
    },
    {
        "name": "Сухаревская",
        "hex": "#ED9121",
        "location": "POINT(37.6319 55.7733)"
    },
    {
        "name": "Тургеневская",
        "hex": "#ED9121",
        "location": "POINT(37.6374 55.7661)"
    },
    {
        "name": "Китай-город",
        "hex": "#ED9121",
        "location": "POINT(37.6333 55.7553)"
    },
    {
        "name": "Третьяковская",
        "hex": "#ED9121",
        "location": "POINT(37.6274 55.7412)"
    },
    {
        "name": "Октябрьская",
        "hex": "#ED9121",
        "location": "POINT(37.6112 55.7306)"
    },
    {
        "name": "Шаболовская",
        "hex": "#ED9121",
        "location": "POINT(37.6083 55.7198)"
    },
    {
        "name": "Ленинский проспект",
        "hex": "#ED9121",
        "location": "POINT(37.5861 55.7077)"
    },
    {
        "name": "Академическая",
        "hex": "#ED9121",
        "location": "POINT(37.5733 55.6877)"
    },
    {
        "name": "Профсоюзная",
        "hex": "#ED9121",
        "location": "POINT(37.5627 55.6780)"
    },
    {
        "name": "Новые Черёмушки",
        "hex": "#ED9121",
        "location": "POINT(37.5544 55.6702)"
    },
    {
        "name": "Калужская",
        "hex": "#ED9121",
        "location": "POINT(37.5405 55.6571)"
    },
    {
        "name": "Беляево",
        "hex": "#ED9121",
        "location": "POINT(37.5257 55.6428)"
    },
    {
        "name": "Коньково",
        "hex": "#ED9121",
        "location": "POINT(37.5188 55.6333)"
    },
    {
        "name": "Тёплый Стан",
        "hex": "#ED9121",
        "location": "POINT(37.5082 55.6191)"
    },
    {
        "name": "Ясенево",
        "hex": "#ED9121",
        "location": "POINT(37.5333 55.6063)"
    },
    {
        "name": "Новоясеневская",
        "hex": "#ED9121",
        "location": "POINT(37.5541 55.6010)"
    },
  {
    "name": "Планерная",
    "hex": "#800080",
    "location": "POINT(37.4365 55.8610)"
  },
  {
    "name": "Сходненская",
    "hex": "#800080",
    "location": "POINT(37.4398 55.8506)"
  },
  {
    "name": "Тушинская",
    "hex": "#800080",
    "location": "POINT(37.4367 55.8265)"
  },
  {
    "name": "Спартак",
    "hex": "#800080",
    "location": "POINT(37.4360 55.8183)"
  },
  {
    "name": "Щукинская",
    "hex": "#800080",
    "location": "POINT(37.4642 55.8083)"
  },
  {
    "name": "Октябрьское Поле",
    "hex": "#800080",
    "location": "POINT(37.4936 55.7933)"
  },
  {
    "name": "Полежаевская",
    "hex": "#800080",
    "location": "POINT(37.5194 55.7778)"
  },
  {
    "name": "Беговая",
    "hex": "#800080",
    "location": "POINT(37.5469 55.7739)"
  },
  {
    "name": "Улица 1905 года",
    "hex": "#800080",
    "location": "POINT(37.5611 55.7653)"
  },
  {
    "name": "Баррикадная",
    "hex": "#800080",
    "location": "POINT(37.5814 55.7606)"
  },
  {
    "name": "Пушкинская",
    "hex": "#800080",
    "location": "POINT(37.6079 55.7650)"
  },
  {
    "name": "Кузнецкий Мост",
    "hex": "#800080",
    "location": "POINT(37.6261 55.7603)"
  },
  {
    "name": "Китай-город",
    "hex": "#800080",
    "location": "POINT(37.6333 55.7553)"
  },
  {
    "name": "Таганская",
    "hex": "#800080",
    "location": "POINT(37.6522 55.7402)"
  },
  {
    "name": "Пролетарская",
    "hex": "#800080",
    "location": "POINT(37.6658 55.7319)"
  },
  {
    "name": "Волгоградский проспект",
    "hex": "#800080",
    "location": "POINT(37.6864 55.7258)"
  },
  {
    "name": "Текстильщики",
    "hex": "#800080",
    "location": "POINT(37.7317 55.7086)"
  },
  {
    "name": "Кузьминки",
    "hex": "#800080",
    "location": "POINT(37.7656 55.7058)"
  },
  {
    "name": "Рязанский проспект",
    "hex": "#800080",
    "location": "POINT(37.7931 55.7172)"
  },
  {
    "name": "Выхино",
    "hex": "#800080",
    "location": "POINT(37.8178 55.7158)"
  },
  {
    "name": "Лермонтовский проспект",
    "hex": "#800080",
    "location": "POINT(37.8522 55.7017)"
  },
  {
    "name": "Жулебино",
    "hex": "#800080",
    "location": "POINT(37.8556 55.6858)"
  },
  {
    "name": "Котельники",
    "hex": "#800080",
    "location": "POINT(37.8583 55.6744)"
  },
    {
        "name": "Третьяковская",
        "hex": "#FFD702",
        "location": "POINT(37.6275 55.7411)"
    },
    {
        "name": "Марксистская",
        "hex": "#FFD702",
        "location": "POINT(37.6542 55.7411)"
    },
    {
        "name": "Площадь Ильича",
        "hex": "#FFD702",
        "location": "POINT(37.6653 55.7472)"
    },
    {
        "name": "Авиамоторная",
        "hex": "#FFD702",
        "location": "POINT(37.7150 55.7525)"
    },
    {
        "name": "Шоссе Энтузиастов",
        "hex": "#FFD702",
        "location": "POINT(37.7492 55.7578)"
    },
    {
        "name": "Перово",
        "hex": "#FFD702",
        "location": "POINT(37.7861 55.7514)"
    },
    {
        "name": "Новогиреево",
        "hex": "#FFD702",
        "location": "POINT(37.8167 55.7517)"
    },
    {
        "name": "Новокосино",
        "hex": "#FFD702",
        "location": "POINT(37.8642 55.7450)"
    },
    {
        "name": "Деловой центр",
        "hex": "#FFD702",
        "location": "POINT(37.5395 55.7491)"
    },
    {
        "name": "Парк Победы",
        "hex": "#FFD702",
        "location": "POINT(37.5182 55.7362)"
    },
    {
        "name": "Минская",
        "hex": "#FFD702",
        "location": "POINT(37.496675 55.724818)"
    },
    {
        "name": "Ломоносовский проспект",
        "hex": "#FFD702",
        "location": "POINT(37.516196 55.707119)"
    },
    {
        "name": "Раменки",
        "hex": "#FFD702",
        "location": "POINT(37.498477 55.697574)"
    },
    {
        "name": "Мичуринский проспект",
        "hex": "#FFD702",
        "location": "POINT(37.483044 55.689484)"
    },
    {
        "name": "Озёрная",
        "hex": "#FFD702",
        "location": "POINT(37.448459 55.670452)"
    },
    {
        "name": "Говорово",
        "hex": "#FFD702",
        "location": "POINT(37.417254 55.659548)"
    },
    {
        "name": "Солнцево",
        "hex": "#FFD702",
        "location": "POINT(37.391081 55.649578)"
    },
    {
        "name": "Боровское шоссе",
        "hex": "#FFD702",
        "location": "POINT(37.370396 55.647746)"
    },
    {
        "name": "Новопеределкино",
        "hex": "#FFD702",
        "location": "POINT(37.355248 55.639645)"
    },
    {
        "name": "Рассказовка",
        "hex": "#FFD702",
        "location": "POINT(37.335158 55.634053)"
    },
    {
        "name": "Пыхтино",
        "hex": "#FFD702",
        "location": "POINT(37.298000 55.625000)"
    },
    {
        "name": "Аэропорт Внуково",
        "hex": "#FFD702",
        "location": "POINT(37.287702 55.607087)"
    },
    {
        "name": "Алтуфьево",
        "hex": "#A1A2A3",
        "location": "POINT(37.5870 55.8980)"
    },
    {
        "name": "Бибирево",
        "hex": "#A1A2A3",
        "location": "POINT(37.6037 55.8814)"
    },
    {
        "name": "Отрадное",
        "hex": "#A1A2A3",
        "location": "POINT(37.6150 55.8630)"
    },
    {
        "name": "Владыкино",
        "hex": "#A1A2A3",
        "location": "POINT(37.5897 55.8481)"
    },
    {
        "name": "Петровско-Разумовская",
        "hex": "#A1A2A3",
        "location": "POINT(37.5745 55.8351)"
    },
    {
        "name": "Тимирязевская",
        "hex": "#A1A2A3",
        "location": "POINT(37.5765 55.8176)"
    },
    {
        "name": "Дмитровская",
        "hex": "#A1A2A3",
        "location": "POINT(37.5813 55.8074)"
    },
    {
        "name": "Савёловская",
        "hex": "#A1A2A3",
        "location": "POINT(37.5880 55.7941)"
    },
    {
        "name": "Менделеевская",
        "hex": "#A1A2A3",
        "location": "POINT(37.6000 55.7820)"
    },
    {
        "name": "Цветной бульвар",
        "hex": "#A1A2A3",
        "location": "POINT(37.6200 55.7710)"
    },
    {
        "name": "Чеховская",
        "hex": "#A1A2A3",
        "location": "POINT(37.6080 55.7650)"
    },
    {
        "name": "Боровицкая",
        "hex": "#A1A2A3",
        "location": "POINT(37.6090 55.7520)"
    },
    {
        "name": "Полянка",
        "hex": "#A1A2A3",
        "location": "POINT(37.6180 55.7400)"
    },
    {
        "name": "Серпуховская",
        "hex": "#A1A2A3",
        "location": "POINT(37.6246 55.7280)"
    },
    {
        "name": "Тульская",
        "hex": "#A1A2A3",
        "location": "POINT(37.6225 55.7083)"
    },
    {
        "name": "Нагатинская",
        "hex": "#A1A2A3",
        "location": "POINT(37.6182 55.6895)"
    },
    {
        "name": "Нагорная",
        "hex": "#A1A2A3",
        "location": "POINT(37.6113 55.6725)"
    },
    {
        "name": "Нахимовский проспект",
        "hex": "#A1A2A3",
        "location": "POINT(37.6080 55.6620)"
    },
    {
        "name": "Севастопольская",
        "hex": "#A1A2A3",
        "location": "POINT(37.6000 55.6520)"
    },
    {
        "name": "Чертановская",
        "hex": "#A1A2A3",
        "location": "POINT(37.6070 55.6400)"
    },
    {
        "name": "Южная",
        "hex": "#A1A2A3",
        "location": "POINT(37.6090 55.6225)"
    },
    {
        "name": "Пражская",
        "hex": "#A1A2A3",
        "location": "POINT(37.6040 55.6120)"
    },
    {
        "name": "Улица академика Янгеля",
        "hex": "#A1A2A3",
        "location": "POINT(37.5990 55.5950)"
    },
    {
        "name": "Аннино",
        "hex": "#A1A2A3",
        "location": "POINT(37.5910 55.5830)"
    },
    {
        "name": "Бульвар Дмитрия Донского",
        "hex": "#A1A2A3",
        "location": "POINT(37.5760 55.5700)"
    },
    {
        "name": "Физтех",
        "hex": "#99CC00",
        "location": "POINT(37.5465 55.9216)"
    },
    {
        "name": "Лианозово",
        "hex": "#99CC00",
        "location": "POINT(37.5511 55.8978)"
    },
    {
        "name": "Яхромская",
        "hex": "#99CC00",
        "location": "POINT(37.5510 55.8720)"
    },
    {
        "name": "Селигерская",
        "hex": "#99CC00",
        "location": "POINT(37.5500 55.8610)"
    },
    {
        "name": "Верхние Лихоборы",
        "hex": "#99CC00",
        "location": "POINT(37.5593 55.8557)"
    },
    {
        "name": "Окружная",
        "hex": "#99CC00",
        "location": "POINT(37.5740 55.8447)"
    },
    {
        "name": "Петровско-Разумовская",
        "hex": "#99CC00",
        "location": "POINT(37.5747 55.8358)"
    },
    {
        "name": "Фонвизинская",
        "hex": "#99CC00",
        "location": "POINT(37.5883 55.8227)"
    },
    {
        "name": "Бутырская",
        "hex": "#99CC00",
        "location": "POINT(37.6037 55.8134)"
    },
    {
        "name": "Марьина Роща",
        "hex": "#99CC00",
        "location": "POINT(37.6155 55.7966)"
    },
    {
        "name": "Достоевская",
        "hex": "#99CC00",
        "location": "POINT(37.6114 55.7818)"
    },
    {
        "name": "Трубная",
        "hex": "#99CC00",
        "location": "POINT(37.6220 55.7680)"
    },
    {
        "name": "Сретенский бульвар",
        "hex": "#99CC00",
        "location": "POINT(37.6345 55.7664)"
    },
    {
        "name": "Чкаловская",
        "hex": "#99CC00",
        "location": "POINT(37.6591 55.7562)"
    },
    {
        "name": "Римская",
        "hex": "#99CC00",
        "location": "POINT(37.6671 55.7525)"
    },
    {
        "name": "Крестьянская застава",
        "hex": "#99CC00",
        "location": "POINT(37.6669 55.7336)"
    },
    {
        "name": "Дубровка",
        "hex": "#99CC00",
        "location": "POINT(37.6769 55.7185)"
    },
    {
        "name": "Кожуховская",
        "hex": "#99CC00",
        "location": "POINT(37.6854 55.7071)"
    },
    {
        "name": "Печатники",
        "hex": "#99CC00",
        "location": "POINT(37.7273 55.6932)"
    },
    {
        "name": "Волжская",
        "hex": "#99CC00",
        "location": "POINT(37.7517 55.6910)"
    },
    {
        "name": "Люблино",
        "hex": "#99CC00",
        "location": "POINT(37.7628 55.6757)"
    },
    {
        "name": "Братиславская",
        "hex": "#99CC00",
        "location": "POINT(37.7508 55.6597)"
    },
    {
        "name": "Марьино",
        "hex": "#99CC00",
        "location": "POINT(37.7434 55.6500)"
    },
    {
        "name": "Борисово",
        "hex": "#99CC00",
        "location": "POINT(37.7430 55.6330)"
    },
    {
        "name": "Шипиловская",
        "hex": "#99CC00",
        "location": "POINT(37.7430 55.6210)"
    },
    {
        "name": "Зябликово",
        "hex": "#99CC00",
        "location": "POINT(37.7450 55.6120)"
    },
    {
        "name": "Савёловская",
        "hex": "#82C0C0",
        "location": "POINT(37.5870 55.7934)"
    },
    {
        "name": "Петровский парк",
        "hex": "#82C0C0",
        "location": "POINT(37.5572 55.7919)"
    },
    {
        "name": "ЦСКА",
        "hex": "#82C0C0",
        "location": "POINT(37.5332 55.7866)"
    },
    {
        "name": "Хорошёвская",
        "hex": "#82C0C0",
        "location": "POINT(37.5191 55.7767)"
    },
    {
        "name": "Народное Ополчение",
        "hex": "#82C0C0",
        "location": "POINT(37.4851 55.7757)"
    },
    {
        "name": "Мнёвники",
        "hex": "#82C0C0",
        "location": "POINT(37.4671 55.7598)"
    },
    {
        "name": "Терехово",
        "hex": "#82C0C0",
        "location": "POINT(37.4596 55.7480)"
    },
    {
        "name": "Кунцевская",
        "hex": "#82C0C0",
        "location": "POINT(37.4460 55.7288)"
    },
    {
        "name": "Давыдково",
        "hex": "#82C0C0",
        "location": "POINT(37.4472 55.7138)"
    },
    {
        "name": "Аминьевская",
        "hex": "#82C0C0",
        "location": "POINT(37.4627 55.6976)"
    },
    {
        "name": "Мичуринский проспект",
        "hex": "#82C0C0",
        "location": "POINT(37.4849 55.6888)"
    },
    {
        "name": "Проспект Вернадского",
        "hex": "#82C0C0",
        "location": "POINT(37.5056 55.6765)"
    },
    {
        "name": "Новаторская",
        "hex": "#82C0C0",
        "location": "POINT(37.5221 55.6688)"
    },
    {
        "name": "Воронцовская",
        "hex": "#82C0C0",
        "location": "POINT(37.5342 55.6581)"
    },
    {
        "name": "Зюзино",
        "hex": "#82C0C0",
        "location": "POINT(37.5735 55.6558)"
    },
    {
        "name": "Каховская",
        "hex": "#82C0C0",
        "location": "POINT(37.5983 55.6530)"
    },
    {
        "name": "Варшавская",
        "hex": "#82C0C0",
        "location": "POINT(37.6194 55.6533)"
    },
    {
        "name": "Каширская",
        "hex": "#82C0C0",
        "location": "POINT(37.6487 55.6551)"
    },
    {
        "name": "Кленовый бульвар",
        "hex": "#82C0C0",
        "location": "POINT(37.6823 55.6749)"
    },
    {
        "name": "Нагатинский Затон",
        "hex": "#82C0C0",
        "location": "POINT(37.7036 55.6844)"
    },
    {
        "name": "Печатники",
        "hex": "#82C0C0",
        "location": "POINT(37.7274 55.6946)"
    },
    {
        "name": "Текстильщики",
        "hex": "#82C0C0",
        "location": "POINT(37.7283 55.7085)"
    },
    {
        "name": "Нижегородская",
        "hex": "#82C0C0",
        "location": "POINT(37.7283 55.7325)"
    },
    {
        "name": "Авиамоторная",
        "hex": "#82C0C0",
        "location": "POINT(37.7166 55.7514)"
    },
    {
        "name": "Лефортово",
        "hex": "#82C0C0",
        "location": "POINT(37.7068 55.7647)"
    },
    {
        "name": "Электрозаводская",
        "hex": "#82C0C0",
        "location": "POINT(37.7030 55.7803)"
    },
    {
        "name": "Сокольники",
        "hex": "#82C0C0",
        "location": "POINT(37.6789 55.7911)"
    },
    {
        "name": "Рижская",
        "hex": "#82C0C0",
        "location": "POINT(37.6359 55.7938)"
    },
    {
        "name": "Марьина Роща",
        "hex": "#82C0C0",
        "location": "POINT(37.6173 55.7984)"
    },
    {
        "name": "Битцевский парк",
        "hex": "#B0BFE7",
        "location": "POINT(37.555724 55.600850)"
    },
    {
        "name": "Лесопарковая",
        "hex": "#B0BFE7",
        "location": "POINT(37.579090 55.581445)"
    },
    {
        "name": "Улица Старокачаловская",
        "hex": "#B0BFE7",
        "location": "POINT(37.576586 55.569074)"
    },
    {
        "name": "Улица Скобелевская",
        "hex": "#B0BFE7",
        "location": "POINT(37.554444 55.548056)"
    },
    {
        "name": "Бульвар Адмирала Ушакова",
        "hex": "#B0BFE7",
        "location": "POINT(37.542322 55.545181)"
    },
    {
        "name": "Улица Горчакова",
        "hex": "#B0BFE7",
        "location": "POINT(37.530800 55.541800)"
    },
    {
        "name": "Бунинская аллея",
        "hex": "#B0BFE7",
        "location": "POINT(37.516530 55.538173)"
    },
    {
        "name": "Окружная",
        "hex": "#EE2722",
        "location": "POINT(37.5711 55.8489)"
    },
    {
        "name": "Владыкино",
        "hex": "#EE2722",
        "location": "POINT(37.5919 55.8472)"
    },
    {
        "name": "Ботанический сад",
        "hex": "#EE2722",
        "location": "POINT(37.6403 55.8456)"
    },
    {
        "name": "Ростокино",
        "hex": "#EE2722",
        "location": "POINT(37.6678 55.8394)"
    },
    {
        "name": "Белокаменная",
        "hex": "#EE2722",
        "location": "POINT(37.7024 55.8293)"
    },
    {
        "name": "Бульвар Рокоссовского",
        "hex": "#EE2722",
        "location": "POINT(37.7373 55.8172)"
    },
    {
        "name": "Локомотив",
        "hex": "#EE2722",
        "location": "POINT(37.7469 55.8042)"
    },
    {
        "name": "Измайлово",
        "hex": "#EE2722",
        "location": "POINT(37.7581 55.7875)"
    },
    {
        "name": "Соколиная Гора",
        "hex": "#EE2722",
        "location": "POINT(37.7463 55.7694)"
    },
    {
        "name": "Шоссе Энтузиастов",
        "hex": "#EE2722",
        "location": "POINT(37.7463 55.7589)"
    },
    {
        "name": "Андроновка",
        "hex": "#EE2722",
        "location": "POINT(37.7383 55.7474)"
    },
    {
        "name": "Нижегородская",
        "hex": "#EE2722",
        "location": "POINT(37.7282 55.7322)"
    },
    {
        "name": "Новохохловская",
        "hex": "#EE2722",
        "location": "POINT(37.7161 55.7239)"
    },
    {
        "name": "Угрешская",
        "hex": "#EE2722",
        "location": "POINT(37.6978 55.7183)"
    },
    {
        "name": "Дубровка",
        "hex": "#EE2722",
        "location": "POINT(37.6778 55.7127)"
    },
    {
        "name": "Автозаводская",
        "hex": "#EE2722",
        "location": "POINT(37.6631 55.7063)"
    },
    {
        "name": "ЗИЛ",
        "hex": "#EE2722",
        "location": "POINT(37.6483 55.6983)"
    },
    {
        "name": "Верхние Котлы",
        "hex": "#EE2722",
        "location": "POINT(37.6189 55.6900)"
    },
    {
        "name": "Крымская",
        "hex": "#EE2722",
        "location": "POINT(37.6050 55.6900)"
    },
    {
        "name": "Площадь Гагарина",
        "hex": "#EE2722",
        "location": "POINT(37.5858 55.7069)"
    },
    {
        "name": "Лужники",
        "hex": "#EE2722",
        "location": "POINT(37.5601 55.7209)"
    },
    {
        "name": "Кутузовская",
        "hex": "#EE2722",
        "location": "POINT(37.5340 55.7399)"
    },
    {
        "name": "Москва-Сити",
        "hex": "#EE2722",
        "location": "POINT(37.5322 55.7472)"
    },
    {
        "name": "Шелепиха",
        "hex": "#EE2722",
        "location": "POINT(37.5256 55.7575)"
    },
    {
        "name": "Хорошёво",
        "hex": "#EE2722",
        "location": "POINT(37.5072 55.7772)"
    },
    {
        "name": "Зорге",
        "hex": "#EE2722",
        "location": "POINT(37.5042 55.7892)"
    },
    {
        "name": "Панфиловская",
        "hex": "#EE2722",
        "location": "POINT(37.4998 55.7980)"
    },
    {
        "name": "Стрешнево",
        "hex": "#EE2722",
        "location": "POINT(37.4869 55.8136)"
    },
    {
        "name": "Балтийская",
        "hex": "#EE2722",
        "location": "POINT(37.4974 55.8253)"
    },
    {
        "name": "Коптево",
        "hex": "#EE2722",
        "location": "POINT(37.5167 55.8397)"
    },
    {
        "name": "Лихоборы",
        "hex": "#EE2722",
        "location": "POINT(37.5347 55.8472)"
    },
{
    "name": "Нижегородская",
    "hex": "#DE64A1",
    "location": "POINT(37.728327 55.732471)"
  },
  {
    "name": "Стахановская",
    "hex": "#DE64A1",
    "location": "POINT(37.752257 55.727207)"
  },
  {
    "name": "Окская",
    "hex": "#DE64A1",
    "location": "POINT(37.781277 55.718623)"
  },
  {
    "name": "Юго-Восточная",
    "hex": "#DE64A1",
    "location": "POINT(37.817998 55.705352)"
  },
  {
    "name": "Косино",
    "hex": "#DE64A1",
    "location": "POINT(37.850998 55.703423)"
  },
  {
    "name": "Улица Дмитриевского",
    "hex": "#DE64A1",
    "location": "POINT(37.879945 55.710176)"
  },
  {
    "name": "Лухмановская",
    "hex": "#DE64A1",
    "location": "POINT(37.900963 55.708495)"
  },
  {
    "name": "Некрасовка",
    "hex": "#DE64A1",
    "location": "POINT(37.928207 55.702884)"
  },
    {
        "name": "ЗИЛ",
        "hex": "#009B77",
        "location": "POINT(37.644444 55.697222)"
    },
    {
        "name": "Крымская",
        "hex": "#009B77",
        "location": "POINT(37.605000 55.690000)"
    },
    {
        "name": "Академическая",
        "hex": "#009B77",
        "location": "POINT(37.573333 55.687778)"
    },
    {
        "name": "Вавиловская",
        "hex": "#009B77",
        "location": "POINT(37.560000 55.680000)"
    },
    {
        "name": "Новаторская",
        "hex": "#009B77",
        "location": "POINT(37.522222 55.668889)"
    },
    {
        "name": "Университет дружбы народов",
        "hex": "#009B77",
        "location": "POINT(37.500000 55.650000)"
    },
    {
        "name": "Генерала Тюленева",
        "hex": "#009B77",
        "location": "POINT(37.480000 55.640000)"
    },
    {
        "name": "Тютчевская",
        "hex": "#009B77",
        "location": "POINT(37.460000 55.630000)"
    },
    {
        "name": "Корниловская",
        "hex": "#009B77",
        "location": "POINT(37.440000 55.620000)"
    },
    {
        "name": "Коммунарка",
        "hex": "#009B77",
        "location": "POINT(37.420000 55.610000)"
    },
    {
        "name": "Новомосковская",
        "hex": "#009B77",
        "location": "POINT(37.400000 55.600000)"
    }
]

async def create_cities_and_metro():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            cities = await miniapp_db_fcn.get_cities(session=session)
            if len(cities)==0:
                for city in cities_templates:
                    city_id = await miniapp_db_fcn.create_city(data=city, session=session)
                    if city["city"] == "Санкт-Петербург":
                      for station in metro_spb_template:
                        station["city_id"] = city_id
                        await miniapp_db_fcn.create_station(data=station, session=session)
                    else:
                      for station in metro_msk_template:
                        station["city_id"] = city_id
                        await miniapp_db_fcn.create_station(data=station, session=session)
    


async def create_admin():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            admin_check = await miniapp_db_fcn.check_admin(chat_id=980609742, session=session)
            if not admin_check:
                await miniapp_db_fcn.create_admin(chat_id=980609742, password=os.getenv("PASSWORD"), session=session)

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
