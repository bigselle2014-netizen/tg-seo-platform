import asyncio
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query, Header
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from config import WORKER_SECRET
from database import get_session, init_db, async_session
from models import Channel, Post, Cluster

app = FastAPI(title="TG SEO Platform API")


def verify_worker_secret(x_worker_secret: str = Header(None)):
    if not WORKER_SECRET or x_worker_secret != WORKER_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")


@app.on_event("startup")
async def startup():
    await init_db()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/channels")
async def list_channels(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Channel).where(Channel.is_active == True).order_by(Channel.title)
    )
    channels = result.scalars().all()
    return [
        {
            "id": ch.id,
            "username": ch.username,
            "title": ch.title,
            "description": ch.description,
            "avatar_url": ch.avatar_url,
            "subscribers_count": ch.subscribers_count,
            "last_synced_at": ch.last_synced_at,
        }
        for ch in channels
    ]


@app.get("/api/channels/{username}")
async def get_channel(username: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Channel).where(Channel.username == username)
    )
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(404, "Channel not found")

    posts_count = await session.execute(
        select(func.count(Post.id)).where(Post.channel_id == channel.id)
    )
    indexed_count = await session.execute(
        select(func.count(Post.id))
        .where(Post.channel_id == channel.id)
        .where(Post.is_indexed == True)
    )

    return {
        "id": channel.id,
        "username": channel.username,
        "title": channel.title,
        "description": channel.description,
        "avatar_url": channel.avatar_url,
        "subscribers_count": channel.subscribers_count,
        "posts_total": posts_count.scalar(),
        "posts_indexed": indexed_count.scalar(),
        "last_synced_at": channel.last_synced_at,
    }


@app.get("/api/channels/{username}/posts")
async def list_posts(
    username: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    indexed_only: bool = False,
    pending_only: bool = False,
    generating_only: bool = False,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Channel).where(Channel.username == username)
    )
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(404, "Channel not found")

    query = select(Post).where(Post.channel_id == channel.id)
    if indexed_only:
        query = query.where(Post.is_indexed == True)
    if pending_only:
        query = query.where(Post.seo_slug.is_(None)).where(Post.text.isnot(None)).where(func.length(Post.text) >= 100)
    if generating_only:
        query = query.where(Post.seo_slug.isnot(None)).where(Post.is_indexed == False)

    query = query.order_by(Post.date.desc())

    total_result = await session.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = total_result.scalar()

    posts_result = await session.execute(
        query.offset((page - 1) * per_page).limit(per_page)
    )
    posts = posts_result.scalars().all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "posts": [
            {
                "id": p.id,
                "telegram_message_id": p.telegram_message_id,
                "text": p.text[:300] if p.text else "",
                "date": p.date,
                "views": p.views,
                "forwards": p.forwards,
                "reactions_count": p.reactions_count,
                "has_media": p.has_media,
                "media_type": p.media_type,
                "seo_title": p.seo_title,
                "seo_description": p.seo_description,
                "seo_slug": p.seo_slug,
                "seo_keywords": p.seo_keywords,
                "is_indexed": p.is_indexed,
                "search_position": p.search_position,
                "search_impressions": p.search_impressions,
                "search_clicks": p.search_clicks,
                "google_position_prev": p.google_position_prev,
                "yandex_position": p.yandex_position,
                "yandex_position_prev": p.yandex_position_prev,
                "cluster_id": p.cluster_id,
            }
            for p in posts
        ],
    }


@app.get("/api/channels/{username}/posts/{slug}")
async def get_post(
    username: str,
    slug: str,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Channel).where(Channel.username == username)
    )
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(404, "Channel not found")

    post_result = await session.execute(
        select(Post)
        .where(Post.channel_id == channel.id)
        .where(Post.seo_slug == slug)
    )
    post = post_result.scalar_one_or_none()
    if not post:
        raise HTTPException(404, "Post not found")

    # Related posts from same cluster
    related = []
    if post.cluster_id:
        related_result = await session.execute(
            select(Post)
            .where(Post.cluster_id == post.cluster_id)
            .where(Post.id != post.id)
            .where(Post.seo_slug.isnot(None))
            .order_by(Post.views.desc())
            .limit(3)
        )
        related = [
            {
                "seo_title": r.seo_title,
                "seo_slug": r.seo_slug,
                "seo_description": r.seo_description,
                "date": r.date,
            }
            for r in related_result.scalars().all()
        ]

    return {
        "id": post.id,
        "telegram_message_id": post.telegram_message_id,
        "channel": {
            "username": channel.username,
            "title": channel.title,
            "avatar_url": channel.avatar_url,
            "description": channel.description,
        },
        "text": post.text,
        "text_html": post.text_html,
        "date": post.date,
        "views": post.views,
        "forwards": post.forwards,
        "reactions_count": post.reactions_count,
        "has_media": post.has_media,
        "media_type": post.media_type,
        "media_urls": post.media_urls,
        "seo_title": post.seo_title,
        "seo_h1": post.seo_h1,
        "seo_description": post.seo_description,
        "seo_slug": post.seo_slug,
        "seo_keywords": post.seo_keywords,
        "is_indexed": post.is_indexed,
        "article_html": post.article_html,
        "content_html": post.content_html,
        "related_posts": related,
    }


@app.post("/api/channels/{username}/scrape")
async def trigger_scrape(username: str, _: None = Depends(verify_worker_secret)):
    """Trigger scraping for a channel (runs in background)."""
    from telegram_scraper import scrape_new_posts
    asyncio.create_task(scrape_new_posts(username))
    return {"status": "scraping started", "channel": username}


@app.post("/api/channels/{username}/scrape-web")
async def trigger_web_scrape(
    username: str,
    limit: int = Query(500, ge=1, le=2000),
    _: None = Depends(verify_worker_secret),
):
    """Import history via t.me/s/ web scraping. Works without MTProto."""
    from telegram_scraper import scrape_channel_web
    asyncio.create_task(scrape_channel_web(username, limit=limit))
    return {"status": "web scraping started", "channel": username, "limit": limit}


@app.post("/api/posts/{post_id}/promote")
async def promote_post(
    post_id: int,
    session: AsyncSession = Depends(get_session),
    _: None = Depends(verify_worker_secret),
):
    """Manually trigger SEO generation for a single post."""
    from content_pipeline import process_post

    result = await session.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(404, "Post not found")

    asyncio.create_task(process_post(post_id))
    return {"status": "started", "post_id": post_id}


@app.post("/api/channels/{username}/generate-meta")
async def trigger_meta_generation(
    username: str,
    batch_size: int = Query(20, ge=1, le=100),
    _: None = Depends(verify_worker_secret),
):
    """Trigger SEO meta generation for posts without meta."""
    from content_pipeline import process_channel

    asyncio.create_task(process_channel(username, batch_size=batch_size))
    return {"status": "meta generation started", "channel": username, "batch_size": batch_size}


class NewPostPayload(BaseModel):
    message_id: int
    text: str
    date: int
    has_media: bool = False


@app.post("/api/channels/{username}/new-post")
async def handle_new_post(
    username: str,
    payload: NewPostPayload,
    session: AsyncSession = Depends(get_session),
    _: None = Depends(verify_worker_secret),
):
    """Handle new post notification from Telegram Bot webhook."""
    from content_pipeline import process_post

    result = await session.execute(
        select(Channel).where(Channel.username == username)
    )
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(404, "Channel not found")

    existing = await session.execute(
        select(Post)
        .where(Post.channel_id == channel.id)
        .where(Post.telegram_message_id == payload.message_id)
    )
    if existing.scalar_one_or_none():
        return {"status": "already_exists"}

    post = Post(
        channel_id=channel.id,
        telegram_message_id=payload.message_id,
        text=payload.text,
        text_html=payload.text,
        date=datetime.utcfromtimestamp(payload.date),
        views=0,
        forwards=0,
        reactions_count=0,
        has_media=payload.has_media,
        media_type="photo" if payload.has_media else None,
        media_urls=[],
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)

    asyncio.create_task(process_post(post.id))

    return {"status": "ok", "post_id": post.id}


# ─── MAX endpoints ────────────────────────────────────────────────────────────

class MaxNewPostPayload(BaseModel):
    channel_username: str
    message: dict


@app.post("/api/max/new-post")
async def handle_max_new_post(payload: MaxNewPostPayload, _: None = Depends(verify_worker_secret)):
    from max_scraper import handle_max_new_post as _handle
    asyncio.create_task(_handle(payload.channel_username, payload.message))
    return {"status": "ok"}


class MaxScrapePayload(BaseModel):
    channel_username: str
    max_chat_id: int
    limit: int = 200


@app.post("/api/max/scrape")
async def trigger_max_scrape(payload: MaxScrapePayload, _: None = Depends(verify_worker_secret)):
    from max_scraper import scrape_max_channel_history
    asyncio.create_task(scrape_max_channel_history(
        payload.channel_username, payload.max_chat_id, payload.limit
    ))
    return {"status": "scraping started"}


class MaxChannelRegisterPayload(BaseModel):
    channel_username: str
    max_chat_id: int
    channel_title: str = ""


@app.post("/api/max/register-channel")
async def register_max_channel(
    payload: MaxChannelRegisterPayload,
    session: AsyncSession = Depends(get_session),
    _: None = Depends(verify_worker_secret),
):
    result = await session.execute(
        select(Channel)
        .where(Channel.username == payload.channel_username)
        .where(Channel.messenger_type == "max")
    )
    channel = result.scalar_one_or_none()

    if not channel:
        channel = Channel(
            telegram_id=payload.max_chat_id,
            username=payload.channel_username,
            title=payload.channel_title or payload.channel_username,
            description="",
            messenger_type="max",
        )
        session.add(channel)
        await session.commit()

    return {"status": "ok", "channel_id": channel.id}


# ─── SEO Audit ───────────────────────────────────────────────────────────────

class AnalyzeChannelPayload(BaseModel):
    channel_id: Optional[int] = None
    channel_username: Optional[str] = None


@app.post("/analyze-channel")
async def analyze_channel_endpoint(
    payload: AnalyzeChannelPayload,
    _: None = Depends(verify_worker_secret),
    session: AsyncSession = Depends(get_session),
):
    """Run SEO audit for a channel. Accepts channel_id (int) or channel_username (str)."""
    from content_pipeline import analyze_channel

    # Resolve channel_id from username if not provided
    channel_id = payload.channel_id
    if not channel_id and payload.channel_username:
        result_ch = await session.execute(
            select(Channel).where(Channel.username == payload.channel_username)
        )
        ch = result_ch.scalar_one_or_none()
        if not ch:
            raise HTTPException(404, f"Channel '{payload.channel_username}' not found in worker DB")
        channel_id = ch.id

    if not channel_id:
        raise HTTPException(422, "Provide channel_id (int) or channel_username (str)")

    try:
        result = await analyze_channel(channel_id)

        if result.get("audit_text"):
            import os, httpx, logging
            frontend_url = os.getenv("FRONTEND_URL", "http://frontend:3000")
            worker_secret = os.getenv("WORKER_SECRET", "")
            try:
                async with async_session() as sess:
                    wch = await sess.get(Channel, channel_id)
                    ch_username = wch.username if wch else None

                if ch_username:
                    async with httpx.AsyncClient(timeout=10) as http:
                        await http.post(
                            f"{frontend_url}/api/notify/audit-done",
                            json={
                                "channel_username": ch_username,
                                "audit_text": result["audit_text"],
                                "indexable_count": result.get("indexable_count", 0),
                            },
                            headers={"X-Worker-Secret": worker_secret},
                        )
            except Exception as e:
                logging.getLogger(__name__).warning(f"[audit] notify failed: {e}")

        return result
    except ValueError as e:
        raise HTTPException(404, str(e))


# ─── Sitemap ──────────────────────────────────────────────────────────────────

@app.get("/api/sitemap/{username}")
async def sitemap_data(
    username: str,
    session: AsyncSession = Depends(get_session),
):
    """Return all indexed posts for sitemap generation."""
    result = await session.execute(
        select(Channel).where(Channel.username == username)
    )
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(404, "Channel not found")

    posts_result = await session.execute(
        select(Post.seo_slug, Post.date, Post.seo_title)
        .where(Post.channel_id == channel.id)
        .where(Post.seo_slug.isnot(None))
        .order_by(Post.date.desc())
    )
    posts = posts_result.all()

    return {
        "channel": {
            "username": channel.username,
            "title": channel.title,
            "updated_at": channel.updated_at,
        },
        "posts": [
            {"slug": p.seo_slug, "date": p.date, "title": p.seo_title}
            for p in posts
        ],
    }
