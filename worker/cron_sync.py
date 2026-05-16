"""
Cron job: sync all active channels + generate meta.
Run every 30 min via crontab or launchd.
"""
import asyncio
from sqlalchemy import select

from database import async_session, init_db
from models import Channel
from telegram_scraper import scrape_new_posts
from content_pipeline import process_channel


async def sync_all():
    await init_db()

    async with async_session() as session:
        result = await session.execute(
            select(Channel).where(Channel.is_active == True)
        )
        channels = result.scalars().all()

    if not channels:
        print("[*] No active channels")
        return

    for ch in channels:
        print(f"\n{'='*40}")
        print(f"  Syncing @{ch.username}")
        print(f"{'='*40}")

        try:
            new_posts = await scrape_new_posts(ch.username)
            print(f"  New posts: {new_posts}")
        except Exception as e:
            print(f"  [!] Scrape error: {e}")

        try:
            await process_channel(ch.username, batch_size=50)
        except Exception as e:
            print(f"  [!] Pipeline error: {e}")

    print(f"\n[done] All channels synced")


if __name__ == "__main__":
    asyncio.run(sync_all())
