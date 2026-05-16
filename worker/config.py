import os
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_API_ID = int(os.getenv("TELEGRAM_API_ID", "0"))
TELEGRAM_API_HASH = os.getenv("TELEGRAM_API_HASH", "")
TELEGRAM_SESSION_NAME = os.getenv("TELEGRAM_SESSION_NAME", "tg_seo_worker")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://localhost:5432/tgseo")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")

XMLSTOCK_URL = os.getenv("XMLSTOCK_URL", "")

MEDIA_STORAGE_PATH = os.getenv("MEDIA_STORAGE_PATH", "./media")

SITE_URL = os.getenv("SITE_URL", "")

MAX_BOT_TOKEN = os.getenv("MAX_BOT_TOKEN", "")
MAX_BOT_USERNAME = os.getenv("MAX_BOT_USERNAME", "")

WORKER_SECRET = os.getenv("WORKER_SECRET", "")

TOOLSELFIZAL_API_KEY = os.getenv("TOOLSELFIZAL_API_KEY", "")
TOOLSELFIZAL_BASE_URL = "https://tools.seo-rezult.ru"
