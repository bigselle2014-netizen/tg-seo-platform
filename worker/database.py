from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from config import DATABASE_URL
from models import Base

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_html TEXT"
        ))
        await conn.execute(text(
            "ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_generated_at TIMESTAMP"
        ))
        await conn.execute(text(
            "ALTER TABLE channels ADD COLUMN IF NOT EXISTS messenger_type VARCHAR(20) NOT NULL DEFAULT 'telegram'"
        ))


async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session
