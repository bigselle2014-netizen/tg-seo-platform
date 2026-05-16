# MVP ТЗ — TG SEO Platform
> Что строим в первую итерацию. Срок: 4-6 недель.
> Всё что не в этом документе — NOT MVP. Не строить.
> Дата: 2026-05-01

---

## ЦЕЛЬ MVP

Работающий сервис где владелец Telegram-канала может:
1. Зарегистрироваться и добавить свой канал
2. Получить веб-страницы для каждого поста
3. Видеть базовую аналитику (просмотры, переходы)
4. Оплатить подписку

---

## КОНКУРЕНТНОЕ ПРЕИМУЩЕСТВО vs TGPages

TGPages: simple one-shot prompt → title + description + slug
Мы: многостадийный пайплайн на основе generator1-main (~/Desktop/generator1-main/)

**Наши страницы = полноценные SEO-статьи** (800-2000 слов), а не клоны постов:
- Stage 0: анализ поста → определение интента и ключевых слов
- Stage 2: outline статьи
- Stage 3: написание с LSI, структурой, E-E-A-T
- Результат: Google видит полноценный контент, не thin content

Это сложнее, но даёт качество которое не достичь простым промтом.

---

## ФАЗЫ MVP

### Фаза 1: Скелет (неделя 1-2)

**Задачи:**
- [ ] Next.js 15 проект с App Router
- [ ] PostgreSQL схема (все таблицы из ARCHITECTURE.md)
- [ ] Drizzle ORM миграции
- [ ] Better Auth: email + Google OAuth
- [ ] Базовый дашборд: список каналов, статус

**Результат:** можно зарегистрироваться, добавить канал (без Telegram интеграции)

---

### Фаза 2: Telegram интеграция (неделя 2-3)

**Задачи:**
- [ ] grammy.js Telegram Bot
  - Webhook endpoint: /api/webhooks/telegram
  - Команды: /start, /help
  - Обработка новых постов (channel_post update)
- [ ] Инструкция в дашборде: "Добавьте @BotName как admin в ваш канал"
- [ ] Верификация: при добавлении бота — автоматическое подтверждение
- [ ] `createChatInviteLink` — создаём tracking ссылку при активации канала
- [ ] Python microservice (Pyrogram) — import истории
  - FastAPI endpoint: POST /import/:channel_id
  - get_chat_history() с паузами 2-3 сек
  - Передаёт посты в очередь BullMQ

**Результат:** посты реально попадают в систему

---

### Фаза 3: AI пайплайн контента (неделя 3-4)

**Задачи:**
- [ ] BullMQ workers setup (Upstash Redis)
- [ ] `content-generation-worker`:
  - GPT-4o-mini (OpenAI API)
  - Промт: адаптированный stage3_writer из generator1-main для коротких постов
  - Генерирует: slug + seo_title + seo_description + intro_html (300-500 слов)
  - Для постов >500 слов: полный пайплайн (outline → writer)
- [ ] `media-cache-worker`:
  - Скачать Telegram медиа по file_id
  - Загрузить в Cloudflare R2
  - Сохранить публичный URL
- [ ] `indexnow-worker`:
  - POST к IndexNow API (Bing + Yandex)
  - Обновить sitemap.xml

**Результат:** для каждого поста создаётся SEO-страница с контентом

---

### Фаза 4: Public SEO pages (неделя 4)

**Задачи:**
- [ ] Route: `/[channelSlug]/` — страница канала (список постов)
- [ ] Route: `/[channelSlug]/[postSlug]/` — страница поста
  - ISR: `revalidate = 86400` (раз в сутки)
  - Full SEO: title, description, canonical, OG, Schema.org BlogPosting
  - CTA кнопка: "Читать в Telegram" → channels.invite_link
- [ ] `sitemap.xml` динамический: `/sitemap.xml` и `/sitemap/:page.xml`
- [ ] `robots.txt`

**Результат:** страницы доступны по публичному URL, пригодны к индексации

---

### Фаза 5: Биллинг + Launch (неделя 5-6)

**Задачи:**
- [ ] Тарифы: Free (20 постов), Hobby (150, 350₽/мес), Pro (1000, 1050₽/мес)
- [ ] ЮКасса: подписка, рекуррентные платежи
- [ ] Лимиты: проверка posts_limit перед добавлением новой страницы
- [ ] Email уведомления (UniSender Go): регистрация, активация канала
- [ ] Лендинг (verstalshhik): главная страница с описанием сервиса

**Результат:** можно оплатить, сервис ограничивает по тарифу

---

## ЧТО НЕ В MVP (следующие итерации)

- Аналитика ключевых запросов (Google Search Console API)
- A/B тесты контента
- Кастомный домен для канала
- Мультиканальность (>1 канала на Free плане)
- AI рекомендации: "эти посты не подходят для SEO"
- RSS / Atom feed
- API для разработчиков
- Партнёрская программа

---

## ACCEPTANCE CRITERIA MVP

| Критерий | Проверка |
|---|---|
| Регистрация работает | Email + Google OAuth, сессия сохраняется |
| Канал добавляется | Бот добавлен → статус 'active' |
| Посты импортируются | После регистрации: история в таблице posts |
| Страница генерируется | /channel-slug/post-slug/ — HTTP 200, title/description заполнены |
| Индексация запускается | IndexNow 200 OK в логах при новом посте |
| Трекинг работает | invite_link создана, кнопка ведёт на неё |
| Биллинг работает | ЮКасса тест-оплата проходит, план обновляется |
| Лимиты работают | Сверх posts_limit — новые посты не индексируются |
| Sitemap актуальна | /sitemap.xml содержит все page URL |

---

## ТЕХНИЧЕСКИЕ ОГРАНИЧЕНИЯ MVP

- Только русский язык UI (английский — V2)
- Только публичные каналы (приватные — сложно, V2)
- Медиа: только фото (видео — V2, дорого хранить)
- SEO страница = 1 пост = 1 страница (не агрегации по тегам — V2)
- Нет кастомных доменов — только поддомен сервиса (V2)

---

## СТОИМОСТЬ ЗАПУСКА MVP

| Компонент | Стоимость/мес |
|---|---|
| Vercel Pro | $20 |
| Neon PostgreSQL | $19 |
| Upstash Redis | $10 |
| Hetzner CX21 (Python service) | $5 |
| Cloudflare R2 (медиа) | $5 |
| OpenAI API (тестирование) | ~$10 |
| **ИТОГО** | **~$69/мес** |

Breakeven: 70₽/мес × 1 клиент = нет. **5 клиентов Hobby = 1750₽ = $20 = 29% затрат покрыто.**

---

## ПОРЯДОК ЗАПУСКА АГЕНТОВ

```
Фаза 1:
  → nextjs-dev: скелет + Auth + БД схема
  → supabase-dev: Drizzle миграции

Фаза 2:
  → nextjs-dev: Bot webhook, дашборд
  → python-dev: Pyrogram microservice

Фаза 3:
  → nextjs-dev: BullMQ workers, OpenAI интеграция
  (используем промты из ~/Desktop/generator1-main/prompts/infoArticle/)

Фаза 4:
  → nextjs-dev: ISR routes, sitemap
  → verstalshhik: дизайн страниц

Фаза 5:
  → nextjs-dev: биллинг ЮКасса
  → verstalshhik: лендинг

После каждой фазы:
  → reviewer: code review
  → bug-hunter: edge cases
  → devops: деплой на Hetzner
```
