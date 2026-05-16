# AGENTS-KB — База знаний агентов Post SEO
> Читать КАЖДЫМ агентом перед началом работы.
> Обновлено: 2026-05-15

---

## 🔴 ПРАВИЛО 0 — Только реальные данные. Никогда из головы.

Перед любым Edit — прочитай актуальный файл:
```bash
# Скачать файл с сервера:
scp root@155.212.141.8:/opt/tg-seo-platform/frontend/src/.../file.tsx /tmp/file.tsx
# Прочитай /tmp/file.tsx целиком, потом редактируй
```

---

## СТЕК (актуальный на 2026-05-15)

| Компонент | Технология | Путь |
|-----------|-----------|------|
| Frontend | Next.js 15 App Router, TypeScript, Tailwind v4 | `frontend/` |
| Auth | Better Auth + Telegram Login | `frontend/src/lib/auth.ts` |
| ORM | Drizzle ORM | `frontend/src/db/` |
| Worker | Python FastAPI + SQLAlchemy 2.0 async | `worker/` |
| DB | PostgreSQL 16 (Docker контейнер) | `postgres` service |
| Деплой | Docker Compose на Beget VPS | `/opt/tg-seo-platform/` |
| AI | DeepSeek API (основной) + toolselfizal.ru (SEO статьи) | `worker/config.py` |
| Индексация | IndexNow (Яндекс + Bing) | `worker/content_pipeline.py` |

**НЕТ в проекте:** BullMQ, Redis, Supabase, Hetzner, Vercel, Pyrogram (Telegram userbot заблокирован на Beget)

---

## КОМАНДЫ (копируй и используй)

### SSH и файлы

```bash
# Войти на сервер
ssh root@155.212.141.8

# Скопировать файл на сервер (frontend)
scp /Users/vagiz/Documents/Projects/tg-seo-platform/frontend/src/PATH/file.tsx \
    root@155.212.141.8:/opt/tg-seo-platform/frontend/src/PATH/file.tsx

# Скопировать файл на сервер (worker)
scp /Users/vagiz/Documents/Projects/tg-seo-platform/worker/file.py \
    root@155.212.141.8:/opt/tg-seo-platform/worker/file.py
```

### Docker

```bash
# Статус контейнеров
ssh root@155.212.141.8 "docker compose -f /opt/tg-seo-platform/docker-compose.yml ps"

# Build и restart frontend
ssh root@155.212.141.8 "cd /opt/tg-seo-platform && docker compose build frontend 2>&1 | tail -10 && docker compose up -d frontend"

# Build и restart worker
ssh root@155.212.141.8 "cd /opt/tg-seo-platform && docker compose build worker && docker compose up -d worker"

# Логи frontend (последние 2 мин)
ssh root@155.212.141.8 "docker compose -f /opt/tg-seo-platform/docker-compose.yml logs frontend --since=2m 2>&1 | tail -30"

# Логи worker
ssh root@155.212.141.8 "docker compose -f /opt/tg-seo-platform/docker-compose.yml logs worker --since=2m 2>&1 | tail -30"
```

### PostgreSQL

```bash
# Выполнить SQL (frontend DB)
ssh root@155.212.141.8 "docker compose -f /opt/tg-seo-platform/docker-compose.yml exec -T postgres \
  psql -U tgseo_user -d tgseo -c 'SELECT ...;' 2>&1"

# Список таблиц
ssh root@155.212.141.8 "docker compose -f /opt/tg-seo-platform/docker-compose.yml exec -T postgres \
  psql -U tgseo_user -d tgseo -c '\dt' 2>&1"
```

### Worker API (внутренний)

```bash
# Запустить analyze_channel (channel_id = INTEGER из таблицы channels в worker)
ssh root@155.212.141.8 "docker compose -f /opt/tg-seo-platform/docker-compose.yml exec -T worker \
  curl -s -X POST http://localhost:8000/analyze-channel \
  -H 'X-Worker-Secret: [SECRET_FROM_ENV]' \
  -H 'Content-Type: application/json' \
  -d '{\"channel_id\": 2}'"

# Запустить promote поста
ssh root@155.212.141.8 "docker compose -f /opt/tg-seo-platform/docker-compose.yml exec -T worker \
  curl -s -X POST http://localhost:8000/api/posts/[POST_ID]/promote \
  -H 'X-Worker-Secret: [SECRET]'"
```

### Проверка деплоя

```bash
# Frontend отдаёт 307 (redirect к auth) = OK
ssh root@155.212.141.8 "curl -s -o /dev/null -w '%{http_code}' http://localhost:8200/dashboard"

# Mini App отдаёт 200 = OK
ssh root@155.212.141.8 "curl -s -o /dev/null -w '%{http_code}' http://localhost:8200/mini"
```

---

## ПАТТЕРНЫ КОДА

### Frontend API route (Next.js)

```typescript
// frontend/src/app/api/channels/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { channelOwners } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const [channel] = await db.select().from(channelOwners)
    .where(and(eq(channelOwners.id, id), eq(channelOwners.userId, session.user.id)))
    .limit(1)

  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(channel)
}
```

### Mini App API route (проверка через x-mini-user-id header)

```typescript
// frontend/src/app/api/mini/channels/[id]/route.ts
export async function GET(req: NextRequest, ...) {
  const userId = req.headers.get("x-mini-user-id")  // ← Mini App auth
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // ...
}
```

### DB schema (Drizzle)

```typescript
// frontend/src/db/schema.ts
export const channelOwners = pgTable("channel_owners", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channelUsername: text("channel_username").notNull(),
  autoPublish: boolean("auto_publish").notNull().default(true),
  seoAuditText: text("seo_audit_text"),        // ← текст аудита канала
  seoAuditedAt: timestamp("seo_audited_at"),
  // ...
})
```

### Worker endpoint (FastAPI)

```python
# worker/api.py
@app.post("/api/posts/{post_id}/promote")
async def promote_post(
    post_id: int,
    _: None = Depends(verify_worker_secret),
    session: AsyncSession = Depends(get_session),
):
    # ...
```

### Вызов Worker из Frontend

```typescript
const WORKER_URL = process.env.WORKER_API_URL || "http://worker:8000"
const WORKER_SECRET = process.env.WORKER_SECRET || ""

const res = await fetch(`${WORKER_URL}/api/posts/${postId}/promote`, {
  method: "POST",
  headers: { "X-Worker-Secret": WORKER_SECRET },
  signal: AbortSignal.timeout(10_000),
})
```

---

## КЛЮЧЕВЫЕ ИДЕНТИФИКАТОРЫ

| Объект | Тип ID | Где используется |
|--------|--------|-----------------|
| `channelOwners.id` | UUID (text) | Frontend DB, Mini App API |
| `channels.id` в worker | INTEGER | Worker DB, worker API endpoints |
| `posts.id` | INTEGER | Worker DB, worker API |
| `users.id` | text | Frontend DB |

**Важно:** `channelOwners.id` (UUID) ≠ `channels.id` (integer). Связь только через `channelUsername`.

---

## ТИПИЧНЫЕ ОШИБКИ И РЕШЕНИЯ

### TypeScript build fail
```bash
# Смотри полный вывод build
ssh root@155.212.141.8 "cd /opt/tg-seo-platform && docker compose build frontend 2>&1 | grep -A 5 'error\|Error\|failed'"
```

### Worker не видит обновление кода
```bash
# Убедись что build прошёл с новым кодом
ssh root@155.212.141.8 "cd /opt/tg-seo-platform && docker compose build worker --no-cache 2>&1 | tail -5"
```

### Frontend container unhealthy
```bash
# Обычно норма при старте — healthcheck проверяет /mini который требует прогрева
# Проверить реальный статус:
ssh root@155.212.141.8 "curl -s http://localhost:8200/mini | head -100"
```

### Новое поле в channelOwners не работает
1. Добавить в `frontend/src/db/schema.ts`
2. SQL миграция на сервере: `ALTER TABLE channel_owners ADD COLUMN IF NOT EXISTS ...`
3. Добавить поле в API response где нужно
4. Rebuild frontend

### Worker channel_id integer vs UUID
- Worker API принимает INTEGER (из таблицы `channels`)
- Frontend API принимает UUID (из таблицы `channel_owners`)
- Для связи используй `channelUsername`

---

## СТРУКТУРА MINI APP

```
MiniApp.tsx         ← роутинг экранов (channels / channel / posts / settings)
  ChannelList.tsx   ← список каналов пользователя
  ChannelDashboard.tsx ← карточка канала + статистика
  PostsList.tsx     ← список постов (главный экран)
  ChannelSettings.tsx ← настройки канала
```

API Mini App: `/api/mini/...` — авторизация через `x-mini-user-id` header (JWT token)

---

## СТРУКТУРА WEB DASHBOARD

```
/dashboard                        ← список каналов
/dashboard/channels/[id]/posts    ← публикации (основная страница)
/dashboard/channels/[id]/analytics← аналитика
/dashboard/channels/[id]/settings ← настройки канала
/dashboard/profile                ← профиль пользователя
/docs/*                           ← документация (5 страниц)
```

---

## ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ

| Переменная | Файл | Что это |
|-----------|------|---------|
| `WORKER_SECRET` | `.env.frontend`, `.env.worker` | Секрет для inter-service auth |
| `WORKER_API_URL` | `.env.frontend` | `http://worker:8000` (internal Docker network) |
| `NEXT_PUBLIC_SITE_URL` | `.env.frontend` | `https://post-seo.seo-rezult.ru` |
| `TELEGRAM_BOT_TOKEN` | `.env.worker` | Токен бота @tg_buster_bot |
| `DEEPSEEK_API_KEY` | `.env.worker` | DeepSeek API |
| `TOOLSELFIZAL_API_KEY` | `.env.worker` | tools.seo-rezult.ru API |
| `DATABASE_URL` | `.env.frontend` | PostgreSQL connection string |
