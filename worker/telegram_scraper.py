import asyncio
from datetime import datetime
from pathlib import Path

from pyrogram import Client
from pyrogram.types import Message
from pyrogram.enums import MessageMediaType
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import (
    TELEGRAM_API_ID, TELEGRAM_API_HASH,
    TELEGRAM_SESSION_NAME, MEDIA_STORAGE_PATH
)
from models import Channel, Post
from database import async_session, init_db


def create_client() -> Client:
    return Client(
        TELEGRAM_SESSION_NAME,
        api_id=TELEGRAM_API_ID,
        api_hash=TELEGRAM_API_HASH,
        no_updates=True,
    )


async def get_or_create_channel(
    session: AsyncSession, client: Client, username: str
) -> Channel:
    result = await session.execute(
        select(Channel).where(Channel.username == username.lstrip("@"))
    )
    channel = result.scalar_one_or_none()
    if channel:
        return channel

    chat = await client.get_chat(username)
    channel = Channel(
        telegram_id=chat.id,
        username=username.lstrip("@"),
        title=chat.title,
        description=chat.description or "",
        subscribers_count=chat.members_count,
    )

    if chat.photo:
        avatar_path = Path(MEDIA_STORAGE_PATH) / "avatars"
        avatar_path.mkdir(parents=True, exist_ok=True)
        try:
            file_path = await client.download_media(
                chat.photo.big_file_id,
                file_name=str(avatar_path / f"{username.lstrip('@')}.jpg")
            )
            channel.avatar_url = file_path
        except Exception as e:
            print(f"  [!] Avatar download error: {e}")

    session.add(channel)
    await session.commit()
    await session.refresh(channel)
    return channel


def extract_media_info(message: Message) -> tuple[bool, str | None]:
    if not message.media:
        return False, None
    media_type_map = {
        MessageMediaType.PHOTO: "photo",
        MessageMediaType.VIDEO: "video",
        MessageMediaType.DOCUMENT: "document",
        MessageMediaType.ANIMATION: "animation",
        MessageMediaType.AUDIO: "audio",
        MessageMediaType.VOICE: "voice",
        MessageMediaType.STICKER: "sticker",
    }
    return True, media_type_map.get(message.media, "other")


async def download_post_media(
    client: Client, message: Message, channel_username: str
) -> list[str]:
    if not message.media:
        return []
    media_dir = Path(MEDIA_STORAGE_PATH) / channel_username / str(message.id)
    media_dir.mkdir(parents=True, exist_ok=True)
    urls = []
    try:
        file_path = await client.download_media(
            message, file_name=str(media_dir / "")
        )
        if file_path:
            urls.append(file_path)
    except Exception as e:
        print(f"  [!] Media download error msg {message.id}: {e}")
    return urls


def get_text_html(message: Message) -> str:
    if message.text:
        return message.text.html if hasattr(message.text, "html") else message.text
    if message.caption:
        return message.caption.html if hasattr(message.caption, "html") else message.caption
    return ""


def get_reactions_count(message: Message) -> int:
    if not message.reactions:
        return 0
    return sum(r.count for r in message.reactions.reactions)


async def scrape_channel_history(
    channel_username: str,
    limit: int = 0,
    offset_date: datetime | None = None,
) -> int:
    await init_db()
    saved_count = 0
    client = create_client()

    await client.start()
    try:
        async with async_session() as session:
            channel = await get_or_create_channel(session, client, channel_username)

            existing = await session.execute(
                select(Post.telegram_message_id).where(Post.channel_id == channel.id)
            )
            existing_ids = set(existing.scalars().all())

            print(f"[*] Scraping @{channel_username} (existing: {len(existing_ids)} posts)")

            history_kwargs = {"limit": limit}
            if offset_date is not None:
                history_kwargs["offset_date"] = offset_date

            try:
                async for message in client.get_chat_history(
                    channel_username, **history_kwargs
                ):
                    try:
                        if message.id in existing_ids:
                            continue
                        if message.service:
                            continue

                        raw_text = message.text or message.caption or ""
                        if not raw_text and not message.media:
                            continue

                        has_media, media_type = extract_media_info(message)
                        media_urls = await download_post_media(client, message, channel_username)

                        post = Post(
                            channel_id=channel.id,
                            telegram_message_id=message.id,
                            text=raw_text,
                            text_html=get_text_html(message),
                            date=message.date,
                            views=message.views or 0,
                            forwards=message.forwards or 0,
                            reactions_count=get_reactions_count(message),
                            has_media=has_media,
                            media_type=media_type,
                            media_urls=media_urls,
                        )
                        session.add(post)
                        saved_count += 1

                        if saved_count % 50 == 0:
                            await session.commit()
                            print(f"  [+] Saved {saved_count} posts...")
                    except Exception as e:
                        print(f"  [!] Error processing msg {message.id}: {e}")
                        continue
            except AttributeError as e:
                print(f"  [!] Library bug, switching to raw API: {e}")
                # Fallback: use raw messages API
                from pyrogram import raw
                offset_id = 0
                fetched = 0
                target = limit if limit > 0 else 10000
                peer = await client.resolve_peer(channel_username)
                while fetched < target:
                    batch_limit = min(100, target - fetched)
                    result = await client.invoke(
                        raw.functions.messages.GetHistory(
                            peer=peer,
                            offset_id=offset_id,
                            offset_date=0,
                            add_offset=0,
                            limit=batch_limit,
                            max_id=0,
                            min_id=0,
                            hash=0,
                        )
                    )
                    messages = result.messages
                    if not messages:
                        break
                    for msg in messages:
                        if not hasattr(msg, "message"):
                            continue
                        msg_id = msg.id
                        if msg_id in existing_ids:
                            continue
                        text = getattr(msg, "message", "") or ""
                        if not text:
                            continue
                        post = Post(
                            channel_id=channel.id,
                            telegram_message_id=msg_id,
                            text=text,
                            text_html=text,
                            date=datetime.utcfromtimestamp(msg.date),
                            views=getattr(msg, "views", 0) or 0,
                            forwards=getattr(msg, "forwards", 0) or 0,
                            reactions_count=0,
                            has_media=msg.media is not None,
                            media_type="photo" if msg.media else None,
                            media_urls=[],
                        )
                        session.add(post)
                        saved_count += 1
                    offset_id = messages[-1].id
                    fetched += len(messages)
                    await session.commit()
                    print(f"  [+] Raw API: saved {saved_count} posts...")

            await session.commit()

            channel.last_synced_at = datetime.utcnow()
            try:
                chat = await client.get_chat(channel_username)
                channel.subscribers_count = chat.members_count
            except Exception:
                pass
            await session.commit()
    finally:
        await client.stop()

    print(f"[✓] Done. New posts: {saved_count}")
    return saved_count


async def scrape_new_posts(channel_username: str) -> int:
    await init_db()
    async with async_session() as session:
        result = await session.execute(
            select(Channel).where(Channel.username == channel_username.lstrip("@"))
        )
        channel = result.scalar_one_or_none()
        if not channel:
            return await scrape_channel_history(channel_username)
        return await scrape_channel_history(
            channel_username, offset_date=channel.last_synced_at
        )


async def scrape_channel_web(channel_username: str, limit: int = 500) -> int:
    """
    Import historical posts via t.me/s/{channel} (public web pages).
    Works without MTProto — pure HTTP scraping.
    Returns count of new posts saved.
    """
    from bs4 import BeautifulSoup
    import httpx
    from database import async_session
    from models import Channel, Post

    logger = __import__("logging").getLogger(__name__)
    username = channel_username.lstrip("@")

    async with async_session() as session:
        ch_result = await session.execute(
            select(Channel).where(Channel.username == username)
        )
        channel = ch_result.scalar_one_or_none()
        if not channel:
            logger.info(f"[web_scraper] Channel @{username} not in DB, creating...")
            channel = Channel(
                telegram_id=0,
                username=username,
                title=username,
                description="",
            )
            session.add(channel)
            await session.commit()
            await session.refresh(channel)

        existing_result = await session.execute(
            select(Post.telegram_message_id).where(Post.channel_id == channel.id)
        )
        existing_ids = set(existing_result.scalars().all())

        saved = 0
        before_id: int | None = None
        headers = {"User-Agent": "Mozilla/5.0 (compatible; TGSEOBot/1.0)"}

        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            while saved < limit:
                url = f"https://t.me/s/{username}"
                if before_id:
                    url += f"?before={before_id}"

                try:
                    resp = await client.get(url, headers=headers)
                    if not resp.is_success:
                        logger.warning(f"[web_scraper] HTTP {resp.status_code} for {url}")
                        break
                except Exception as e:
                    logger.error(f"[web_scraper] Request failed: {e}")
                    break

                soup = BeautifulSoup(resp.text, "lxml")
                messages = soup.find_all("div", class_="tgme_widget_message")

                if not messages:
                    break

                new_in_batch = 0
                min_id_in_batch = None

                for msg in messages:
                    data_post = msg.get("data-post", "")
                    try:
                        msg_id = int(data_post.split("/")[-1])
                    except (ValueError, IndexError):
                        continue

                    if min_id_in_batch is None or msg_id < min_id_in_batch:
                        min_id_in_batch = msg_id

                    if msg_id in existing_ids:
                        continue

                    text_el = msg.find(class_="tgme_widget_message_text")
                    text = text_el.get_text(separator="\n").strip() if text_el else ""

                    date_el = msg.find("time")
                    raw_date = date_el.get("datetime") if date_el else None
                    try:
                        post_date = datetime.fromisoformat(raw_date.replace("Z", "+00:00")) if raw_date else datetime.utcnow()
                        post_date = post_date.replace(tzinfo=None)
                    except Exception:
                        post_date = datetime.utcnow()

                    views_el = msg.find(class_="tgme_widget_message_views")
                    views_raw = views_el.get_text().strip() if views_el else "0"
                    try:
                        views = int(views_raw.replace("K", "000").replace("M", "000000").replace(".", "").replace(",", ""))
                    except ValueError:
                        views = 0

                    has_photo = bool(msg.find(class_="tgme_widget_message_photo"))
                    has_video = bool(msg.find(class_="tgme_widget_message_video"))
                    has_media = has_photo or has_video
                    media_type = "photo" if has_photo else ("video" if has_video else None)

                    post = Post(
                        channel_id=channel.id,
                        telegram_message_id=msg_id,
                        text=text,
                        text_html=text,
                        date=post_date,
                        views=views,
                        forwards=0,
                        reactions_count=0,
                        has_media=has_media,
                        media_type=media_type,
                        media_urls=[],
                    )
                    session.add(post)
                    existing_ids.add(msg_id)
                    saved += 1
                    new_in_batch += 1

                await session.commit()
                logger.info(f"[web_scraper] Batch: {new_in_batch} new posts saved (total: {saved})")

                if min_id_in_batch is None or min_id_in_batch <= 1:
                    break

                before_id = min_id_in_batch
                await asyncio.sleep(0.5)

        channel.last_synced_at = datetime.utcnow()
        await session.commit()

    logger.info(f"[web_scraper] Done. Total new posts: {saved}")
    return saved


if __name__ == "__main__":
    import sys
    channel = sys.argv[1] if len(sys.argv) > 1 else "storyline_life_"
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    asyncio.run(scrape_channel_history(channel, limit=limit))
