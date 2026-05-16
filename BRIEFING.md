# BRIEFING — Post SEO (post-seo.seo-rezult.ru)
Обновлено: 2026-05-15

---

## СЕРВЕРЫ И ДОСТУПЫ

[F01] VPS: Beget VPS, IP: `155.212.141.8`, SSH: `ssh root@155.212.141.8`
[F02] Prod URL: `https://post-seo.seo-rezult.ru`
[F03] Проект на сервере: `/opt/tg-seo-platform/`
[F04] Локальный код: `/Users/vagiz/Documents/Projects/tg-seo-platform/`
[F05] Docker Compose: `docker compose -f /opt/tg-seo-platform/docker-compose.yml`
[F06] Frontend контейнер: `tg-seo-platform-frontend-1` → порт 8200 → Traefik → домен
[F07] Worker контейнер: `tg-seo-platform-worker-1` → FastAPI порт 8000 (internal)
[F08] PostgreSQL: `tgseo_user:tgseo_pass_2026@postgres:5432/tgseo`
[F09] DB shell: `docker compose exec -T postgres psql -U tgseo_user -d tgseo`
[F10] Telegram бот: `@tg_buster_bot` (токен в `.env.worker`)
[F11] WORKER_SECRET: в `/opt/tg-seo-platform/.env.frontend` и `.env.worker`

---

## СТЕК

[F12] Frontend: Next.js 15 (App Router), TypeScript, Tailwind v4, Drizzle ORM, Better Auth
[F13] Worker: Python FastAPI, SQLAlchemy 2.0 async, DeepSeek API
[F14] DB: PostgreSQL 16 (Docker)
[F15] Auth: Better Auth + Telegram Login
[F16] AI pipeline: DeepSeek → генерация мета + статей; toolselfizal.ru как основной AI (с fallback на DeepSeek)
[F17] Индексация: IndexNow (Яндекс + Bing) при каждом новом посте
[F18] Деплой: `docker compose build frontend/worker` → `docker compose up -d`

---

## СХЕМА БД (ключевые таблицы)

[F19] `users` — пользователи (telegramId, name, email)
[F20] `channel_owners` — каналы пользователя (channelUsername, autoPublish, seoAuditText, seoAuditedAt)
[F21] `channels` (worker) — каналы в worker БД (integer ID, username)
[F22] `posts` (worker) — посты (text, seo_title, seo_slug, is_indexed, article_html, seo_h1)
[F23] `analytics_events` — просмотры и клики по статьям

---

## КЛЮЧЕВЫЕ ФАЙЛЫ (абсолютные пути)

**Frontend:**
[F24] Layout дашборда: `frontend/src/app/dashboard/channels/[id]/layout.tsx`
[F25] Страница публикаций: `frontend/src/app/dashboard/channels/[id]/posts/page.tsx`
[F26] API публикаций: `frontend/src/app/api/channels/[id]/posts-data/route.ts`
[F27] API настроек канала: `frontend/src/app/api/channels/[id]/settings/route.ts`
[F28] Mini App: `frontend/src/components/mini/` (MiniApp.tsx, PostsList.tsx, ChannelDashboard.tsx)
[F29] DB схема: `frontend/src/db/schema.ts`
[F30] Docs страницы: `frontend/src/app/docs/*/page.tsx` (5 страниц)

**Worker:**
[F31] AI pipeline: `worker/content_pipeline.py` (process_post, generate_article, analyze_channel)
[F32] Worker API: `worker/api.py` (FastAPI endpoints)
[F33] Worker models: `worker/models.py` (Channel, Post, Cluster)
[F34] Config: `worker/config.py` (TOOLSELFIZAL_API_KEY, WORKER_SECRET)

**Migrations:**
[F35] Frontend migration: выполняется через Drizzle ORM или raw SQL в `migrations/`
[F36] Worker migration: SQL файлы в `worker/migrations/`

---

## ТЕКУЩИЙ СТАТУС

[F37] Фаза: Beta. Все P0 и P1 баги исправлены (2026-05-15). Сервис полностью работоспособен.

**Завершено (2026-05-15) — первая волна:**
- Веб-дашборд публикаций: фильтр (дропдаун со счётчиками), поиск, kebab (Открыть в Telegram), аудит-карточка
- SEO аудит канала: analyze_channel() генерирует текстовый параграф, сохраняется в channel_owners.seo_audit_text
- Документация: 5 страниц (/docs/how-it-works, moderation, terms, privacy, complaints)
- UserMenu: дропдаун с "Настройки профиля" + "Выйти"
- Профиль: /dashboard/profile
- Онбординг: описания у незавершённых шагов, кнопка "Скрыть"
- "Добавить канал" — всегда видна в дропдауне канала

**Завершено (2026-05-15) — P0/P1 фикс:**
- Footer: Поддержка → t.me/tg_buster_bot, Политика → /docs/privacy, Условия → /docs/terms
- Worker DB: channel title для seorezult исправлен на реальное название канала
- Re-generate 9 постов без article_html (были в индексе Яндекс с пустым контентом) → все 13 постов теперь с полными статьями
- seo_h1 ≠ seo_title: добавлен generate_h1() в pipeline + обновлены все 13 существующих статей
- Таблица постов: table-fixed + overflow-x-auto — проверено, все 5 колонок видны без переполнения

**Известных проблем нет (P0/P1 закрыты).**

**Завершено (2026-05-16) — webhook фикс:**
- analyze-channel теперь принимает channel_username (str) ИЛИ channel_id (int) — больше нет 422
- При добавлении нового канала через бота автоматически запускается scrape-web (импорт постов)
- Исправлен telegram_id=0 для seorezult в worker DB → -1002597990223
- Для канала inbedwihtme вручную: scrape (212 постов) + аудит сгенерирован и сохранён

[F38] Следующие шаги (P2 backlog):
- P2: SEO-аудит в Mini App (PostsList — показывать audit card)
- P2: Настройки канала — редактирование названия/описания (как у TGPages)
- P2: Публичная ссылка на аудит канала ("Скопировать ссылку на публичный аудит")
- P2: Удаление react-window из зависимостей (PostsList его не использует)
- P2: Архив постов (требует миграция worker БД)
- P2: Category tags на публичных статьях
- P3: Монетизация / тарифы
- P3: Командный доступ (invite by Telegram username)

---

## КОНКУРЕНТ

[F39] TGPages (tgpages.com) — прямой конкурент. Исследован полностью (2026-05-15).
Что у них есть и нет у нас: см. историю сессии или /Users/vagiz/.claude/projects/traffic/memory/
