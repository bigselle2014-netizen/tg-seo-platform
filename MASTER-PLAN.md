# MASTER-PLAN — SEO Platform для Telegram и MAX
> Единственный источник истины о состоянии проекта.
> Обновлять после каждого завершённого шага.
> Последнее обновление: 2026-05-01

---

## ТЕКУЩЕЕ СОСТОЯНИЕ

**Сервис работает:** http://155.212.141.8:8200
- frontend (Next.js 16) — UP
- worker (FastAPI + Python) — UP, healthy
- postgres (16-alpine) — UP, healthy
- Все 10 таблиц созданы в БД

**Telegram бот:** @tg_buster_bot (создан, токен в .env)
**MAX бот:** НЕ создан (нужен токен)
**Домен:** не настроен (работаем на IP:порту)

---

## ОБОЗНАЧЕНИЯ

```
✅ DONE       — выполнено, проверено
🔄 IN WORK    — в работе сейчас
⏳ PENDING    — ждёт очереди
🔴 BLOCKER    — нужно что-то от пользователя
```

---

## БЛОК 0: ФУНДАМЕНТ (ЗАВЕРШЁН)

### Шаг 0.1 — Исследование Telegram SEO ✅
- Telegram API, трекинг подписчиков, SEO риски, AI стек, инфраструктура
- Результат: `RESEARCH.md`

### Шаг 0.2 — Архитектура и стек ✅
- Выбор технологий, схема БД, пайплайн, стоимость
- Результат: `ARCHITECTURE.md`

### Шаг 0.3 — ТЗ на исследование MAX ✅
- Публичный доступ, Bot API, URL структура, трекинг
- Результат: `RESEARCH-MAX.md`

---

## БЛОК 1: TELEGRAM SEO (ЗАВЕРШЁН)

### Шаг 1.1 — Auth + БД схема + Dashboard ✅
**Что сделано:**
- Better Auth (email/password), сессии, middleware
- Drizzle ORM: users, sessions, accounts, channelOwners, subscriptions, analyticsEvents
- Dashboard: список каналов, добавить канал, аналитика

**Файлы:** `src/db/schema.ts`, `src/lib/auth.ts`, `src/app/dashboard/*`

---

### Шаг 1.2 — Telegram Bot + Webhook + Invite Link ✅
**Что сделано:**
- grammy.js бот @tg_buster_bot
- Webhook `/api/webhook/telegram`: `my_chat_member` → activate, `channel_post` → notify worker
- `createChatInviteLink` при активации канала (точный трекинг подписчиков)
- Python worker: endpoint `POST /api/channels/{username}/new-post`

**Файлы:** `src/app/api/webhook/telegram/route.ts`, `worker/api.py`

---

### Шаг 1.3 — AI контент пайплайн ✅
**Что сделано:**
- `worker/content_pipeline.py`: 5 шагов
  1. Gemini: извлечь поисковый запрос из поста
  2. XMLStock: TOP-20 Яндекс SERP
  3. Python LSI: TF-IDF (35%/15% пороги, алгоритм Title-v20)
  4. Gemini: title + description + slug (с LSI словами)
  5. Gemini: SEO-статья 800-1200 слов (stage3_writer промт)
- `models.py`: поля `content_html`, `content_generated_at`
- `database.py`: safe migration ALTER TABLE

**Файлы:** `worker/content_pipeline.py`, `worker/indexnow.py`

---

### Шаг 1.4 — SEO страницы + IndexNow ✅
**Что сделано:**
- ISR страницы `/@channel/slug/` с `content_html` (полная статья)
- CTA кнопка → `invite_link` (не прямая t.me ссылка)
- Schema.org BlogPosting JSON-LD
- IndexNow: ping Bing + Yandex при новых страницах
- `public/505d8f387fffedee5548714e73c288d7.txt` — ключ файл

**Файлы:** `src/app/[channel]/[slug]/page.tsx`, `worker/indexnow.py`

---

### Шаг 1.5 — Аналитика + Лендинг ✅
**Что сделано:**
- `analyticsEvents` таблица: `page_view`, `tg_click`
- `TrackView` client component на каждой SEO странице
- `/go/[channelId]` логирует `tg_click` fire-and-forget
- Dashboard аналитика: реальные данные за 30 дней, конверсия
- Лендинг: Hero, "Как работает", фичи, CTA, футер

**Файлы:** `src/components/TrackView.tsx`, `src/app/dashboard/analytics/page.tsx`, `src/app/page.tsx`

---

## БЛОК 2: ДЕПЛОЙ (ЗАВЕРШЁН)

### Шаг 2.1 — Docker + Beget VPS ✅
**Что сделано:**
- `Dockerfile` для frontend (Next.js standalone)
- `Dockerfile` для worker (Python slim)
- `docker-compose.yml`: frontend:8200, worker (internal), postgres (internal)
- Все образы собраны и запущены на `155.212.141.8`
- БД: все 10 таблиц применены через SQL migration

**Сервис доступен:** http://155.212.141.8:8200

---

## БЛОК 3: ДОМЕН И TELEGRAM WEBHOOK (⏳ ЖДЁТ ПОЛЬЗОВАТЕЛЯ)

### Шаг 3.1 — Выбор и регистрация домена ⏳ 🔴
**Нужно от пользователя:** выбрать домен (учитывая что будет и Telegram, и MAX)
- Варианты: `seoboost.ru`, `channelseo.ru`, `maxseo.ru`, `boostseo.ru`
- После выбора — купить и направить A-запись на `155.212.141.8`

**Блокер:** пользователь должен выбрать и купить домен

---

### Шаг 3.2 — SSL + Traefik + обновление конфига ⏳
**Зависит от:** Шаг 3.1 (нужен домен)
**Что делаем:**
1. Обновить `docker-compose.yml` — добавить Traefik labels с новым доменом
2. Обновить `.env.frontend`: `NEXT_PUBLIC_SITE_URL=https://новый.домен`
3. Обновить `.env.worker`: `SITE_URL=https://новый.домен`
4. Пересобрать и перезапустить containers
5. Проверить SSL сертификат (Traefik + Let's Encrypt автоматически)

**Acceptance:** `https://новый.домен` — HTTP 200, SSL зелёный замок

---

### Шаг 3.3 — Активация Telegram webhook ⏳
**Зависит от:** Шаг 3.2 (нужен HTTPS)
**Что делаем:**
```
POST https://новый.домен/api/bot/setup-webhook
```
**Acceptance:** `GET /api/bot/setup-webhook` возвращает `{url: "https://...", pending_update_count: 0}`

---

## БЛОК 4: MAX SEO MODULE (⏳ ЖДЁТ ПОЛЬЗОВАТЕЛЯ)

### Шаг 4.0 — Создать MAX бота ⏳ 🔴
**Нужно от пользователя:**
1. Зайти на https://dev.max.ru
2. Зарегистрироваться (нужен ИНН или РФ аккаунт)
3. Создать бота
4. Получить `MAX_BOT_TOKEN`
5. Дать токен

**Блокер:** только пользователь может создать бота на dev.max.ru

---

### Шаг 4.1 — БД схема: messenger_type ⏳
**Зависит от:** Шаг 4.0 (нужен токен для .env)
**Что делаем:**

а) `frontend/src/db/schema.ts`:
- Добавить `messengerEnum = pgEnum("messenger_type", ["telegram", "max"])`
- Добавить `messengerType` в `channelOwners`
- Изменить unique с `channelUsername` на `(channelUsername, messengerType)`

б) SQL migration на сервере:
```sql
CREATE TYPE messenger_type AS ENUM ('telegram', 'max');
ALTER TABLE channel_owners ADD COLUMN IF NOT EXISTS messenger_type messenger_type NOT NULL DEFAULT 'telegram';
ALTER TABLE channel_owners DROP CONSTRAINT IF EXISTS channel_owners_channel_username_unique;
CREATE UNIQUE INDEX IF NOT EXISTS ... ON channel_owners(channel_username, messenger_type);
```

в) `worker/models.py` — добавить `messenger_type` в Channel

г) `worker/database.py` — ALTER TABLE channels ADD COLUMN

**Acceptance:**
- `npm run build` — OK
- `python3 -m py_compile models.py` — OK
- SQL: одинаковый username зарегистрирован в TG и MAX без конфликта

---

### Шаг 4.2 — MAX scraper (Python) ⏳
**Зависит от:** Шаг 4.1
**Файл:** `worker/max_scraper.py` (новый, по ТЗ из `TZ-MAX-MODULE.md`)

Функции:
- `get_max_channel_info(chat_id)` → `/chats/{chatId}`
- `get_max_messages(chat_id, count, from_ts)` → `/messages?chat_id=...`
- `scrape_max_channel_history(username, max_chat_id, limit)` — импорт истории
- `handle_max_new_post(username, message)` — обработка нового поста

**Acceptance:**
- `python3 -m py_compile max_scraper.py` — OK
- Без MAX_BOT_TOKEN: поднимает `RuntimeError` с понятным сообщением

---

### Шаг 4.3 — MAX webhook (Next.js) + API endpoints ⏳
**Зависит от:** Шаг 4.2

а) `frontend/src/app/api/webhook/max/route.ts` — обработка MAX событий
б) `worker/api.py` — 3 новых endpoint'а:
- `POST /api/max/new-post`
- `POST /api/max/scrape`
- `POST /api/max/register-channel`

**Acceptance:**
- `npm run build` — OK
- `python3 -m py_compile api.py` — OK
- POST `/api/webhook/max` с тестовым JSON → 200 OK

---

### Шаг 4.4 — Dashboard: поддержка MAX ⏳
**Зависит от:** Шаг 4.3

Изменения:
- `dashboard/channels/add/page.tsx` — radio: Telegram / MAX
- `dashboard/page.tsx` — badge TG(синий)/MAX(оранжевый), разные инструкции
- `/api/channels/route.ts` — принимает `messengerType`
- `/api/channels/[id]/activate/route.ts` — роутинг по типу мессенджера

**Acceptance:**
- `npm run build` — OK
- Dashboard: видно два типа каналов
- Добавление MAX-канала создаёт запись с `messenger_type=max`

---

### Шаг 4.5 — Регистрация MAX webhook на платформе ⏳
**Зависит от:** Шаг 3.2 (нужен HTTPS) + Шаг 4.0 (нужен MAX_BOT_TOKEN)

```
POST https://platform-api.max.ru/subscriptions
Authorization: {MAX_BOT_TOKEN}
{
  "url": "https://новый.домен/api/webhook/max",
  "update_types": ["message_created"]
}
```

**Acceptance:** `GET /subscriptions` возвращает активный webhook URL

---

## БЛОК 5: МОНЕТИЗАЦИЯ (⏳ V2)

### Шаг 5.1 — ЮКасса подписки ⏳
**Что делаем:**
- Тарифы: Free(20 постов), Hobby(350₽/мес, 150 постов), Pro(1050₽/мес, 1000 постов)
- ЮКасса webhook для рекуррентных платежей
- Лимиты: проверка `postsLimit` перед обработкой нового поста
- UI: страница `/dashboard/billing`

---

### Шаг 5.2 — Email уведомления ⏳
**Что делаем:**
- UniSender Go: приветственное письмо при регистрации
- Уведомление: первые индексированные страницы готовы
- Уведомление: первые переходы из поиска

---

## БЛОК 6: КАЧЕСТВО И МОНИТОРИНГ (⏳ V2)

### Шаг 6.1 — Pyrogram session для Telegram ⏳
**Что делаем:** запустить `tg_seo_worker.session` на сервере (уже есть в проекте)
- Нужна одна авторизованная Pyrogram сессия для импорта истории
- Это для первого подключения каналов у реальных пользователей

---

### Шаг 6.2 — Мониторинг ⏳
**Что делаем:**
- Логи в структурированном формате (уже частично есть)
- Алерт если worker упал (Docker healthcheck → Telegram уведомление)
- Dashboard: счётчик сгенерированных страниц, ошибок AI пайплайна

---

### Шаг 6.3 — SEO качество: A/B тест промтов ⏳
**Что делаем:**
- Сравнить качество статей: короткий промт vs полный generator1-main пайплайн
- Метрика: CTR из поиска через Google Search Console API

---

## ТЕКУЩИЕ БЛОКЕРЫ (нужно от пользователя)

| # | Что нужно | Для чего | Приоритет |
|---|---|---|---|
| 🔴 B1 | Выбрать и купить домен | SSL + Telegram webhook | HIGH |
| 🔴 B2 | Создать MAX бота на dev.max.ru → дать токен | Блок 4 | MEDIUM |

---

## СЛЕДУЮЩИЙ ШАГ

**Сейчас:** ждём решения по домену (Блокер B1).

**Пока ждём домен** — можем параллельно:
- Реализовать Блок 4.1–4.4 (MAX module код, без webhook регистрации)
- Реализовать Блок 5.1 (ЮКасса)

---

## ФАЙЛЫ ПРОЕКТА

| Файл | Описание |
|---|---|
| `RESEARCH.md` | Исследование Telegram SEO |
| `RESEARCH-MAX.md` | Исследование MAX SEO |
| `ARCHITECTURE.md` | Архитектура и стек |
| `MVP-TZ.md` | ТЗ на MVP (Telegram, выполнено) |
| `TZ-MAX-MODULE.md` | ТЗ на MAX модуль |
| `MASTER-PLAN.md` | **Этот файл — план всего проекта** |
| `AGENTS.md` | Команда агентов |
