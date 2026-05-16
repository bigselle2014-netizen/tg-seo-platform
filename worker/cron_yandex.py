"""
Cron job: fetch search positions from Yandex Webmaster.
Run once per day. Updates yandex_position, yandex_synced_at in posts table.
"""
import asyncio
import os
import logging
from datetime import datetime, timedelta

import httpx
from sqlalchemy import select, update

from database import async_session, init_db
from models import Post, Channel

logger = logging.getLogger(__name__)

YANDEX_TOKEN = os.getenv("YANDEX_WEBMASTER_TOKEN", "")
YANDEX_USER_ID = os.getenv("YANDEX_WEBMASTER_USER_ID", "2178096583")
YANDEX_HOST_ID = os.getenv("YANDEX_WEBMASTER_HOST_ID", "https:post-seo.seo-rezult.ru:443")
SITE_URL = os.getenv("SITE_URL", "https://post-seo.seo-rezult.ru")


async def fetch_yandex_positions(urls: list[str]) -> dict[str, float]:
    """Fetch positions from Yandex Webmaster query analytics."""
    if not YANDEX_TOKEN:
        logger.warning("[yandex] YANDEX_WEBMASTER_TOKEN not set, skipping")
        return {}

    end_date = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")

    results = {}
    headers = {"Authorization": f"OAuth {YANDEX_TOKEN}"}
    api_base = f"https://api.webmaster.yandex.net/v4/user/{YANDEX_USER_ID}/hosts/{YANDEX_HOST_ID}"

    # Batch by 50 URLs using URL filter
    for i in range(0, len(urls), 50):
        batch = urls[i:i+50]
        for url in batch:
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    resp = await client.post(
                        f"{api_base}/query-analytics/list",
                        headers=headers,
                        json={
                            "offset": 0,
                            "limit": 1,
                            "filters": {
                                "text_filters": [
                                    {
                                        "text_indicator": "URL",
                                        "operation": "TEXT_MATCH",
                                        "value": url,
                                    }
                                ]
                            },
                            "fields": ["QUERY", "POSITION", "SHOWS"],
                            "date_from": start_date,
                            "date_to": end_date,
                        },
                    )
                    if resp.status_code != 200:
                        logger.warning(f"[yandex] API {resp.status_code} for {url}: {resp.text[:100]}")
                        continue

                    data = resp.json()
                    rows = data.get("text_indicator_to_statistics", [])
                    if rows:
                        # Find best (lowest) position
                        best = min(
                            (r.get("statistics", {}).get("position", {}).get("value", 999)
                             for r in rows),
                            default=None,
                        )
                        if best and best < 999:
                            results[url] = round(best, 1)
            except Exception as e:
                logger.warning(f"[yandex] Error fetching {url}: {e}")

    return results


async def sync_yandex_positions():
    await init_db()

    if not YANDEX_TOKEN:
        logger.warning("[yandex] YANDEX_WEBMASTER_TOKEN not configured, skipping")
        return

    logger.info("[yandex] Starting Yandex position sync...")

    async with async_session() as session:
        result = await session.execute(
            select(Post).where(
                Post.is_indexed == True,
                Post.seo_slug.isnot(None),
            )
        )
        posts = result.scalars().all()

    if not posts:
        logger.info("[yandex] No indexed posts to sync")
        return

    logger.info(f"[yandex] Found {len(posts)} indexed posts")

    url_to_post = {}
    for post in posts:
        async with async_session() as session:
            ch = await session.get(Channel, post.channel_id)
            if ch:
                url = f"{SITE_URL.rstrip('/')}/{ch.username}/{post.seo_slug}"
                url_to_post[url] = post.id

    urls = list(url_to_post.keys())
    logger.info(f"[yandex] Fetching positions for {len(urls)} URLs")

    yandex_data = await fetch_yandex_positions(urls)
    logger.info(f"[yandex] Yandex returned data for {len(yandex_data)} URLs")

    now = datetime.utcnow()
    updated = 0

    async with async_session() as session:
        for url, position in yandex_data.items():
            post_id = url_to_post.get(url)
            if post_id:
                # Save prev before updating
                post_result = await session.execute(select(Post).where(Post.id == post_id))
                post = post_result.scalar_one_or_none()
                prev = post.yandex_position if post else None

                await session.execute(
                    update(Post)
                    .where(Post.id == post_id)
                    .values(
                        yandex_position=position,
                        yandex_position_prev=prev,
                        yandex_synced_at=now,
                    )
                )
                updated += 1

        await session.commit()

    logger.info(f"[yandex] Done. Updated {updated} posts with Yandex positions")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(sync_yandex_positions())
