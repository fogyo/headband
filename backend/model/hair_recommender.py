import json
import logging
import os
import re
from typing import List

from backend.database import miniapp_db_fcn
from backend.model import SyncSessionLocal
import requests

api_key = os.getenv("API_GENAI")


def run_sync(request: dict):
    with SyncSessionLocal() as session:
        data = get_recommendations_sync(user=request["user"], haircuts=request["haircuts"])
        if not data:
            return {"status": "failed", "error": "No data received from AI"}

        created = miniapp_db_fcn.create_or_update_recommendations_hair(data=data, session_id=request["session_id"],
                                                             session=session)
        session.commit()
        return {"status": "success"}


import re
import json
import logging
import requests
from typing import List


def get_recommendations_sync(user: dict, haircuts: List[dict]):
    prompt = f"""
    Ты — профессиональный стилист-эксперт по подбору стрижек. Твоя задача — на основе данных о пользователе и каталога стрижек выбрать 5 наиболее подходящих вариантов.
    
    Входные данные:
    - "user" — объект с полями:
      - "face_type" (строка, обязательное) — форма лица пользователя.
      - "hair_type" (строка, опциональное) — тип волос пользователя. Может отсутствовать или быть null.
      - "jawline" (строка) — линия челюсти.
      - "forehead_height" (строка) — высота лба.
      - "cheekbones" (строка) — скулы.
      - "neck_length" (строка) — длина шеи.
    
    - "haircuts" — массив объектов, каждый из которых содержит:
      - "id" (строка) — уникальный идентификатор стрижки.
      - "face_type" (строка) — форма лица, для которой стрижка рекомендуется.
      - "hair_type" (строка) — тип волос, для которого стрижка рекомендуется.
      - "jawline" (строка) — рекомендуемая линия челюсти.
      - "forehead_height" (строка) — рекомендуемая высота лба.
      - "cheekbones" (строка) — рекомендуемые скулы.
      - "neck_length" (строка) — рекомендуемая длина шеи.
    
    Важно: любое из перечисленных полей у стрижки может иметь значение "any" — это означает, что стрижка подходит для любого значения этого параметра у пользователя (параметр игнорируется при сравнении).
    
    Правила отбора и ранжирования:
    1. **Основной критерий** — совпадение face_type. Стрижки, у которых face_type совпадает с пользовательским (или face_type = "any"), получают наивысший приоритет.
    2. **Дополнительные бонусы** (учитываются только для стрижек, уже прошедших первый критерий, или при недостатке таковых):
       - Совпадение по hair_type (если у пользователя он указан и не null).
       - Совпадение по jawline (если значение не "any").
       - Совпадение по forehead_height.
       - Совпадение по cheekbones.
       - Совпадение по neck_length.
    3. **Итоговый приоритет**:
       - Группа A: стрижки с совпадением face_type. Сортируются по убыванию **общего количества совпадений** по всем остальным параметрам (hair_type, jawline, forehead_height, cheekbones, neck_length). Чем больше совпадений, тем выше.
       - Группа B: если после отбора по face_type набралось меньше 5 стрижек, дополнить список стрижками, у которых face_type не совпадает, но есть хотя бы одно совпадение по другим параметрам. Их сортировать по количеству совпадений (по убыванию).
       - Стрижки, не имеющие ни одного совпадения ни по одному параметру, исключаются.
    4. Верни **ровно 5** наиболее релевантных id (если доступно меньше — верни все подходящие).

    Формат ответа:
    Выдайте строго JSON-объект с ключом "recommended_haircuts", значением которого является строка (id стрижек через пробел) в порядке убывания релевантности. Не добавляйте никаких пояснений, комментариев или markdown-разметки.

    Теперь обработай следующие данные: 
    user: {user}
    haircuts: {haircuts}"""

    payload = {
        "is_sync": True,
        "temperature": 0.2,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
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
        logging.debug(f"Полный ответ API: {response_data}")

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

        required_fields = {'recommended_haircuts'}
        if not required_fields.issubset(parsed.keys()):
            missing = required_fields - parsed.keys()
            logging.error(f"Отсутствуют поля: {missing}. Получено: {parsed}")
            return {}

        return {
            "recommended_haircuts": parsed["recommended_haircuts"],
        }

    except Exception as e:
        logging.error(f"Ошибка при обработке LLM: {e}", exc_info=True)
        return {}