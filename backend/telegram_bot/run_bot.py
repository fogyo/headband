import asyncio
from dotenv import load_dotenv
from backend.telegram_bot.bot_main import start_bot, stop_bot

load_dotenv()

async def main():
    try:
        await start_bot()
    finally:
        await stop_bot()

if __name__ == "__main__":
    asyncio.run(main())