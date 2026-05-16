# AGENTS — TG SEO Platform
> Команда агентов: роли, ответственность, когда запускать
> Дата: 2026-05-01

---

## СТРУКТУРА КОМАНДЫ

```
coordinator (Opus)
    │
    ├── nextjs-dev (Sonnet)        ← основная разработка
    ├── python-dev (Sonnet)        ← Pyrogram microservice
    ├── supabase-dev (Sonnet)      ← БД, миграции
    ├── verstalshhik (Sonnet)      ← верстка, лендинг
    ├── devops (Sonnet)            ← деплой, инфраструктура
    ├── reviewer (Opus)            ← code review
    └── bug-hunter (Sonnet)        ← поиск багов
```

---

## АГЕНТЫ И ОТВЕТСТВЕННОСТЬ

### coordinator
**Модель:** Opus  
**Запускать:** для любой задачи по проекту. Единственная точка входа.  
**Ответственность:**
- Читает BRIEFING.md + ARCHITECTURE.md + MVP-TZ.md перед каждой задачей
- Определяет какого агента запустить и в каком порядке
- Верифицирует ТЗ перед передачей разработчику
- Собирает результаты агентов
- Принимает архитектурные решения

**Запрещено:** самостоятельно писать код

---

### nextjs-dev
**Модель:** Sonnet  
**Запускать:** любая задача Next.js — страницы, API routes, workers, hooks  
**Стек:** Next.js 15, TypeScript, Tailwind, shadcn/ui, Better Auth, Drizzle ORM, BullMQ  
**Ответственность:**
- App Router страницы (dashboard, public SEO pages)
- API Routes: /api/webhooks/telegram, /api/channels/*, /api/billing/*
- ISR страницы: /[channelSlug]/, /[channelSlug]/[postSlug]/
- BullMQ workers: content-generation, media-cache, indexnow
- OpenAI интеграция (GPT-4o-mini)
- grammy.js Telegram Bot
- Sitemap.xml генерация
- Better Auth setup

**Промты для контента:** ~/Desktop/generator1-main/prompts/infoArticle/  
Использовать stage3_writer.txt как основу для content-generation-worker

---

### python-dev
**Модель:** Sonnet  
**Запускать:** задачи Pyrogram microservice  
**Стек:** Python 3.12, FastAPI, Pyrogram, asyncio  
**Ответственность:**
- FastAPI сервис: POST /import/:channel_id
- Pyrogram: get_chat_history() с flood prevention
- Передача постов в BullMQ очередь через Redis
- Обработка FloodWait ошибок (exponential backoff)
- Health check endpoint

**Деплой:** отдельный контейнер на Hetzner CX21  
**Важно:** не async Celery tasks — только FastAPI + asyncio напрямую

---

### supabase-dev
**Модель:** Sonnet  
**Запускать:** задачи по БД — новые таблицы, миграции, индексы, RLS  
**Стек:** PostgreSQL 16, Drizzle ORM, Neon  
**Ответственность:**
- Drizzle schema файлы (src/db/schema.ts)
- Миграции: drizzle-kit generate + migrate
- Индексы: GIN на text columns для FTS
- RLS policies (если используем Supabase direct)
- Seed data для разработки

**Авторитет по схеме:** ARCHITECTURE.md раздел "Схема базы данных"  
При конфликтах — ARCHITECTURE.md прав

---

### verstalshhik
**Модель:** Sonnet  
**Запускать:** HTML/CSS верстка, лендинг, дизайн страниц  
**Запрещено:** писать API логику, менять бизнес-код  
**Ответственность:**
- Лендинг (главная страница)
- Стили дашборда (Tailwind классы, shadcn компоненты)
- Дизайн public SEO страниц (layout поста)
- Email шаблоны (UniSender Go)
- Mobile responsiveness

---

### devops
**Модель:** Sonnet  
**Запускать:** деплой, настройка серверов, CI/CD, SSL, Docker  
**Стек:** Docker Compose, Nginx, GitHub Actions, Hetzner VPS  
**Ответственность:**
- docker-compose.yml для всех сервисов
- Nginx конфиг + SSL (Let's Encrypt)
- GitHub Actions: build + deploy pipeline
- .env management (секреты в GitHub Secrets)
- Python microservice деплой на Hetzner CX21
- Cloudflare DNS настройка

**Серверы:**
- Vercel: Next.js frontend (MVP)
- Hetzner CX21: Python Pyrogram service

---

### reviewer
**Модель:** Opus  
**Запускать:** code review после каждой фазы, перед деплоем  
**Чеклист:**
- TypeScript типы корректны
- Нет секретов в коде
- API routes валидируют input
- BullMQ workers имеют error handling + retry
- ISR страницы имеют правильный revalidate
- Schema.org разметка валидна
- Нет N+1 запросов к БД
- Rate limiting на API endpoints

---

### bug-hunter
**Модель:** Sonnet  
**Запускать:** после деплоя каждой фазы, при непонятных ошибках  
**Ищет:**
- Edge cases в BullMQ workers (что если Telegram вернул ошибку?)
- Race conditions при параллельном import истории
- Лимиты не проверяются в нужных местах
- Дубли постов при двойном добавлении канала
- Sitemap не обновляется при удалении страницы
- invite_link истекает (Telegram expire_date)

---

## ПРОТОКОЛ РАБОТЫ

### Старт любой задачи
```
1. coordinator читает BRIEFING.md + ARCHITECTURE.md + MVP-TZ.md
2. Определяет фазу и тип задачи
3. Пишет мини-ТЗ (цель, входные данные, выходные данные, acceptance criteria)
4. Запускает нужного агента
5. Проверяет результат
6. Запускает reviewer (если код > 50 строк)
7. Деплоит через devops
```

### После каждой фазы
```
1. reviewer — code review
2. bug-hunter — edge cases
3. devops — деплой
4. Обновить MVP-TZ.md (отметить фазу выполненной)
```

### Гарантия 100%
Каждое техническое решение принято на основе RESEARCH.md.  
Перед любым утверждением — проверить файл RESEARCH.md.  
"Уверен на 100%" = факт есть в RESEARCH.md с источником.

---

## BRIEFING ДЛЯ НОВОЙ СЕССИИ

Читать в таком порядке:
1. ARCHITECTURE.md — стек и схема
2. RESEARCH.md — обоснования решений
3. MVP-TZ.md — текущая фаза
4. AGENTS.md — кого запускать

Промты для контента: ~/Desktop/generator1-main/prompts/infoArticle/
