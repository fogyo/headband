import json
import logging
import os
import re

from backend.database import miniapp_db_fcn
from backend.model import SyncSessionLocal
import requests

api_key = os.getenv("API_GENAI")

def run_sync(request: dict):
    with SyncSessionLocal() as session:
        data = get_analyze_sync(file_url=request["file_url"])
        if not data:
            return {"status": "failed", "error": "No data received from AI"}

        created = miniapp_db_fcn.create_face_parameters_sync(data=data, session_id=request["session_id"], session=session)
        session.commit()
        return {"status": "success"}


def get_analyze_sync(file_url: str):
    prompt = """
        Ты — профессиональный визажист и дерматолог-эксперт. Проанализируй загруженное фото лица человека (анфас, при естественном освещении) и выполни следующие задачи.

        1. ОПРЕДЕЛИ ФОРМУ ЛИЦА (face_type).
        Выбери ОДИН из вариантов:
        - oval (овальное)
        - round (круглое)
        - square (квадратное)
        - heart (сердцевидное)
        - diamond (ромбовидное)
        - oblong (вытянутое/прямоугольное)
        - triangle (треугольное)

        Если форма неочевидна из-за ракурса, прически или мимики — выбери наиболее вероятную.

        2. ПРОАНАЛИЗИРУЙ КОЖУ (для резюме).
        Оцени:
        - тон и текстуру (гладкость, шелушения, поры)
        - наличие акне, покраснений, пигментации, купероза
        - степень увлажненности, жирности или сухости
        - наличие морщин / мимических заломов (если возраст позволяет)

        На основе этого напиши КРАТКОЕ РЕЗЮМЕ (resume) на русском языке, объёмом 2–4 предложения. Укажи потенциальные проблемы (например: «склонность к сухости и шелушению», «расширенные поры в Т-зоне», «признаки купероза на щеках», «гиперпигментация», «первые мимические морщины»). Если проблем нет — напиши «видимых проблем не обнаружено».

        3. ОПРЕДЕЛИ ТИП ГЛАЗ (eye_type) по форме и посадке.
        Выбери ОДИН из вариантов:
        - almond (миндалевидные)
        - round (круглые)
        - hooded (с нависшим веком)
        - downturned (с опущенным внешним уголком)
        - upturned (с приподнятым внешним уголком)
        - monolid (без складки)

        Если сложно — выбери наиболее близкий.

        4. ОПРЕДЕЛИ ЦВЕТ КОЖИ (skin_color) по шкале Фитцпатрика или общему визуальному тону.
        Выбери ОДИН из вариантов:
        - очень светлый (очень бледный, веснушки)
        - светлый (светло-бежевый)
        - средний (персиковый, оливковый)
        - смуглый (карамельный, золотисто-коричневый)
        - темный (темно-коричневый)
        - очень темный (эбеновый, темно-шоколадный)

        Не используй субъективные эпитеты вроде «красивый» — только объективные характеристики.

        5. ОПРЕДЕЛИ ДОПОЛНИТЕЛЬНЫЕ ПАРАМЕТРЫ ЛИЦА:
           - jawline (линия челюсти) — выбери ОДИН из вариантов:
               * soft (мягкая, округлая)
               * angular (угловатая, с резкими очертаниями)
               * square (квадратная, массивная)
               * pointed (острая, заострённая)
               * round (круглая, плавная)
           - forehead_height (высота лба) — выбери ОДИН:
               * low (низкий)
               * average (средний)
               * high (высокий)
           - cheekbones (скулы) — выбери ОДИН:
               * prominent (выраженные, выступающие)
               * subtle (слабо выраженные, плоские)
           - neck_length (длина шеи) — выбери ОДИН:
               * short (короткая)
               * average (средняя)
               * long (длинная)

        При определении этих параметров ориентируйся на пропорции лица и визуальные соотношения. Если какой-то параметр трудно оценить из-за ракурса или одежды, выбери наиболее вероятное значение на основе анатомических пропорций.

        6. ОПРЕДЕЛИ ХАРАКТЕРИСТИКИ ДЛЯ ПОДБОРА БОРОДЫ И УСОВ:
           - hair_color (цвет волос на голове) — выбери ОДИН из вариантов:
               * blonde (блондин)
               * light_brown (русый)
               * medium_brown (шатен)
               * dark_brown (темно-русый / каштан)
               * black (брюнет)
               * red (рыжий)
               * grey (седой)
               * white (белый)
               * bald (лысый, нет волос на голове)
           - beard_facial_features — составь краткое описание (на русском языке, 1–2 предложения) следующих характеристик, которые влияют на выбор бороды/усов:
                * форма и размер носа
                * форма и размер подбородка
                * форма и размер губ

        Запиши все эти наблюдения в поле beard_facial_features в виде связного текста.

        7. ОПРЕДЕЛИ ЦВЕТОТИП ВНЕШНОСТИ (skin_temperature) — определи подтон кожи и общий тон.
        Выбери ОДИН из вариантов:
        - warm (тёплый) — золотистый, персиковый, желтоватый подтон
        - cool (холодный) — розоватый, синеватый, оливковый (холодный) подтон
        - neutral (нейтральный) — смешанный подтон, не явно тёплый или холодный

        Для определения ориентируйся на цвет вен (зелёные → тёплый, сине-фиолетовые → холодный, смешанные → нейтральный), реакцию кожи на солнце и общее сочетание кожи, глаз и волос.

        8. ОПРЕДЕЛИ КОНТРАСТНОСТЬ ВНЕШНОСТИ (contrast) — это соотношение тона кожи, цвета глаз и натурального цвета волос у корней.
        Выбери ОДИН из вариантов:
        - low (низкая) — все элементы близки по светлоте (например, светлая кожа + светлые глаза + светлые волосы)
        - medium (средняя) — умеренные различия (например, средний тон кожи + карие глаза + русые волосы)
        - high (высокая) — резкие различия (например, очень светлая кожа + тёмные волосы + яркие глаза)

        Оценивай именно натуральный цвет волос у корней (без окрашивания).

        9. ОПРЕДЕЛИ ЦВЕТ ГЛАЗ (eye_color) — выбери ОДИН из вариантов:
        - blue (голубые)
        - green (зелёные)
        - hazel (ореховые / зелено-карие)
        - brown (карие)
        - gray (серые)
        - amber (янтарные)
        - black (очень тёмные, почти чёрные)

        Если оттенок сложный или смешанный, выбери наиболее близкий из списка.

        ВАЖНО: 
        - Ответ выдай строго в формате JSON без пояснений, markdown-разметки и дополнительного текста.
        - Поля должны быть именно такие: face_type, resume, eye_type, skin_color, jawline, forehead_height, cheekbones, neck_length, hair_color, beard_facial_features, skin_temperature, contrast, eye_color.
        - Все поля — строки (str).
        - Если какой-то параметр невозможно определить уверенно, укажи наиболее вероятное значение и при необходимости добавь пометку в resume (например, "линия челюсти предположительно квадратная").

        Пример ожидаемого ответа:
        {
          "face_type": "oval",
          "resume": "Кожа комбинированная, расширенные поры в Т-зоне, единичные воспаления на подбородке. Есть лёгкая пигментация на скулах. Рекомендуется увлажнение и SPF-защита.",
          "eye_type": "almond",
          "skin_color": "светлый",
          "jawline": "soft",
          "forehead_height": "average",
          "cheekbones": "prominent",
          "neck_length": "long",
          "hair_color": "medium_brown",
          "beard_facial_features": "Мужчина с широким основанием носа. Аккуратный подбородок.",
          "skin_temperature": "warm",
          "contrast": "medium",
          "eye_color": "brown"
        }
        """

    payload = {
        "is_sync": True,
        "temperature": 0.2,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": file_url}}
                ]
            }
        ]
    }

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    url = "https://api.gen-api.ru/api/v1/networks/gemini-2-5-flash-lite"

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=120)
        if response.status_code != 200:
            logging.error(f"HTTP {response.status_code}: {response.text}")
            return {}

        response_data = response.json()
        logging.debug(f"Полный ответ API: {response_data}")  # для отладки

        # --- Извлечение текстового содержимого ---
        content = None

        # 1. Структура gen-api.ru с ключом 'response'
        if 'response' in response_data and isinstance(response_data['response'], list):
            if response_data['response']:
                first = response_data['response'][0]
                if 'message' in first and 'content' in first['message']:
                    content = first['message']['content']

        # 2. Стандартный формат OpenAI
        if not content and 'choices' in response_data and isinstance(response_data['choices'], list):
            if response_data['choices']:
                choice = response_data['choices'][0]
                if 'message' in choice and 'content' in choice['message']:
                    content = choice['message']['content']
                elif 'text' in choice:
                    content = choice['text']

        # 3. Другие распространённые ключи верхнего уровня
        if not content:
            for key in ('result', 'output', 'data', 'text', 'content', 'message'):
                if key in response_data and isinstance(response_data[key], str):
                    content = response_data[key]
                    break

        # 4. Если сам ответ — строка
        if not content and isinstance(response_data, str):
            content = response_data

        if not content:
            logging.error(f"Не удалось извлечь текст из ответа: {response_data}")
            return {}

        # --- Очистка от маркеров и парсинг JSON ---
        clean = re.sub(r'```json\s*|\s*```', '', content).strip()
        match = re.search(r'\{.*\}', clean, re.DOTALL)

        if not match:
            logging.error(f"JSON не найден. Очищенный текст: {clean}")
            return {}

        json_str = match.group(0)
        parsed = json.loads(json_str)

        required_fields = {'face_type', 'resume', 'eye_type', 'skin_color', "jawline", "forehead_height", "cheekbones", "neck_length", "hair_color", "beard_facial_features", "skin_temperature", "contrast", "eye_color"}
        if not required_fields.issubset(parsed.keys()):
            missing = required_fields - parsed.keys()
            logging.error(f"Отсутствуют поля: {missing}. Получено: {parsed}")
            return {}

        return {
            "face_type": parsed["face_type"],
            "resume": parsed["resume"],
            "eye_type": parsed["eye_type"],
            "skin_color": parsed["skin_color"],
            "jawline": parsed["jawline"],
            "forehead_height": parsed["forehead_height"],
            "cheekbones": parsed["cheekbones"],
            "neck_length": parsed["neck_length"],
            "hair_color": parsed["neck_length"],
            "beard_facial_features": parsed["beard_facial_features"],
            "skin_temperature": parsed["skin_temperature"],
            "contrast": parsed["contrast"],
            "eye_color": parsed["eye_color"]
        }

    except Exception as e:
        logging.error(f"Ошибка при обработке LLM: {e}", exc_info=True)
        return {}