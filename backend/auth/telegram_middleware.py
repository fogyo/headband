import hashlib
import hmac
import os
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel
from urllib.parse import parse_qs
from backend.database.responses import StatusResponse

router = APIRouter(
    prefix="/security",
    tags=["Master.Guide"]
)
BOT_TOKEN = os.getenv("BOT_TOKEN")

class VerifyModel(BaseModel):
    initData: str


@router.post("/", response_model=StatusResponse)
async def verify(request: VerifyModel):
    parsed = parse_qs(request.initData)
    hash_str = parsed.pop('hash')[0]

    sorted_keys = sorted(parsed.keys())
    check_string = "\n".join([f"{k}={parsed[k][0]}" for k in sorted_keys])

    secret_key = hmac.new(
        key=b"WebAppData",
        msg=BOT_TOKEN.encode('utf-8'),
        digestmod=hashlib.sha256
    ).digest()

    computed_hash = hmac.new(
        key=secret_key,
        msg=check_string.encode('utf-8'),
        digestmod=hashlib.sha256
    ).hexdigest()
    auth_date = int(parsed.get('auth_date', [0])[0])

    if computed_hash != hash_str or abs(datetime.now().timestamp() - auth_date) > 86400:
        return {"status": "error"}
    return {"status": "success"}
