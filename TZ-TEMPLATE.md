# TZ-[НАЗВАНИЕ] — Post SEO
Дата: YYYY-MM-DD
Статус: черновик / на ревью / выполнено

---

## 1. ЦЕЛЬ
Одна строка: что должно работать после деплоя.

---

## 2. ГРАНИЦЫ ЗАДАЧИ

**ЧТО ДЕЛАЕМ:**
- ...

**ЧТО НЕ ДЕЛАЕМ:**
- ...

---

## 3. ЗАТРОНУТЫЕ ФАЙЛЫ

| Файл (локальный) | Файл (серверный) | Действие |
|---|---|---|
| `frontend/src/app/.../page.tsx` | `/opt/tg-seo-platform/frontend/src/app/.../page.tsx` | изменить |
| `worker/content_pipeline.py` | `/opt/tg-seo-platform/worker/content_pipeline.py` | изменить |

**DB миграция (если нужна):**
```sql
ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...;
```

---

## 4. ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ

### Frontend (Next.js)
- Компонент: `...`
- Новые state/props: `...`
- API endpoint: `...`

### Worker (Python)
- Функция: `...`
- Изменение в: `...`

### DB (если нужно)
- Таблица: `...`
- Новое поле: `...`

---

## 5. ACCEPTANCE CRITERIA

- [ ] Страница открывается: `curl -s -o /dev/null -w "%{http_code}" https://post-seo.seo-rezult.ru/... → 200`
- [ ] Элемент виден: [конкретно что должно быть на экране]
- [ ] Build прошёл без TypeScript ошибок
- [ ] Worker логи без errors после restart

---

## 6. РИСКИ

| Риск | Вероятность | Решение |
|------|-------------|---------|
| TypeScript ошибка при build | средняя | проверить типы до SCP |
| Горизонтальное переполнение таблицы | высокая | тест на 1366px |
| Worker crash после изменения | низкая | проверить логи после restart |

---

## 7. ПРОМТ АГЕНТУ

```
Задача: [суть одним предложением]

Читай сначала:
- /Users/vagiz/Documents/Projects/tg-seo-platform/BRIEFING.md
- [конкретный файл который менять] — прочитай ЦЕЛИКОМ

Изменить:
- Файл: [абс. путь локальный]
- Серверный путь: [абс. путь на сервере]
- Что именно: [конкретно]

Не трогать:
- [список файлов/функций]

Deploy:
scp [локальный] root@155.212.141.8:[серверный]
ssh root@155.212.141.8 "cd /opt/tg-seo-platform && docker compose build frontend && docker compose up -d frontend"

Проверить:
- [acceptance criteria]
```
