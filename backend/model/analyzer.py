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
    prompt = """Ты — профессиональный визажист и дерматолог-эксперт. Проанализируй загруженное фото лица человека (анфас, при естественном освещении) и выполни следующие задачи.
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
        
        ВАЖНО: 
        - Ответ выдай строго в формате JSON без пояснений, markdown-разметки и дополнительного текста.
        - Поля должны быть именно такие: face_type, resume, eye_type, skin_color.
        - Все поля — строки (str).
        - Если какой-то параметр невозможно определить уверенно, укажи наиболее вероятное значение и добавь пометку в resume.
        
        Пример ожидаемого ответа:
        {
        "face_type": "oval",
        "resume": "Кожа комбинированная, расширенные поры в Т-зоне, единичные воспаления на подбородке. Есть лёгкая пигментация на скулах. Рекомендуется увлажнение и SPF-защита.",
        "eye_type": "almond",
        "skin_color": "светлый"
        }"""

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
        data = response.json()
        clean = re.sub(r'```json\s*|\s*```', '', data).strip()

        match = re.search(r'\{.*\}', clean, re.DOTALL)
        if not match:
            logging.error("Не найден JSON-объект в ответе")
            return None

        json_str = match.group(0)
        data = json.loads(json_str)

        required_fields = {'face_type', 'resume', 'eye_type', 'skin_color'}
        if not required_fields.issubset(data.keys()):
            missing = required_fields - data.keys()
            logging.error(f"Отсутствуют обязательные поля: {missing}")
            return None

        return {
            "face_type": data["face_type"],
            "resume": data["resume"],
            "eye_type": data["eye_type"],
            "skin_color": data["skin_color"]
        }
    except Exception as e:
        logging.error(f"Ошибка при обработке LLM: {e}", exc_info=True)
        return {}