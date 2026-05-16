# ТЗ — MAX SEO Module
Версия: 1.0
Дата: 2026-05-01
Статус: ГОТОВО К РАЗРАБОТКЕ

---

## ЦЕЛЬ

Добавить поддержку MAX мессенджера в существующий tg-seo-platform без переписывания
существующего кода. AI-пайплайн, SEO-страницы, IndexNow, аналитика — без изменений.
Меняем только: БД схема + MAX scraper + MAX webhook + dashboard UI.

---

## ЧТО НЕ ДЕЛАЕМ (границы задачи)

- НЕ переписываем content_pipeline.py — он уже умеет работать с любым текстом
- НЕ меняем SEO-страницы /[channel]/[slug]/ — они рендерят posts из БД, не важно откуда
- НЕ меняем meta_generator.py
- НЕ меняем sitemap, robots, analytics
- НЕ делаем invite link tracking для MAX (нет API) — используем UTM + delta

---

## ВЛАДЕЛЬЦЫ РЕСУРСОВ (по методологии)

| Ресурс | Текущий владелец | Изменение |
|---|---|---|
| `channel_owners` таблица (Drizzle) | `/api/channels` route | Добавляем колонку `messenger_type`, меняем UNIQUE constraint |
| `channels` таблица (SQLAlchemy) | `telegram_scraper.py`, `api.py` | Добавляем колонку `messenger_type`, `max_chat_id` |
| `posts` таблица | `telegram_scraper.py`, `content_pipeline.py` | Не меняем (telegram_message_id реиспользуем) |
| `content_pipeline.process_post()` | `api.py` (вызывает после import) | Не меняем — работает с любым post.id |
| Dashboard `/dashboard/page.tsx` | Показывает channelOwners | Добавляем badge "MAX" / "TG", другой текст для бота |
| `/api/channels/route.ts` | Регистрирует каналы | Принимает `messengerType` в body |
| worker config | `config.py` | Добавляем `MAX_BOT_TOKEN`, `MAX_BOT_USERNAME` |

---

## АРХИТЕКТУРНЫЕ РЕШЕНИЯ

### 1. Единая таблица channels/channelOwners с полем messenger_type

**Почему:** content_pipeline, api.py, SEO страницы не знают о типе мессенджера.
Добавление отдельных таблиц дублирует 90% кода.
Поле `messenger_type: "telegram" | "max"` решает задачу минимальным изменением.

**Уникальность:** сейчас `channelUsername` UNIQUE. После изменения — UNIQUE(channelUsername, messengerType).
Один и тот же username @news может существовать в Telegram И в MAX.

### 2. Реиспользуем telegram_id / telegram_message_id

**Почему:** это просто BigInteger. MAX chat_id тоже BigInteger. Переименовывать —
сломаем все существующие запросы. Пространства ID Telegram и MAX не пересекаются
(Telegram: signed 64-bit, MAX: тоже signed 64-bit, но генерируются независимо).
Риск коллизии: пренебрежимо мал.

### 3. MAX scraper — прямые httpx запросы, без библиотек

**Почему:** MAX Bot API — REST. httpx уже используется в content_pipeline.py.
Зависимости от maxapi/pyromax не нужны — они добавляют сложность без пользы.

### 4. MAX Webhook — отдельный route /api/webhook/max

**Почему:** Telegram и MAX имеют разные форматы событий.
Смешивать в одном handler'е — source of confusion.

---

## ИЗМЕНЕНИЯ ПО ФАЙЛАМ (детально)

---

### ФАЙЛ 1: `frontend/src/db/schema.ts`

**Что меняем:**

а) Добавить enum для типа мессенджера:
```typescript
export const messengerEnum = pgEnum("messenger_type", ["telegram", "max"])
```

б) В таблицу `channelOwners` добавить поле:
```typescript
messengerType: messengerEnum("messenger_type").notNull().default("telegram"),
```

в) Убрать `.unique()` с поля `channelUsername`, добавить составной unique index:
```typescript
}, (table) => ({
  usernameMessengerUnique: unique().on(table.channelUsername, table.messengerType),
}))
```

**Полная финальная таблица channelOwners:**
```typescript
export const channelOwners = pgTable("channel_owners", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channelUsername: text("channel_username").notNull(),
  messengerType: messengerEnum("messenger_type").notNull().default("telegram"),
  channelTgId: text("channel_tg_id"),    // для TG: telegram chat_id; для MAX: max chat_id
  channelTitle: text("channel_title"),
  botIsAdmin: boolean("bot_is_admin").notNull().default(false),
  inviteLink: text("invite_link"),        // для TG: invite link; для MAX: utm link
  status: text("status").notNull().default("pending"),
  postsIndexed: integer("posts_indexed").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  usernameMessengerUnique: unique("channel_owners_username_messenger_unique")
    .on(table.channelUsername, table.messengerType),
}))
```

**Импорт unique:**
```typescript
import { pgTable, text, integer, boolean, timestamp, pgEnum, unique } from "drizzle-orm/pg-core"
```

---

### ФАЙЛ 2: `worker/models.py`

**Что меняем:** добавляем поле `messenger_type` в Channel:

```python
messenger_type = Column(String(20), default="telegram", nullable=False)
```

Добавить после `last_synced_at` в классе Channel.

---

### ФАЙЛ 3: `worker/database.py`

**Что меняем:** добавляем ALTER TABLE в init_db():

```python
await conn.execute(text(
    "ALTER TABLE channels ADD COLUMN IF NOT EXISTS messenger_type VARCHAR(20) NOT NULL DEFAULT 'telegram'"
))
```

---

### ФАЙЛ 4: `worker/config.py`

**Добавить:**
```python
MAX_BOT_TOKEN = os.getenv("MAX_BOT_TOKEN", "")
MAX_BOT_USERNAME = os.getenv("MAX_BOT_USERNAME", "")
```

---

### ФАЙЛ 5 (НОВЫЙ): `worker/max_scraper.py`

**Назначение:** читать историю MAX-канала через Bot API и сохранять посты.

```python
"""
MAX SEO Scraper — читает историю MAX-канала через Bot API.
API: platform-api.max.ru
Docs: dev.max.ru/docs-api/methods/GET/messages
"""
import asyncio
import logging
from datetime import datetime

import httpx
from sqlalchemy import select

from config import MAX_BOT_TOKEN
from database import async_session, init_db
from models import Channel, Post

logger = logging.getLogger(__name__)

MAX_API_BASE = "https://platform-api.max.ru"


def _auth_headers() -> dict:
    if not MAX_BOT_TOKEN:
        raise RuntimeError("MAX_BOT_TOKEN is not set")
    return {"Authorization": MAX_BOT_TOKEN}


async def get_max_channel_info(chat_id: int) -> dict:
    """GET /chats/{chatId} — получить информацию о канале."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{MAX_API_BASE}/chats/{chat_id}",
            headers=_auth_headers(),
        )
        resp.raise_for_status()
        return resp.json()


async def get_max_messages(chat_id: int, count: int = 100, from_ts: int | None = None) -> list[dict]:
    """GET /messages?chat_id=X&count=Y — получить последние N сообщений канала."""
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
    """Извлечь текст из объекта сообщения MAX."""
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
    """
    Импортировать историю MAX-канала.
    channel_username — username без @, уже есть в таблице channels.
    max_chat_id — числовой ID канала в MAX.
    """
    await init_db()
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
                post_url = msg.get("url", "")  # max.ru/c/-CHANNEL_ID/POST_ID

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
                saved_count += 1

            if saved_count % 50 == 0 and saved_count > 0:
                await session.commit()
                logger.info(f"[max_scraper] Saved {saved_count} posts...")

            # Пагинация: следующий батч с timestamp последнего сообщения
            last_ts = messages[-1].get("timestamp")
            if last_ts:
                from_ts = last_ts
            fetched += len(messages)

            if len(messages) < batch_count:
                break

            await asyncio.sleep(0.2)  # rate limit: 30 RPS

        await session.commit()
        channel.last_synced_at = datetime.utcnow()
        await session.commit()

    logger.info(f"[max_scraper] Done. New posts: {saved_count}")
    return saved_count


async def handle_max_new_post(channel_username: str, message: dict) -> bool:
    """
    Обработать одно новое сообщение из MAX webhook.
    Сохраняет пост и ставит в очередь content_pipeline.
    """
    await init_db()

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

        # Запустить AI пайплайн
        from content_pipeline import process_post
        asyncio.create_task(process_post(post.id))

        logger.info(f"[max_scraper] New MAX post saved: {post.id}")
        return True
```

---

### ФАЙЛ 6 (НОВЫЙ): `frontend/src/app/api/webhook/max/route.ts`

**Назначение:** получать webhook события от MAX Bot API.

```typescript
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { channelOwners } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const event = await req.json()

    // MAX Bot API event structure: { update_type, message?, ... }
    if (event.update_type !== "message_created") {
      return NextResponse.json({ ok: true })
    }

    const message = event.message
    if (!message || message.recipient?.chat_type !== "channel") {
      return NextResponse.json({ ok: true })
    }

    const chatId = String(message.recipient?.chat_id || "")
    if (!chatId) return NextResponse.json({ ok: true })

    // Найти канал по MAX chat_id
    const channel = await db
      .select({ channelUsername: channelOwners.channelUsername })
      .from(channelOwners)
      .where(and(
        eq(channelOwners.channelTgId, chatId),
        eq(channelOwners.messengerType, "max"),
        eq(channelOwners.botIsAdmin, true),
      ))
      .limit(1)
      .then(r => r[0] ?? null)

    if (!channel) return NextResponse.json({ ok: true })

    // Передать в Python worker
    const workerUrl = process.env.WORKER_API_URL || "http://worker:8000"
    fetch(`${workerUrl}/api/max/new-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel_username: channel.channelUsername,
        message,
      }),
    }).catch(() => {/* fire-and-forget */})

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[max webhook] Error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
```

---

### ФАЙЛ 7: `worker/api.py`

**Добавить три endpoint'а** (в конец файла, после существующих):

```python
# ─── MAX endpoints ────────────────────────────────────────────────────────────

class MaxNewPostPayload(BaseModel):
    channel_username: str
    message: dict

@app.post("/api/max/new-post")
async def handle_max_new_post(payload: MaxNewPostPayload):
    """Обработать новый пост из MAX webhook."""
    from max_scraper import handle_max_new_post as _handle
    asyncio.create_task(_handle(payload.channel_username, payload.message))
    return {"status": "ok"}


class MaxScrapePayload(BaseModel):
    channel_username: str
    max_chat_id: int
    limit: int = 200

@app.post("/api/max/scrape")
async def trigger_max_scrape(payload: MaxScrapePayload):
    """Запустить импорт истории MAX-канала."""
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
):
    """Создать запись Channel в БД для MAX-канала при первой регистрации."""
    result = await session.execute(
        select(Channel)
        .where(Channel.username == payload.channel_username)
        .where(Channel.messenger_type == "max")
    )
    channel = result.scalar_one_or_none()

    if not channel:
        channel = Channel(
            telegram_id=payload.max_chat_id,  # MAX chat_id в поле telegram_id
            username=payload.channel_username,
            title=payload.channel_title or payload.channel_username,
            description="",
            messenger_type="max",
        )
        session.add(channel)
        await session.commit()

    return {"status": "ok", "channel_id": channel.id}
```

---

### ФАЙЛ 8: `frontend/src/app/api/channels/route.ts`

**Изменение:** принимать `messengerType` в теле запроса.

В POST handler изменить:
- Принимать `body.messengerType` (default: `"telegram"`)
- Валидировать MAX username отдельно (может содержать цифры и минусы для ID-форм)
- Проверять уникальность по `(username, messengerType)` вместо только `username`

```typescript
// В начале POST handler добавить:
const messengerType = (body.messengerType === "max") ? "max" : "telegram"

// Валидация username — более мягкая для MAX:
const usernameRegex = messengerType === "max"
  ? /^[a-zA-Z0-9_.\-]{2,}$/   // MAX: допускает точки и дефисы
  : /^[a-zA-Z0-9_]{3,}$/       // Telegram: только буквы, цифры, подчёркивание

// Проверка уникальности:
const existing = await db
  .select()
  .from(channelOwners)
  .where(and(
    eq(channelOwners.channelUsername, username),
    eq(channelOwners.messengerType, messengerType),
  ))
  .limit(1)

// При создании:
.values({
  userId: session.user.id,
  channelUsername: username,
  messengerType,
  status: "pending",
})
```

---

### ФАЙЛ 9: `frontend/src/app/dashboard/channels/add/page.tsx`

**Изменение:** добавить выбор мессенджера (Telegram / MAX).

Добавить radio group перед полем username:
```
● Telegram-канал
○ MAX-канал
```

При выборе MAX — менять placeholder и инструкцию ("Добавьте @max_buster_bot").

---

### ФАЙЛ 10: `frontend/src/app/dashboard/page.tsx`

**Изменение:** показывать тип мессенджера, разные инструкции для бота.

В карточке канала:
- Badge: `TG` (синий) / `MAX` (оранжевый)
- Подсказка при `!botIsAdmin`:
  - Telegram: "Добавьте @tg_buster_bot как администратора"
  - MAX: "Добавьте @max_buster_bot как администратора в MAX"

---

### ФАЙЛ 11: `frontend/src/app/api/channels/[id]/activate/route.ts`

**Изменение:** при активации MAX-канала — вызывать `/api/max/register-channel` и `/api/max/scrape` вместо Telegram endpoints.

Читать `messengerType` из channelOwners записи, роутить соответственно.

---

### ФАЙЛ 12: `.env.worker`

**Добавить:**
```
MAX_BOT_TOKEN=<токен MAX бота>
MAX_BOT_USERNAME=max_buster_bot
```

---

### ФАЙЛ 13: `.env.frontend`

**Добавить:**
```
MAX_BOT_USERNAME=max_buster_bot
```

---

## СХЕМА БД — итоговые изменения

### Новый тип в PostgreSQL:
```sql
CREATE TYPE messenger_type AS ENUM ('telegram', 'max');
```

### channel_owners:
```sql
ALTER TABLE channel_owners ADD COLUMN IF NOT EXISTS messenger_type messenger_type NOT NULL DEFAULT 'telegram';
ALTER TABLE channel_owners DROP CONSTRAINT IF EXISTS channel_owners_channel_username_unique;
CREATE UNIQUE INDEX IF NOT EXISTS channel_owners_username_messenger_unique
  ON channel_owners(channel_username, messenger_type);
```

### channels (Python worker):
```sql
ALTER TABLE channels ADD COLUMN IF NOT EXISTS messenger_type VARCHAR(20) NOT NULL DEFAULT 'telegram';
```

---

## ACCEPTANCE CRITERIA

| # | Критерий | Проверка |
|---|---|---|
| 1 | `python3 -m py_compile max_scraper.py` | OK без ошибок |
| 2 | `npm run build` | ✓ Compiled successfully |
| 3 | `channel_owners` содержит колонку `messenger_type` | SQL SELECT |
| 4 | Можно зарегистрировать @news как Telegram И @news как MAX одновременно | INSERT без конфликта |
| 5 | POST `/api/channels` с `messengerType: "max"` создаёт MAX-запись | 201 Created |
| 6 | Dashboard показывает badge TG/MAX для каждого канала | визуально |
| 7 | Webhook `/api/webhook/max` принимает MAX event без ошибок | 200 OK |
| 8 | `GET /api/max/scrape` запускает импорт (asyncio.create_task) | логи worker |
| 9 | Существующие Telegram-каналы не затронуты | проверить @tg_buster_bot flow |
| 10 | TypeScript: `messengerType` типизирован как `"telegram" \| "max"` | без any |

---

## ПРОВЕРЕННЫЕ ДОПУЩЕНИЯ

| Допущение | Проверено | Вывод |
|---|---|---|
| MAX Bot API GET /messages возвращает посты канала | dev.max.ru/docs-api | ✅ Да, параметр chat_id |
| MAX timestamp в миллисекундах (не секундах) | анализ API структуры | ✅ Да, /1000 для datetime |
| MAX message_id — уникальный BigInteger | dev.max.ru/docs-api objects/Message | ✅ Да |
| telegram_id/telegram_message_id можно реиспользовать | анализ схемы | ✅ Да, просто BigInteger |
| content_pipeline.py работает без изменений | читали весь файл | ✅ Да, принимает post.id |
| SEO страницы работают без изменений | читали page.tsx | ✅ Да, рендерят posts из БД |

---

## ПОРЯДОК ВЫПОЛНЕНИЯ

```
1. schema.ts   → добавить messengerEnum + обновить channelOwners
2. SQL migration → ALTER TABLE channel_owners + channels
3. models.py   → добавить messenger_type в Channel
4. database.py → ALTER TABLE в init_db()
5. config.py   → MAX_BOT_TOKEN, MAX_BOT_USERNAME
6. max_scraper.py → новый файл
7. api.py      → 3 новых endpoint'а
8. /api/webhook/max/route.ts → новый файл
9. /api/channels/route.ts → принять messengerType
10. /api/channels/[id]/activate/route.ts → роутинг по типу
11. dashboard/page.tsx → badge TG/MAX
12. dashboard/channels/add/page.tsx → выбор мессенджера
13. .env.worker + .env.frontend → MAX_BOT_TOKEN

После всего: npm run build + py_compile + acceptance criteria
```
