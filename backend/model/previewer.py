import os
import re
import json
import logging
import uuid
from enum import Enum

import requests
from typing import List

from backend.database import miniapp_db_fcn
from backend.model import SyncSessionLocal

api_key = os.getenv("API_GENAI")

class GenerationType(Enum):
    HAIRCUT = 1
    BEARD = 2
    COLORING = 3
    PERM = 4

class ModelType(Enum):
    BASE = 1
    IMPROVED = 2

def get_prompt(gen_type: int, session, style_id: uuid.UUID):
    if gen_type == GenerationType.HAIRCUT.value:
        haircut = miniapp_db_fcn.get_haircut_by_id_sync(session=session, obj_id=style_id)
        prompt = f"""Возьми приложенное фото. Сохрани полностью лицо человека, черты лица, пол, возраст, выражение лица и одежду. Единственное, что нужно изменить — это прическа.
            Название новой прически: {haircut.name}.
            Описание прически: {haircut.description}.
            Важно: Волосы должны выглядеть естественно, соответствовать текстуре исходных волос (цвет должен остаться прежним, если не указано иное). Не меняй фон, позу и одежду. Результат должен выглядеть как одно и то же фото, но с другой прической."""
    elif gen_type == GenerationType.BEARD.value:
        beard = miniapp_db_fcn.get_beard_by_id_sync(session=session, obj_id=style_id)
        prompt = f"""Возьми приложенное фото. Сохрани полностью лицо человека, черты лица, пол, возраст, выражение лица, текстуру кожи и одежду. Единственное, что нужно изменить — это добавить бороду и/или усы (если на фото уже есть растительность на лице — замени её на новый стиль).
        Название стиля бороды/усов: {beard.name}.
        Описание внешнего вида: {beard.description}.  
        Важные требования:
        - Сохрани текущую причёску (стрижку) и цвет волос на голове — они не меняются.           
        - Новая растительность должна выглядеть естественно: волоски должны иметь реалистичную текстуру, быть равномерно распределены, с бликами и тенями, соответствующими исходному освещению на фото.           
        - Цвет бороды и усов должен соответствовать цвету волос на голове (или быть указан отдельно, если требуется другой оттенок).
        - Линия роста бороды (на щеках, подбородке, над губой) должна выглядеть естественно, без эффекта «наклейки» или резкой границы.          
        - Не меняй фон, позу, одежду, цвет глаз и цвет кожи. Результат должен выглядеть как то же самое фото, но с добавленной растительностью на лице."""
    elif gen_type == GenerationType.PERM.value:
        perm = miniapp_db_fcn.get_perm_by_id_sync(session=session, obj_id=style_id)
        prompt = f"""Возьми приложенное фото. Сохрани полностью лицо человека, черты лица, пол, возраст, выражение лица, текстуру кожи и одежду. Единственное, что нужно изменить — это текстура волос (сделать завивку или выпрямить, в зависимости от указанного стиля).       
        Название желаемой текстуры: {perm.name}.
        Подробное описание текстуры: {perm.description}.
        
        Важные требования:
        - Сохрани ТЕКУЩУЮ длину и стрижку волос (они остаются теми же, меняется только степень извитости). 
        - Цвет волос должен остаться точно таким же, как на исходном фото (без изменений пигмента). 
        - Новая текстура должна выглядеть естественно: каждый локон или волна должны иметь реалистичные блики и тени, соответствующие исходному освещению.
        - Переход от корней к кончикам должен быть плавным, без эффекта «парика» или искусственной жёсткости.  
        - Не меняй фон, позу, одежду, цвет глаз и цвет кожи. Результат должен выглядеть как то же самое фото, но с другой структурой волос."""
    else:
        color = miniapp_db_fcn.get_color_by_id_sync(session=session, obj_id=style_id)
        prompt = f"""Возьми приложенное фото. Сохрани полностью лицо человека, черты лица, пол, возраст, выражение лица, текстуру кожи и одежду. 
        Единственное, что нужно изменить — это **цвет всех волос**: как на голове, так и на лице (брови, ресницы, усы, борода, если они есть).
        Новый цвет волос (название): {color.name}.
        Точный цветовой код (HEX) для ориентира: {color.hex}.
        Важные требования:
        - Сохрани ТЕКУЩУЮ длину, стрижку, форму бровей, густоту ресниц, фасон усов/бороды (если есть) — меняется только пигмент, а не структура или форма.
        - Новый цвет должен быть одинаковым для всех волос на голове и лице, либо создавай плавный натуральный переход (если, например, борода должна быть чуть темнее).
        - Цвет должен распределяться равномерно от корней до кончиков, с реалистичными бликами и тенями, соответствующими исходному освещению на фото.
        - Линия роста волос (лоб, виски), а также естественные границы бровей, усов и бороды должны остаться родными, без эффекта «парика» или «наклейки».
        - Не меняй фон, позу, одежду, цвет глаз и цвет кожи. Результат должен выглядеть как то же самое фото, но с новым, натуральным цветом всех волос."""
    return prompt

def run_sync(request: dict, cfg: dict):
    with SyncSessionLocal() as session:
        prompt = get_prompt(gen_type=cfg["generation"], session=session, style_id=request["style_id"])
        image_url = get_preview(model=cfg["model"], prompt=prompt, img_url=request["img_url"])
        if image_url == "":
            return {"status": "failed", "error": "No data received from AI"}
        if cfg["model"] == 1:
            preview_id = miniapp_db_fcn.create_preview_sync(session_id=request["session_id"], img_url=image_url, model="base", session=session)
            miniapp_db_fcn.decrease_tokens(chat_id=request["chat_id"], session=session)
        else:
            preview_id = miniapp_db_fcn.create_preview_sync(session_id=request["session_id"], img_url=image_url, model="improve",
                                               session=session)
            miniapp_db_fcn.decrease_super_tokens(chat_id=request["chat_id"], session=session)
        session.commit()
        return {"status": "success",
                "id": preview_id}


def get_preview(model: int, prompt: str, img_url: str) -> str:
    """
    Генерирует изображение и возвращает ссылку на результат.

    :param model: тип модели (ModelType.BASE для grok, иначе nano-banana)
    :param prompt: текстовое описание для генерации
    :param img_url: URL входного изображения (если требуется, иначе None или "")
    :return: строка с URL сгенерированного изображения или пустая строка при ошибке
    """
    # Определяем URL эндпоинта
    if model == ModelType.BASE:
        url = "https://api.gen-api.ru/api/v1/networks/grok-imagine-image"
    else:
        url = "https://api.gen-api.ru/api/v1/networks/nano-banana-2"

    # Базовый payload для всех моделей
    payload = {
        "is_sync": True,          # синхронный режим — ждём готовый результат
        "prompt": prompt,
        "num_images": 1,
        "aspect_ratio": "9:16",
    }

    if model == ModelType.BASE:
        if img_url:
            payload["image_url"] = img_url
        payload["output_format"] = "png"
    else:
        if img_url:
            payload["image_urls"] = [img_url]   # массив URL
        payload["output_format"] = "png"
        payload["resolution"] = "0.5K"
        payload["enable_web_search"] = True
        payload["thinking_level"] = "high"

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=120)
        if response.status_code != 200:
            logging.error(f"HTTP {response.status_code}: {response.text}")
            return ""

        response_data = response.json()
        logging.debug(f"Полный ответ API: {response_data}")

        image_url = None

        if 'output' in response_data and isinstance(response_data['output'], str):
            image_url = response_data['output']

        elif 'output' in response_data and isinstance(response_data['output'], dict):
            output = response_data['output']
            if 'images' in output and isinstance(output['images'], list) and output['images']:
                first = output['images'][0]
                if isinstance(first, str):
                    image_url = first
            elif 'image_url' in output:
                image_url = output['image_url']

        elif 'data' in response_data and isinstance(response_data['data'], list):
            for item in response_data['data']:
                if isinstance(item, dict) and 'url' in item:
                    image_url = item['url']
                    break

        elif 'image_url' in response_data:
            image_url = response_data['image_url']
        elif 'images' in response_data and isinstance(response_data['images'], list):
            if response_data['images']:
                image_url = response_data['images'][0]

        if not image_url:
            logging.error(f"Не удалось извлечь URL изображения из ответа: {response_data}")
            return ""

        return image_url

    except Exception as e:
        logging.error(f"Ошибка при обработке запроса: {e}", exc_info=True)
        return ""