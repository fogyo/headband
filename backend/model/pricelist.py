import os

import json
import re
import logging

import requests


from backend.database import miniapp_db_fcn
from backend.model import SyncSessionLocal

api_key = os.getenv("API_GENAI")

def run_sync(request: dict):
    with SyncSessionLocal() as session:
        data = get_price_list_sync(file_url=request["file_url"], session=session)
        if not data:
            return {"status": "failed", "error": "No data received from AI"}

        created = miniapp_db_fcn.create_pricelist_sync(data=data, master_id=request["master_id"], session=session)
        session.commit()
        return {"status": "success"}

def get_price_list_sync(file_url: str, session):
    categories = miniapp_db_fcn.get_all_categories_sync(session=session)
    names = [cat["name"] for cat in categories]
    ids = [cat["id"] for cat in categories]

    prompt = f"""
    Ты помощник, который извлекает данные из прайс-листов. 
    Из предоставленного файла (изображение или текст) нужно получить JSON-массив объектов.

    Структура объекта:
    - "name": название услуги (строка)
    - "price": цена в рублях (число, без знака валюты). Если цена не указана или не найдена — поставь 0.
    - "approximate_time": время выполнения в минутах (целое число). Оценивай реалистично, исходя из типовых норм
    - "category_id": одна из категорий: {names}, которым соответствуют айди {ids}. Категорию выбирай максимально точно:
      * Если ни одна не подходит, выбери ближайшую или "Другое".

    Правила:
    1. Игнорируй заголовки, итоги, пустые строки.
    2. Если цена не найдена — 0.
    3. Ответ должен быть ТОЛЬКО валидным JSON массивом. Без маркдауна, без пояснений.

    Файл для анализа приложен ниже.
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
            return []
        data = response.json()
        if 'response' in data:

            if isinstance(data['response'], list) and len(data['response']) > 0:

                content = data['response'][0].get('message', {}).get('content', '')
            elif isinstance(data['response'], str):
                content = data['response']
            else:
                content = ''
        else:
            # fallback для других форматов
            content = data.get('output', '') or data.get('choices', [{}])[0].get('message', {}).get('content',
                                                                                                    '')
        if not content:
            logging.error(f"Пустой ответ, полный data: {data}")
            return []

        clean_json = re.sub(r'```json\s*|\s*```', '', content).strip()
        match = re.search(r'\[\s*\{.*?\}\s*\]', clean_json, re.DOTALL)
        if match:
            clean_json = match.group(0)

        data_list = json.loads(clean_json)
        if not isinstance(data_list, list):
            logging.error("Ответ не является массивом")
            return []

        validated = []
        for item in data_list:
            if 'name' in item and 'price' in item:
                validated.append(item)
            else:
                logging.warning(f"Пропущен некорректный объект: {item}")
        return validated
    except Exception as e:
        logging.error(f"Ошибка при обработке LLM: {e}", exc_info=True)
        return []