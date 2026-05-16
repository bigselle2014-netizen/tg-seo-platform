# MASTER-METHODOLOGY — Post SEO (post-seo.seo-rezult.ru)

Версия: 1.0
Обновлено: 2026-05-15

---

## 1. ДЛЯ КОГО ЭТОТ ДОКУМЕНТ

Читает КАЖДЫЙ агент и КАЖДАЯ сессия — первым действием. После прочтения никто не имеет права говорить "не знаю как делать".

---

## 2. ИСТОЧНИКИ ПРАВДЫ

| Что нужно | Где читать |
|-----------|-----------|
| Сервера, доступы, текущий статус, следующий шаг | `BRIEFING.md` (F01–F39) |
| Архитектура стека и схема БД | `ARCHITECTURE.md` |
| Полное ТЗ на сервис | `TZ-FULL-2026.md` |
| Шаблон для нового ТЗ | `TZ-TEMPLATE.md` |
| Живые ТЗ фич | `TZ-*.md` |
| Память сессий | `/Users/vagiz/.claude/projects/-Users-vagiz-Documents-Projects-traffic/memory/` |
| Prod | `https://post-seo.seo-rezult.ru` |
| Сервер | `root@155.212.141.8` |

---

## 3. WORKFLOW ЛЮБОЙ ЗАДАЧИ

### A. Новая фича / UI-изменение / API endpoint

```
Пользователь описывает задачу →
  Исследование (читаем реальные файлы + конкурент если нужно) →
  ТЗ в файл TZ-*.md (или в чат если задача < 30 мин) →
  Пользователь говорит "Да" →
  Реализация (Next.js/Python) →
  TypeScript build check (docker compose build) →
  SCP на сервер + rebuild + restart →
  Визуальная проверка (Playwright или пользователь) →
  Обновить BRIEFING.md F37-F38
```

### B. Баг

```
Баг описан →
  Читаем конкретный файл ЦЕЛИКОМ (не по памяти) →
  Находим причину →
  Минимальный фикс (не рефакторинг) →
  Build check →
  Deploy →
  Проверка curl 200 + визуально
```

### C. DB миграция

```
Новое поле нужно →
  Добавить в frontend/src/db/schema.ts (Drizzle) →
  SQL миграция в migrations/*.sql →
  Выполнить на сервере: docker compose exec postgres psql -U tgseo_user -d tgseo -c "ALTER TABLE..." →
  Добавить поле в API response если нужно →
  Rebuild frontend
```

### D. Worker изменение (Python)

```
Изменить worker/*.py локально →
  SCP файл на сервер →
  docker compose build worker →
  docker compose up -d worker →
  Проверить логи: docker compose logs worker --since=1m
```

### E. Deploy (стандартный)

```
SCP изменённый файл → /opt/tg-seo-platform/frontend/src/... →
  docker compose build frontend →
  docker compose up -d frontend →
  curl -s -o /dev/null -w "%{http_code}" https://post-seo.seo-rezult.ru/dashboard → 307 (redirect = OK) →
  Визуальная проверка конкретной страницы
```

---

## 4. ПРИНЦИПЫ

### 4.1. Read перед Edit — ВСЕГДА

Не пиши код по памяти. Read файл целиком перед изменением. Grep по имени функции перед изменением — найди все места использования.

### 4.2. TypeScript строгость

После изменения frontend — всегда `docker compose build frontend`. Build failure = задача не завершена. Никогда не говорить "готово" если build не прошёл.

### 4.3. Исследование перед ТЗ

Перед написанием ТЗ — изучить реальное состояние файлов. Конкурент (TGPages) — изучать через Playwright, не по памяти.

### 4.4. Минимальный фикс

Баг исправляется точечно. Не рефакторить попутно. Не чистить "заодно". Отдельная задача = отдельный TZ.

### 4.5. Методология STOP-BLOCKER

Перед любым кодом — ответить:
1. Я видел реальный файл с сервера/репо?
2. Я нашёл аналог в этом проекте?
3. Я уверен что не сломаю соседние файлы?

Если хоть одно "нет" — сначала исследование.

### 4.6. Конкурент = источник UX-правды

TGPages уже решил многие UX-задачи. При любом вопросе "как это должно выглядеть" — сначала смотрим TGPages через Playwright.

### 4.7. BRIEFING обновляется после каждого деплоя

F37 (статус) и F38 (следующий шаг) — обновлять после каждого завершённого деплоя.

---

## 5. КАРТА АГЕНТОВ

| Задача | Агент | Модель | Что ОБЯЗАТЕЛЬНО передать |
|--------|-------|--------|--------------------------|
| Next.js / TypeScript / React компоненты | `@nextjs-developer` | Sonnet | Абс. пути файлов, текущий код файла, что именно менять |
| Python / FastAPI / worker | `@python-dev` | Sonnet | Абс. путь файла, функция которую менять, ожидаемый результат |
| Баги / краши / edge cases | `@bug-hunter` | Sonnet | Файл с багом (абс. путь), описание симптома, что уже проверено |
| Ревью кода / архитектура | `@reviewer` | Opus | Diff или путь файла, фокус ревью |
| Визуальная проверка (Playwright) | `@ux-auditor` | Sonnet | URL страницы, разрешение, что именно проверить |
| DB / SQL / Drizzle миграции | `@database-optimizer` | Sonnet | Текущая схема (schema.ts), что добавить, SQL команда |
| Координация нескольких задач | `@coordinator` | Opus | Список подзадач, BRIEFING.md путь |
| SEO / метаданные / sitemap | `@seo` | Sonnet | URL страницы, текущие мета-теги, что улучшить |

### Правила модели
- Sonnet — всегда для исполнения
- Opus — только для архитектурных решений и ревью сложного кода
- Haiku — grep, curl-проверки, чтение файлов

---

## 6. КАК ПИСАТЬ ТЗ

**Шаблон:** `TZ-TEMPLATE.md`

### Обязательные секции

1. **Цель** — одна строка: что должно работать после деплоя
2. **Что НЕ делаем** — явно перечислить ограничения
3. **Затронутые файлы** — абсолютные пути локальные + серверные
4. **Технические требования** — конкретно: какие компоненты, какие API, какие поля БД
5. **Acceptance criteria** — проверяемые пункты (curl 200, скриншот, конкретный элемент видим)
6. **Риски** — что может сломаться, как проверить

### Промт агенту (обязательные элементы)

```
- Прочитай файл: [абс. путь] — там текущая реализация
- Измени: [конкретно что]
- Не трогай: [что нельзя трогать]
- После изменения: выполни build check
- Проверь: [конкретный acceptance criterion]
- Сервер: root@155.212.141.8, проект: /opt/tg-seo-platform/
- Deploy: scp файл → docker compose build frontend → docker compose up -d frontend
```

---

## 7. КРАСНЫЕ ЛИНИИ

1. **Не говорить "готово" если docker compose build упал** — TypeScript errors = задача не завершена
2. **Не писать код по памяти** — Read файл перед Edit, ВСЕГДА
3. **Не трогать Docker Compose без крайней необходимости** — изменение services → rebuild всего стека
4. **Не делать прямой SQL UPDATE** — использовать Drizzle ORM или `ALTER TABLE` для схемы
5. **Не хардкодить секреты в коде** — только через env переменные (`.env.frontend`, `.env.worker`)
6. **Не деплоить Worker без проверки логов** — `docker compose logs worker --since=2m` после restart
7. **Не рефакторить вне рамок задачи** — увидел проблему → в BRIEFING F38 backlog
8. **Не пропускать шаг "пользователь говорит Да"** перед крупными изменениями
9. **Не обновлять зависимости без явного запроса** — npm/pip update = риск поломки
10. **Не удалять из DB schema.ts поля** без проверки что они нигде не используются

---

## 8. CHECKLIST ПЕРЕД ЛЮБЫМ ДЕЙСТВИЕМ

```
□ 1. Прочитал BRIEFING.md (F01-F39)?
□ 2. Прочитал файл который буду менять (Read, не по памяти)?
□ 3. Проверил Grep — где ещё используется функция/компонент?
□ 4. Тип задачи определён (фича / баг / миграция / deploy)?
□ 5. Агент и модель выбраны по карте (§5)?
□ 6. Красные линии (§7) не нарушаются?
□ 7. В промте агенту есть: абс. пути, что менять, что НЕ трогать, acceptance criteria?
□ 8. После деплоя: BRIEFING.md F37-F38 обновить?
```

Если хотя бы один □ — закрой пункт перед стартом.

---

## 9. ДЕПЛОЙ (детальный)

### Frontend (Next.js)

```bash
# 1. SCP изменённый файл
scp /Users/vagiz/Documents/Projects/tg-seo-platform/frontend/src/.../file.tsx \
    root@155.212.141.8:/opt/tg-seo-platform/frontend/src/.../file.tsx

# 2. Build (TypeScript check + компиляция)
ssh root@155.212.141.8 "cd /opt/tg-seo-platform && docker compose build frontend 2>&1 | tail -10"

# 3. Restart
ssh root@155.212.141.8 "cd /opt/tg-seo-platform && docker compose up -d frontend 2>&1 | tail -5"

# 4. Verify
ssh root@155.212.141.8 "curl -s -o /dev/null -w '%{http_code}' http://localhost:8200/mini"
```

### Worker (Python)

```bash
# 1. SCP
scp /Users/vagiz/Documents/Projects/tg-seo-platform/worker/content_pipeline.py \
    root@155.212.141.8:/opt/tg-seo-platform/worker/content_pipeline.py

# 2. Build + restart
ssh root@155.212.141.8 "cd /opt/tg-seo-platform && docker compose build worker && docker compose up -d worker"

# 3. Check logs
ssh root@155.212.141.8 "docker compose -f /opt/tg-seo-platform/docker-compose.yml logs worker --since=2m 2>&1 | tail -20"
```

### DB миграция

```bash
ssh root@155.212.141.8 "docker compose -f /opt/tg-seo-platform/docker-compose.yml exec -T postgres \
  psql -U tgseo_user -d tgseo -c 'ALTER TABLE channel_owners ADD COLUMN IF NOT EXISTS ...;' 2>&1"
```

---

## 10. KAK ОБНОВЛЯТЬ ЭТОТ ДОКУМЕНТ

- После нового принципа → §4 с блоком: суть / когда применять / нарушение
- После нового агента → строка в §5
- После нового типа задачи → §3
- После новой красной линии → §7
- Обновить версию (1.0 → 1.1) и дату

### Changelog
- 2026-05-15 v1.0 — первичная версия. Основан на MASTER-METHODOLOGY из ZapSibIT проекта. Адаптирован под Next.js 15 + Python FastAPI + Docker Compose стек.
