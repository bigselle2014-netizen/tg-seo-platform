import asyncio
import logging
from datetime import datetime

import httpx
from sqlalchemy import select

from config import MAX_BOT_TOKEN
from database import async_session
from models import Channel, Post

logger = logging.getLogger(__name__)

MAX_API_BASE = "https://platform-api.max.ru"


def _auth_headers() -> dict:
    if not MAX_BOT_TOKEN:
        raise RuntimeError("MAX_BOT_TOKEN is not set — cannot use MAX API")
    return {"Authorization": MAX_BOT_TOKEN}


async def get_max_channel_info(chat_id: int) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{MAX_API_BASE}/chats/{chat_id}",
            headers=_auth_headers(),
        )
        resp.raise_for_status()
        return resp.json()


async def get_max_messages(chat_id: int, count: int = 100, from_ts: int | None = None) -> list[dict]:
    params: dict = {"chat_id": chat_id, "count": min(count, 100)}
    if from_ts:
        params["from"] = from_ts

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{MAX_API_BASE}/messages",
            params=params,
            headers=_auth_headers(),
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("messages", [])


def _extract_text(msg: dict) -> str:
    body = msg.get("body", {})
    return body.get("text", "") or ""


def _extract_media_type(msg: dict) -> str | None:
    body = msg.get("body", {})
    attachments = body.get("attachment") or []
    if not attachments:
        return None
    a_type = attachments[0].get("type", "")
    return a_type if a_type else None


async def scrape_max_channel_history(
    channel_username: str,
    max_chat_id: int,
    limit: int = 200,
) -> int:
    saved_count = 0

    async with async_session() as session:
        ch_result = await session.execute(
            select(Channel)
            .where(Channel.username == channel_username)
            .where(Channel.messenger_type == "max")
        )
        channel = ch_result.scalar_one_or_none()

        if not channel:
            logger.error(f"[max_scraper] Channel @{channel_username} (MAX) not found in DB")
            return 0

        existing_result = await session.execute(
            select(Post.telegram_message_id).where(Post.channel_id == channel.id)
        )
        existing_ids = set(existing_result.scalars().all())

        logger.info(f"[max_scraper] Scraping MAX @{channel_username} (existing: {len(existing_ids)})")

        fetched = 0
        from_ts = None

        while fetched < limit:
            batch_count = min(100, limit - fetched)
            try:
                messages = await get_max_messages(max_chat_id, count=batch_count, from_ts=from_ts)
            except Exception as e:
                logger.error(f"[max_scraper] API error: {e}")
                break

            if not messages:
                break

            for msg in messages:
                msg_id = msg.get("message_id")
                if not msg_id or msg_id in existing_ids:
                    continue

                text = _extract_text(msg)
                if not text and not msg.get("body", {}).get("attachment"):
                    continue

                media_type = _extract_media_type(msg)
                post_url = msg.get("url", "")

                post = Post(
                    channel_id=channel.id,
                    telegram_message_id=msg_id,
                    text=text,
                    text_html=text,
                    date=datetime.utcfromtimestamp(msg.get("timestamp", 0) / 1000),
                    views=msg.get("views", 0) or 0,
                    forwards=0,
                    reactions_count=0,
                    has_media=media_type is not None,
                    media_type=media_type,
                    media_urls=[post_url] if post_url else [],
                )
                session.add(post)
                existing_ids.add(msg_id)
                saved_count += 1

            if saved_count > 0 and saved_count % 50 == 0:
                await session.commit()
                logger.info(f"[max_scraper] Saved {saved_count} posts...")

            last_ts = messages[-1].get("timestamp") if messages else None
            if last_ts:
                from_ts = last_ts
            fetched += len(messages)

            if len(messages) < batch_count:
                break

            await asyncio.sleep(0.2)

        await session.commit()
        channel.last_synced_at = datetime.utcnow()
        await session.commit()

    logger.info(f"[max_scraper] Done. New posts saved: {saved_count}")
    return saved_count


async def handle_max_new_post(channel_username: str, message: dict) -> bool:
    async with async_session() as session:
        ch_result = await session.execute(
            select(Channel)
            .where(Channel.username == channel_username)
            .where(Channel.messenger_type == "max")
        )
        channel = ch_result.scalar_one_or_none()
        if not channel:
            logger.warning(f"[max_scraper] Channel @{channel_username} (MAX) not found")
            return False

        msg_id = message.get("message_id")
        if not msg_id:
            return False

        existing = await session.execute(
            select(Post)
            .where(Post.channel_id == channel.id)
            .where(Post.telegram_message_id == msg_id)
        )
        if existing.scalar_one_or_none():
            return False

        text = _extract_text(message)
        media_type = _extract_media_type(message)
        post_url = message.get("url", "")

        post = Post(
            channel_id=channel.id,
            telegram_message_id=msg_id,
            text=text,
            text_html=text,
            date=datetime.utcfromtimestamp(message.get("timestamp", 0) / 1000),
            views=0,
            forwards=0,
            reactions_count=0,
            has_media=media_type is not None,
            media_type=media_type,
            media_urls=[post_url] if post_url else [],
        )
        session.add(post)
        await session.commit()
        await session.refresh(post)

        from content_pipeline import process_post
        asyncio.create_task(process_post(post.id))

        logger.info(f"[max_scraper] New MAX post saved: {post.id}")
        return True
