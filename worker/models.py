from datetime import datetime
from sqlalchemy import (
    Column, Integer, BigInteger, String, Text, DateTime, Float,
    Boolean, ForeignKey, JSON, Index, UniqueConstraint
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Channel(Base):
    __tablename__ = "channels"

    id = Column(Integer, primary_key=True)
    telegram_id = Column(BigInteger, nullable=False)
    username = Column(String(255), unique=True, nullable=False)
    title = Column(String(500))
    description = Column(Text)
    avatar_url = Column(String(1000))
    subscribers_count = Column(Integer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_synced_at = Column(DateTime)
    messenger_type = Column(String(20), default="telegram", nullable=False)

    posts = relationship("Post", back_populates="channel", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("telegram_id", "messenger_type", name="uq_channel_tgid_messenger"),
    )


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False)
    telegram_message_id = Column(BigInteger, nullable=False)
    text = Column(Text)
    text_html = Column(Text)
    date = Column(DateTime, nullable=False)
    views = Column(Integer)
    forwards = Column(Integer)
    reactions_count = Column(Integer)
    has_media = Column(Boolean, default=False)
    media_type = Column(String(50))
    media_urls = Column(JSON, default=list)
    is_indexed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # SEO fields
    seo_title = Column(String(70))
    seo_h1 = Column(String(200))
    seo_description = Column(String(160))
    seo_slug = Column(String(300))
    seo_keywords = Column(JSON, default=list)
    seo_generated_at = Column(DateTime)

    # AI article content (тело статьи 1500-3000 слов)
    article_html = Column(Text)
    article_generated_at = Column(DateTime)

    # FAQ HTML (5-7 вопросов с QBST покрытием)
    content_html = Column(Text)
    content_generated_at = Column(DateTime)

    # Google Search Console позиции
    search_position = Column(Float)
    search_impressions = Column(Integer)
    search_clicks = Column(Integer)
    search_synced_at = Column(DateTime)
    google_position_prev = Column(Float)

    # Yandex Webmaster позиции
    yandex_position = Column(Float)
    yandex_position_prev = Column(Float)
    yandex_synced_at = Column(DateTime)

    # Clustering
    cluster_id = Column(Integer, ForeignKey("clusters.id"))

    channel = relationship("Channel", back_populates="posts")
    cluster = relationship("Cluster", back_populates="posts")

    __table_args__ = (
        Index("ix_post_channel_msg", "channel_id", "telegram_message_id", unique=True),
        Index("ix_post_date", "date"),
        Index("ix_post_indexed", "is_indexed"),
        Index("ix_post_slug", "channel_id", "seo_slug", unique=True),
    )


class Cluster(Base):
    __tablename__ = "clusters"

    id = Column(Integer, primary_key=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False)
    name = Column(String(300))
    slug = Column(String(300))
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    posts = relationship("Post", back_populates="cluster")
