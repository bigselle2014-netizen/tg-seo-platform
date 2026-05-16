"""
IndexNow — ping Bing і Yandex при появі нової SEO-сторінки.
Документація: https://www.indexnow.org/documentation
"""
import logging
import os

import httpx

logger = logging.getLogger(__name__)

INDEXNOW_KEY = os.getenv("INDEXNOW_KEY", "")
SITE_URL = os.getenv("SITE_URL", "")

# Engines that support IndexNow
INDEXNOW_ENDPOINTS = [
    "https://api.indexnow.org/indexnow",
    "https://yandex.com/indexnow",
]


async def ping_indexnow(urls: list[str]) -> None:
    """
    Submit URLs to IndexNow (Bing + Yandex).
    Safe to call even if INDEXNOW_KEY or SITE_URL are not set — will log warning and return.
    """
    if not INDEXNOW_KEY:
        logger.warning("[indexnow] INDEXNOW_KEY not set, skipping ping")
        return
    if not SITE_URL:
        logger.warning("[indexnow] SITE_URL not set, skipping ping")
        return
    if not urls:
        return

    # Build key location URL (IndexNow requires key to be accessible)
    key_location = f"{SITE_URL.rstrip('/')}/{INDEXNOW_KEY}.txt"

    payload = {
        "host": SITE_URL.replace("https://", "").replace("http://", "").rstrip("/"),
        "key": INDEXNOW_KEY,
        "keyLocation": key_location,
        "urlList": urls[:10000],  # API limit
    }

    async with httpx.AsyncClient(timeout=15) as client:
        for endpoint in INDEXNOW_ENDPOINTS:
            try:
                resp = await client.post(
                    endpoint,
                    json=payload,
                    headers={"Content-Type": "application/json; charset=utf-8"},
                )
                if resp.status_code in (200, 202):
                    logger.info(f"[indexnow] {endpoint} → {resp.status_code} ({len(urls)} URLs)")
                else:
                    logger.warning(f"[indexnow] {endpoint} → {resp.status_code}: {resp.text[:200]}")
            except Exception as e:
                logger.warning(f"[indexnow] {endpoint} error: {e}")
