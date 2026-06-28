import os
import re
import json
import logging
import requests
from typing import List

from backend.database import miniapp_db_fcn
from backend.model import SyncSessionLocal

api_key = os.getenv("API_GENAI")


def run_sync(request: dict):
    with SyncSessionLocal() as session:
        data = get_recommendations_sync(user=request["user"], colors=request["colors"])
        if not data:
            return {"status": "failed", "error": "No data received from AI"}

        created = miniapp_db_fcn.create_or_update_recommendations_hair(data=data, session_id=request["session_id"],
                                                                       session=session)
        session.commit()
        return {"status": "success"}


def get_recommendations_sync(user: dict, colors: List[dict]):
    prompt = f"""
    Ты — профессиональный стилист-эксперт по подбору цвета волос. Твоя задача — на основе данных о пользователе и каталога цветов выбрать 5 наиболее подходящих вариантов.

    Входные данные:
    - "user" — объект с полями:
      - "skin_temperature" (строка, опциональное) — температура кожи пользователя (например, "теплый", "холодный", "нейтральный"). Может отсутствовать или быть null.
      - "contrast" (строка, опциональное) — контрастность внешности (например, "высокий", "низкий", "средний"). Может отсутствовать или быть null.
      - "eye_color" (строка, опциональное) — цвет глаз пользователя (например, "карие", "голубые", "зеленые"). Может отсутствовать или быть null.

    - "colors" — массив объектов, каждый из которых содержит:
      - "id" (строка) — уникальный идентификатор цвета.
      - "skin_temperature" (строка) — рекомендуемая температура кожи для этого цвета.
      - "contrast" (строка) — рекомендуемая контрастность для этого цвета.
      - "eye_color" (строка) — рекомендуемый цвет глаз для этого цвета.

    Важно: любое из перечисленных полей у цвета может иметь значение "any" — это означает, что цвет подходит для любого значения этого параметра у пользователя (параметр игнорируется при сравнении).

    Правила отбора и ранжирования:
    1. **Основной критерий** — совпадение skin_temperature. Цвета, у которых skin_temperature совпадает с пользовательским (или skin_temperature = "any"), получают наивысший приоритет.
    2. **Дополнительные бонусы** (учитываются только для цветов, уже прошедших первый критерий, или при недостатке таковых):
       - Совпадение по contrast (если у пользователя он указан и не null).
       - Совпадение по eye_color (если у пользователя он указан и не null).
    3. **Итоговый приоритет**:
       - Группа A: цвета с совпадением skin_temperature. Сортируются по убыванию **общего количества совпадений** по остальным параметрам (contrast, eye_color). Чем больше совпадений, тем выше.
       - Группа B: если после отбора по skin_temperature набралось меньше 5 цветов, дополнить список цветами, у которых skin_temperature не совпадает (и не "any"), но есть хотя бы одно совпадение по другим параметрам (contrast или eye_color). Их сортировать по количеству совпадений (по убыванию).
       - Цвета, не имеющие ни одного совпадения ни по одному параметру (с учётом того, что если у пользователя параметр отсутствует, он не считается за несовпадение), исключаются.
    4. Верни **ровно 5** наиболее релевантных id (если доступно меньше — верни все подходящие).

    Формат ответа:
    Выдайте строго JSON-объект с ключом "recommended_colors", значением которого является строка (id цветов через пробел) в порядке убывания релевантности. Не добавляйте никаких пояснений, комментариев или markdown-разметки.

    Теперь обработай следующие данные: 
    user: {user}
    colors: {colors}
    """

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

        required_fields = {'recommended_colors'}
        if not required_fields.issubset(parsed.keys()):
            missing = required_fields - parsed.keys()
            logging.error(f"Отсутствуют поля: {missing}. Получено: {parsed}")
            return {}

        return {
            "recommended_colors": parsed["recommended_colors"],
        }

    except Exception as e:
        logging.error(f"Ошибка при обработке LLM: {e}", exc_info=True)
        return {}