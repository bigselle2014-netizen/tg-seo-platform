# ARCHITECTURE — TG SEO Platform
> Архитектура и стек. Все решения обоснованы исследованием в RESEARCH.md
> Дата: 2026-05-01

---

## СУЩЕСТВУЮЩИЕ ИНСТРУМЕНТЫ (ИНТЕГРИРУЕМ В ПАЙПЛАЙН)

У владельца проекта есть готовые AI-инструменты которые мы используем:

| Инструмент | Путь | Что делает | Как используем |
|---|---|---|---|
| **Title-v20.html** | ~/Downloads/Title-v20.html | Генерация title+description: XMLStock (SERP snippets TOP-20) + Gemini AI + LSI-анализ | Адаптируем логику в `meta-generation-worker`. Для каждого поста → берём ключевые слова из поста → XMLStock → Gemini генерирует идеальный title/description |
| **generator1-main** | ~/Desktop/generator1-main/ | Многостадийный SEO-генератор: SERP анализ → аудитория → интенты → outline → writer → EEAT | Используем промты из `prompts/infoArticle/stage3_writer.txt` для генерации полного текста статьи из поста |
| **baza zanij.html** | ~/Downloads/baza zanij.html | JTBD/Behavioral SEO анализ сайта (Firecrawl + Perplexity Sonar Pro) | V2: анализ ниши канала при регистрации → контекст для AI генератора |

### Конкурентное преимущество

**TGPages делает:** simple one-shot prompt → title + description (30 секунд)  
**Мы делаем:** XMLStock SERP анализ → LSI синтез → Gemini/GPT → полноценная статья (800-2000 слов)

Наши страницы проходят Google Helpful Content Update потому что добавляют реальную ценность — это SEO-статья, а не клон поста.

---

## СХЕМА СИСТЕМЫ

```
┌─────────────────────────────────────────────────────────────┐
│                        ВЛАДЕЛЕЦ КАНАЛА                       │
│                                                              │
│  1. Регистрируется на сервисе                                │
│  2. Добавляет нашего бота как admin (read-only)              │
│  3. Видит аналитику в личном кабинете                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      WEB PANEL (Next.js)                     │
│                                                              │
│  /dashboard  /channels  /analytics  /settings  /billing     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                        API LAYER (Next.js API Routes)        │
│                                                              │
│  POST /api/channels/register                                 │
│  GET  /api/channels/:id/posts                                │
│  GET  /api/analytics/:channelId                              │
│  POST /api/billing/subscribe                                 │
└──────┬──────────────────────────────────┬───────────────────┘
       │                                  │
┌──────▼──────────┐             ┌─────────▼──────────────────┐
│  PostgreSQL      │             │  BullMQ Workers (Redis)     │
│                  │             │                              │
│  channels        │             │  import-history-worker      │
│  posts           │◄────────────│  ai-metadata-worker         │
│  pages           │             │  indexnow-worker            │
│  analytics       │             │  media-cache-worker         │
│  subscriptions   │             └──────────────────────────── ┘
│  users           │                        │
└──────────────────┘                        │
                                 ┌──────────▼─────────────────┐
                                 │      TELEGRAM LAYER         │
                                 │                              │
                                 │  Bot API webhook             │
                                 │  (новые посты realtime)      │
                                 │                              │
                                 │  MTProto (Pyrogram)          │
                                 │  (import истории, 1 раз)     │
                                 └──────────────────────────── ┘

┌─────────────────────────────────────────────────────────────┐
│                    PUBLIC WEB (SEO страницы)                  │
│                                                              │
│  tgpages.example.com/@channel_name/                          │
│  tgpages.example.com/@channel_name/post-slug-123/            │
│                                                              │
│  Next.js ISR — рендер по запросу + кэш                       │
│  Sitemap: /sitemap.xml (автообновление)                      │
│  IndexNow: ping при каждом новом посте                       │
└─────────────────────────────────────────────────────────────┘
```

---

## ТЕХНОЛОГИЧЕСКИЙ СТЕК

| Компонент | Технология | Версия | Причина |
|---|---|---|---|
| **Frontend/SSR** | Next.js | 15 (App Router) | ISR из коробки, API routes, TypeScript |
| **UI** | Tailwind CSS + shadcn/ui | - | Скорость разработки |
| **Auth** | Better Auth | latest | Email + Google OAuth, сессии |
| **База данных** | PostgreSQL | 16 | FTS через tsvector, надёжность |
| **ORM** | Drizzle ORM | latest | TypeScript-first, лёгкий |
| **Очередь** | BullMQ + Redis | - | Надёжность, UI (Bull Board) |
| **Telegram Bot** | grammy.js | latest | TypeScript, webhook-first |
| **Telegram MTProto** | Pyrogram (Python) | 2.x | Import истории (microservice) |
| **AI** | OpenAI GPT-4o-mini | - | Дешевле в 5x, русский язык |
| **Медиа хранение** | Cloudflare R2 | - | $0 egress, дёшево |
| **CDN** | Cloudflare | - | Cache, DDos защита |
| **Хостинг** | Vercel (MVP) / Hetzner (прод) | - | ISR, простота деплоя |
| **БД хостинг** | Neon | - | Serverless PostgreSQL, $19/мес |
| **Кэш/очередь** | Upstash Redis | - | Serverless Redis, $10/мес |
| **Платежи** | ЮКасса | - | РФ, подписки |
| **Email** | UniSender Go | - | РФ серверы, 152-ФЗ |

---

## СХЕМА БАЗЫ ДАННЫХ

```sql
-- Владельцы (пользователи сервиса)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  plan TEXT DEFAULT 'free',       -- free|hobby|pro|business
  posts_limit INTEGER DEFAULT 20,  -- лимит по тарифу
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Telegram-каналы
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  tg_id BIGINT UNIQUE NOT NULL,         -- Telegram channel ID
  username TEXT UNIQUE NOT NULL,         -- @channelname
  title TEXT NOT NULL,
  description TEXT,
  subscriber_count INTEGER DEFAULT 0,
  bot_is_admin BOOLEAN DEFAULT FALSE,    -- бот добавлен как admin
  invite_link TEXT,                      -- уникальная tracking ссылка
  status TEXT DEFAULT 'pending',         -- pending|active|paused
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Посты канала
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES channels(id),
  tg_message_id INTEGER NOT NULL,
  text TEXT,
  media_urls TEXT[],               -- Cloudflare R2 URLs после кэширования
  tg_media_file_ids TEXT[],        -- оригинальные file_id из Telegram
  published_at TIMESTAMPTZ,
  indexed BOOLEAN DEFAULT FALSE,    -- индексирован ли в поиске
  UNIQUE(channel_id, tg_message_id)
);

-- SEO страницы (одна страница = один пост)
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) UNIQUE,
  channel_id UUID REFERENCES channels(id),
  slug TEXT NOT NULL,              -- human-readable URL slug
  seo_title TEXT,                  -- AI-generated
  seo_description TEXT,            -- AI-generated
  schema_json JSONB,               -- Schema.org BlogPosting JSON-LD
  content_html TEXT,               -- AI-enriched HTML контент
  indexnow_sent BOOLEAN DEFAULT FALSE,
  google_sitemap_included BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, slug)
);

-- Аналитика событий
CREATE TABLE analytics_events (
  id BIGSERIAL PRIMARY KEY,
  channel_id UUID REFERENCES channels(id),
  page_id UUID REFERENCES pages(id),
  event_type TEXT,                 -- page_view|tg_click|subscriber_join
  session_id TEXT,
  referrer TEXT,
  search_query TEXT,               -- из UTM или Referer
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Агрегированная аналитика (daily rollup)
CREATE TABLE analytics_daily (
  channel_id UUID REFERENCES channels(id),
  date DATE,
  page_views INTEGER DEFAULT 0,
  tg_clicks INTEGER DEFAULT 0,
  subscribers_joined INTEGER DEFAULT 0,
  PRIMARY KEY(channel_id, date)
);

-- Подписки (биллинг)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  yukassa_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ПАЙПЛАЙН ОБРАБОТКИ ПОСТА

### Новый пост (realtime)
```
Telegram → Bot API webhook → /api/webhooks/telegram
  → Валидация (bot is admin, channel active, plan limit)
  → Сохранить post в БД
  → Добавить в очередь: ai-metadata-worker
    → GPT-4o-mini: title + description + slug + alt-texts
    → Сохранить page в БД
    → Добавить в очередь: media-cache-worker
      → Скачать медиа из Telegram
      → Загрузить в Cloudflare R2
      → Обновить media_urls в posts
    → Добавить в очередь: indexnow-worker
      → POST https://api.indexnow.org/indexnow (Bing + Yandex)
      → Обновить sitemap.xml
```

### Import истории (при регистрации канала)
```
Владелец добавил бота → POST /api/channels/:id/import
  → Добавить в очередь: import-history-worker (Python/Pyrogram microservice)
    → MTProto: get_chat_history() постами по 50
    → Пауза 2-3 сек между батчами (anti-flood)
    → Для каждого поста → ai-metadata-worker (через Batch API OpenAI, 50% скидка)
    → После завершения → status = 'active'
```

---

## SEO СТРАНИЦЫ — СТРУКТУРА

```
URL: /channel-username/post-slug-здесь/

<head>
  <title>SEO-оптимизированный заголовок поста | @channel_name</title>
  <meta name="description" content="AI-generated description 155 chars" />
  <link rel="canonical" href="https://example.com/channel/slug/" />
  
  <!-- Open Graph -->
  <meta property="og:title" content="..." />
  <meta property="og:image" content="https://cdn.r2.../image.jpg" />
  
  <!-- Schema.org BlogPosting -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "...",
    "datePublished": "2026-04-15T10:00:00Z",
    "author": { "@type": "Organization", "name": "@channel_name" },
    "publisher": { "@type": "Organization", "name": "..." },
    "image": "...",
    "description": "..."
  }
  </script>
</head>

<body>
  <!-- Intro: AI-generated context (200-300 слов) -->
  <!-- Original post content: текст + медиа -->
  <!-- CTA: кнопка "Читать канал в Telegram" → invite link -->
</body>
```

---

## TRACKING ПОДПИСЧИКОВ (ТОЧНЫЙ)

```
При регистрации канала:
  1. createChatInviteLink() → уникальная ссылка для канала
  2. Ссылка хранится в channels.invite_link

На каждой веб-странице поста:
  Кнопка "Открыть в Telegram" → channels.invite_link

Ночной job (cron, каждые 6 часов):
  → messages.getChatInviteImporters() для каждой invite link
  → Записать новых вступивших в analytics_events (event_type='subscriber_join')
  → Обновить analytics_daily

Метрика в дашборде:
  → "За последние 30 дней из поиска пришли N подписчиков"
```

---

## МАСШТАБИРОВАНИЕ

### MVP (0 → 100 каналов)
- Vercel Pro ($20/мес) — ISR, auto-scaling
- Neon Serverless PostgreSQL ($19/мес)
- Upstash Redis ($10/мес)
- 1 Python microservice (Pyrogram) на Hetzner CX21 ($5/мес)

### Growth (100 → 5K каналов)
- Мигрировать на Hetzner CX51 ($40/мес) + Docker
- PostgreSQL read replica
- Redis Cluster

### Scale (5K → 50K каналов)
- Kubernetes / Coolify
- PostgreSQL → partitioned tables по channel_id
- CDN edge functions для SEO страниц

---

## КОМАНДА (роли и ответственность)

| Роль | Ответственность |
|---|---|
| **coordinator** | Управление, запуск агентов, архитектурные решения |
| **nextjs-dev** | Next.js ISR страницы, API routes, dashboard |
| **python-dev** | Pyrogram microservice (import истории) |
| **supabase-dev** | PostgreSQL схема, миграции, RLS |
| **verstalshhik** | HTML/CSS дашборда, лендинг |
| **devops** | Docker, Hetzner VPS, CI/CD |
| **reviewer** | Code review перед деплоем |
| **bug-hunter** | Поиск проблем после деплоя |
