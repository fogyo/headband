import hashlib
import hmac
import os
from datetime import datetime
from urllib.parse import parse_qsl, unquote

from fastapi import APIRouter
from pydantic import BaseModel
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
    try:
        # Parse the initData correctly using parse_qsl
        parsed_data = dict(parse_qsl(request.initData, strict_parsing=True))

        # Extract hash
        if "hash" not in parsed_data:
            return {"status": "error"}

        hash_str = parsed_data.pop("hash")

        # Create check_string: sorted key=value pairs joined by \n
        sorted_data = sorted(parsed_data.items(), key=lambda x: x[0])
        check_string = "\n".join(f"{k}={v}" for k, v in sorted_data)

        # Create secret key
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=BOT_TOKEN.encode('utf-8'),
            digestmod=hashlib.sha256
        ).digest()

        # Compute hash
        computed_hash = hmac.new(
            key=secret_key,
            msg=check_string.encode('utf-8'),
            digestmod=hashlib.sha256
        ).hexdigest()

        # Check auth_date (optional but recommended)
        auth_date = int(parsed_data.get('auth_date', 0))
        current_time = datetime.now().timestamp()

        # Validate hash and check if data is not older than 24 hours
        if computed_hash != hash_str or abs(current_time - auth_date) > 86400:
            return {"status": "error"}

        return {"status": "success"}

    except Exception as e:
        return {"status": "error"}