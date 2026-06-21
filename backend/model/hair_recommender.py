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


def get_recommendations_sync(user: dict, haircuts: List[dict]):
    prompt = f"""Ты — профессиональный стилист-эксперт по подбору стрижек. Твоя задача — на основе данных о пользователе и каталога стрижек выбрать 5 наиболее подходящих вариантов.

    Входные данные:
    - "user" — объект с полями:
      - "face_type" (строка, обязательное) — форма лица пользователя.
      - "hair_type" (строка, опциональное) — тип волос пользователя. Если поле отсутствует или равно null, значит оно не указано.
    - "haircuts" — массив объектов, каждый из которых содержит:
      - "id" (строка, уникальный идентификатор стрижки, например UUID)
      - "face_type" (строка) — форма лица, для которой стрижка рекомендуется.
      - "hair_type" (строка) — тип волос, для которого стрижка рекомендуется.
    
    Правила отбора и ранжирования:
    1. **Основной критерий** — совпадение face_type. Стрижки, у которых face_type совпадает с пользовательским, получают наивысший приоритет.
    2. **Вторичный критерий** — если у пользователя указан hair_type, то стрижки, у которых hair_type совпадает с пользовательским, получают дополнительный бонус. Если hair_type не указан, этот критерий игнорируется.
    3. Итоговый приоритет определяется так:
       - Наивысший: совпадают И face_type, И hair_type (если hair_type задан).
       - Высокий: совпадает face_type, но hair_type не совпадает (или hair_type не задан у пользователя).
       - Средний: face_type не совпадает, но hair_type совпадает (при наличии hair_type у пользователя) — такие стрижки могут быть рассмотрены, но с меньшим приоритетом.
       - Низкий: не совпадает ни один параметр — такие стрижки исключаются из выдачи (не включайте их в результат).
    4. Если подходящих стрижек меньше 5, верните все, которые имеют хотя бы одно совпадение (по лицу или по волосам), отсортированные по убыванию приоритета.
    5. Если подходящих стрижек больше 5 — верните только первые 5 из отсортированного списка.
    
    Формат ответа:
    Выдайте строго JSON-объект с ключом "recommended", значением которого является строка (id стрижек через пробел) в порядке убывания релевантности. Не добавляйте никаких пояснений, комментариев или markdown-разметки.
    
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
        data = response.json()
        clean = re.sub(r'```json\s*|\s*```', '', data).strip()

        match = re.search(r'\{.*\}', clean, re.DOTALL)
        if not match:
            logging.error("Не найден JSON-объект в ответе")
            return None

        json_str = match.group(0)
        data = json.loads(json_str)

        required_fields = {'recommended'}
        if not required_fields.issubset(data.keys()):
            missing = required_fields - data.keys()
            logging.error(f"Отсутствуют обязательные поля: {missing}")
            return None

        return {
            "recommended": data["recommended"],
        }
    except Exception as e:
        logging.error(f"Ошибка при обработке LLM: {e}", exc_info=True)
        return {}