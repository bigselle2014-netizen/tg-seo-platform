"""
Cron job: fetch search positions from Google Search Console.
Run once per day. Updates search_position, search_impressions, search_clicks in posts table.
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

GSC_CLIENT_ID = os.getenv("GSC_CLIENT_ID", "")
GSC_CLIENT_SECRET = os.getenv("GSC_CLIENT_SECRET", "")
GSC_REFRESH_TOKEN = os.getenv("GSC_REFRESH_TOKEN", "")
GSC_SITE_URL = os.getenv("GSC_SITE_URL", "https://post-seo.seo-rezult.ru/")
SITE_URL = os.getenv("SITE_URL", "https://post-seo.seo-rezult.ru")


async def get_access_token() -> str:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": GSC_CLIENT_ID,
                "client_secret": GSC_CLIENT_SECRET,
                "refresh_token": GSC_REFRESH_TOKEN,
                "grant_type": "refresh_token",
            },
        )
        resp.raise_for_status()
        return resp.json()["access_token"]


async def fetch_gsc_positions(access_token: str, urls: list[str]) -> dict[str, dict]:
    """Fetch positions for up to 1000 URLs from GSC."""
    end_date = (datetime.utcnow() - timedelta(days=3)).strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=10)).strftime("%Y-%m-%d")

    results = {}
    # GSC allows max 1000 rows per request — batch by 500
    for i in range(0, len(urls), 500):
        batch = urls[i:i+500]
        body = {
            "startDate": start_date,
            "endDate": end_date,
            "dimensions": ["page"],
            "dimensionFilterGroups": [{
                "filters": [{
                    "dimension": "page",
                    "operator": "includingRegex",
                    "expression": "|".join(url.replace("https://", "").replace("http://", "") for url in batch[:50])
                }]
            }],
            "rowLimit": 1000,
        }

        from urllib.parse import quote
        encoded_site = quote(GSC_SITE_URL, safe="")
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"https://www.googleapis.com/webmasters/v3/sites/{encoded_site}/searchAnalytics/query",
                json=body,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code != 200:
                logger.warning(f"[gsc] GSC API error {resp.status_code}: {resp.text[:200]}")
                continue

            data = resp.json()
            for row in data.get("rows", []):
                page_url = row["keys"][0]
                results[page_url] = {
                    "position": round(row.get("position", 0), 1),
                    "impressions": row.get("impressions", 0),
                    "clicks": row.get("clicks", 0),
                }

    return results


async def sync_gsc_positions():
    await init_db()

    if not all([GSC_CLIENT_ID, GSC_CLIENT_SECRET, GSC_REFRESH_TOKEN]):
        logger.warning("[gsc] GSC credentials not configured, skipping")
        return

    logger.info("[gsc] Starting GSC position sync...")

    async with async_session() as session:
        result = await session.execute(
            select(Post).where(
                Post.is_indexed == True,
                Post.seo_slug.isnot(None),
            )
        )
        posts = result.scalars().all()

    if not posts:
        logger.info("[gsc] No indexed posts to sync")
        return

    logger.info(f"[gsc] Found {len(posts)} indexed posts")

    try:
        access_token = await get_access_token()
    except Exception as e:
        logger.error(f"[gsc] Failed to get access token: {e}")
        return

    # Build URL list
    url_to_post = {}
    for post in posts:
        channel_result = None
        async with async_session() as session:
            ch = await session.get(Channel, post.channel_id)
            if ch:
                url = f"{SITE_URL.rstrip('/')}/{ch.username}/{post.seo_slug}"
                url_to_post[url] = post.id

    urls = list(url_to_post.keys())
    logger.info(f"[gsc] Fetching positions for {len(urls)} URLs")

    gsc_data = await fetch_gsc_positions(access_token, urls)
    logger.info(f"[gsc] GSC returned data for {len(gsc_data)} URLs")

    # Update DB
    updated = 0
    now = datetime.utcnow()

    async with async_session() as session:
        for url, data in gsc_data.items():
            post_id = url_to_post.get(url) or url_to_post.get("https://" + url)
            if not post_id:
                # try matching by slug part
                for full_url, pid in url_to_post.items():
                    if full_url.endswith(url.split("/")[-1]):
                        post_id = pid
                        break

            if post_id:
                post_result = await session.execute(select(Post).where(Post.id == post_id))
                post = post_result.scalar_one_or_none()
                prev_position = post.search_position if post else None

                await session.execute(
                    update(Post)
                    .where(Post.id == post_id)
                    .values(
                        search_position=data["position"],
                        google_position_prev=prev_position,
                        search_impressions=data["impressions"],
                        search_clicks=data["clicks"],
                        search_synced_at=now,
                    )
                )
                updated += 1

        await session.commit()

    logger.info(f"[gsc] Done. Updated {updated} posts with positions")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(sync_gsc_positions())
