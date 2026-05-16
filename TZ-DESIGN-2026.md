# TZ-DESIGN-2026 — Дизайн и вёрстка frontend
> Основано на: UX-аудит текущего сайта + анализ tgpages.com + карта экранов
> Тема: СВЕТЛАЯ. Стиль: современный SaaS 2025-2026 с анимациями.
> Дата: 2026-05-13

---

## ГЛАВНЫЕ ПРИНЦИПЫ

1. **Светлая тема** — белый фон, тёмный текст, синий акцент
2. **Одно название везде** — "Post SEO" (ни TG Buster, ни TGPages)
3. **Анимации** — scroll-trigger появление, hover-эффекты, skeleton loaders. У конкурента нет — это наш шанс выделиться
4. **Типографика** — Inter для UI, serif (Georgia/Lora) для тел статей
5. **Размеры текста** — минимум 13px для вспомогательного, 15px для контентного, 20px+ для H1 страниц
6. **Нет UI-библиотеки** — всё на Tailwind v4, чистый код

---

## ДИЗАЙН-ТОКЕНЫ (CSS переменные)

```css
:root {
  /* Цвета */
  --color-bg:           #FFFFFF;
  --color-bg-subtle:    #F8FAFC;
  --color-bg-muted:     #F1F5F9;
  --color-border:       #E2E8F0;
  --color-border-subtle: #F1F5F9;

  --color-text:         #0F172A;   /* slate-900 — основной */
  --color-text-secondary: #334155; /* slate-700 */
  --color-text-muted:   #64748B;   /* slate-500 — минимальный для UI */
  --color-text-placeholder: #94A3B8; /* slate-400 */

  --color-primary:      #2563EB;   /* blue-600 */
  --color-primary-hover: #1D4ED8;  /* blue-700 */
  --color-primary-subtle: #EFF6FF; /* blue-50 */
  --color-primary-border: #BFDBFE; /* blue-200 */

  --color-success:      #10B981;
  --color-success-subtle: #ECFDF5;
  --color-warning:      #F59E0B;
  --color-warning-subtle: #FFFBEB;
  --color-danger:       #EF4444;
  --color-danger-subtle: #FEF2F2;

  /* Типографика */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-serif: 'Lora', Georgia, serif; /* только для тел статей */

  /* Радиусы */
  --radius-sm:  6px;
  --radius-md:  10px;
  --radius-lg:  14px;
  --radius-xl:  20px;

  /* Тени */
  --shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05);
}
```

---

## КОМПОНЕНТНАЯ СИСТЕМА

### Кнопки

```
Primary:   bg-[--color-primary] text-white, hover: bg-[--color-primary-hover]
           px-4 py-2.5 rounded-[--radius-md] text-sm font-medium
           transition-all duration-150 shadow-sm hover:shadow-md

Secondary: bg-white border border-[--color-border] text-[--color-text]
           hover: bg-[--color-bg-subtle] hover:border-[--color-border]

Ghost:     bg-transparent text-[--color-text-secondary]
           hover: bg-[--color-bg-muted] text-[--color-text]

Danger:    bg-[--color-danger] text-white hover:bg-red-700

Размеры:
  sm: px-3 py-1.5 text-xs min-h-[28px]
  md: px-4 py-2.5 text-sm min-h-[36px]   ← дефолт
  lg: px-5 py-3   text-base min-h-[44px]
```

### Карточки

```
Base: bg-white rounded-[--radius-lg] border border-[--color-border]
      shadow-[--shadow-sm] p-5

Hover: hover:shadow-[--shadow-md] hover:border-[--color-border] transition-shadow duration-200

Subtle (фон серый): bg-[--color-bg-subtle] rounded-[--radius-lg] border border-[--color-border-subtle] p-5
```

### Инпуты

```
border border-[--color-border] rounded-[--radius-md] px-3 py-2.5
text-sm text-[--color-text] bg-white
placeholder:text-[--color-text-placeholder]
focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:ring-offset-0
focus:border-[--color-primary]
transition-colors duration-150
min-h-[40px]
```

### Бейджи-статусы

```
Успех:    bg-[--color-success-subtle] text-emerald-700  px-2.5 py-1 rounded-full text-xs font-medium
Ожидание: bg-[--color-warning-subtle] text-amber-700    px-2.5 py-1 rounded-full text-xs font-medium
Ошибка:   bg-[--color-danger-subtle]  text-red-700      px-2.5 py-1 rounded-full text-xs font-medium
Инфо:     bg-[--color-primary-subtle] text-blue-700     px-2.5 py-1 rounded-full text-xs font-medium
Нейтрал:  bg-[--color-bg-muted]       text-slate-600    px-2.5 py-1 rounded-full text-xs font-medium
```

---

## СТРАНИЦА 1: ЛЕНДИНГ (/)

### Hero-секция

**Layout:** Центр, max-w-4xl, py-24 md:py-32

**Элементы сверху вниз:**

1. **Badge** (анимация: fadeInDown 0.4s)
   ```
   inline-flex items-center gap-1.5 px-3 py-1.5
   bg-blue-50 border border-blue-200 rounded-full
   text-xs font-medium text-blue-700
   ```
   Текст: `✦ Бесплатно на период бета-тестирования`

2. **H1** (анимация: fadeInUp 0.5s, delay 0.1s)
   ```
   text-5xl md:text-6xl font-bold tracking-tight text-[--color-text]
   leading-[1.1]
   ```
   Текст: `Ваши посты находят`
   Вторая строка с градиентом: `в Google и Яндексе`
   ```css
   .gradient-text {
     background: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%);
     -webkit-background-clip: text;
     -webkit-text-fill-color: transparent;
   }
   ```

3. **Подзаголовок** (анимация: fadeInUp 0.5s, delay 0.2s)
   ```
   text-lg text-[--color-text-secondary] max-w-2xl mx-auto leading-relaxed mt-6
   ```
   Текст: `Подключите Telegram-канал — мы автоматически превращаем посты в SEO-статьи. Новые читатели находят вас через поиск.`

4. **CTA-кнопки** (анимация: fadeInUp 0.5s, delay 0.3s)
   ```
   flex gap-3 justify-center mt-8 flex-wrap
   ```
   - Primary lg: "Подключить канал бесплатно →"
   - Ghost: "Войти в аккаунт"

5. **Social proof** (анимация: fadeInUp 0.5s, delay 0.4s)
   ```
   text-sm text-[--color-text-muted] mt-6
   flex items-center gap-4 justify-center
   ```
   Текст: `✓ Уже 150+ каналов  ·  ✓ Без карты  ·  ✓ Результат за 24 часа`

6. **Мокап продукта** (анимация: fadeInUp 0.6s + subtle float)
   ```
   mt-16 rounded-xl border border-[--color-border] shadow-lg overflow-hidden
   ```
   Скриншот дашборда (или нарисованный мокап) — показываем сам продукт.
   Обёртка с полосой браузера (серые точки + адрес).

---

### Секция "Как это работает" (3 шага)

**Layout:** bg-[--color-bg-subtle], py-20

**Заголовок:**
```
text-3xl font-bold text-[--color-text] text-center mb-4
```

**Подзаголовок:**
```
text-base text-[--color-text-secondary] text-center mb-12 max-w-xl mx-auto
```

**3 карточки** (Grid: 1 col mobile, 3 col desktop):
```
bg-white rounded-[--radius-lg] border border-[--color-border]
p-6 shadow-[--shadow-sm]
Анимация: staggered fadeInUp при scroll-trigger (0.1s задержка между карточками)
```

Каждая карточка:
- Иконка 40x40px в синем круге (не цифра — уникальная SVG иконка)
- H3: font-semibold text-base text-[--color-text] mt-4
- p: text-sm text-[--color-text-secondary] mt-2 leading-relaxed

Шаг 1: ⚡ Подключите канал → "Добавьте бота администратором. Занимает 2 минуты."
Шаг 2: 🤖 AI пишет статью → "Gemini анализирует пост и создаёт уникальную SEO-статью 800-2000 слов."
Шаг 3: 🔍 Google индексирует → "Яндекс и Google находят статью. Новые читатели приходят на ваш канал."

---

### Секция "Возможности" (6 фич)

**Layout:** py-20 max-w-5xl

**Заголовок:** text-3xl font-bold center

**Grid 2x3** (desktop), 1 col (mobile):
```
каждый пункт: flex gap-3 items-start
иконка: 20x20 text-[--color-primary]
текст: text-sm text-[--color-text-secondary]
заголовок пункта: text-sm font-semibold text-[--color-text] mb-1
```

Фичи:
1. 🎯 SEO-оптимизированные заголовки — "Анализируем топ-20 Google, подбираем лучший title"
2. 📊 Семантическое ядро — "LSI-слова и ключевые запросы из реального SERP"
3. ⚡ Автопубликация — "Новый пост → статья через 10 минут автоматически"
4. 📱 Уведомления в Telegram — "Сообщаем когда статья опубликована"
5. 🔔 IndexNow — "Моментально уведомляем Яндекс о новых страницах"
6. 📈 Аналитика — "Видите сколько органического трафика пришло"

---

### Секция с тарифами

**Layout:** bg-[--color-bg-subtle], py-20

**3 карточки тарифов:**

Free:
```
bg-white border border-[--color-border] rounded-[--radius-xl] p-6
```

Hobby (Popular):
```
bg-[--color-primary] text-white rounded-[--radius-xl] p-6
border-2 border-[--color-primary]
scale-105 shadow-lg  ← визуально выделен
```

Pro:
```
bg-white border border-[--color-border] rounded-[--radius-xl] p-6
```

---

### CTA-секция

**Layout:** bg-gradient-to-br from-blue-600 to-violet-600, py-20, rounded-3xl mx-4 md:mx-8 mb-8

```
Текст белый
H2: text-3xl font-bold
p: text-blue-100 text-lg mt-4
Кнопка: bg-white text-blue-600 hover:bg-blue-50 — Secondary на цветном фоне
```

---

### Footer

```
border-t border-[--color-border] py-8
flex justify-between items-center flex-wrap gap-4
text-sm text-[--color-text-muted]
```

Слева: логотип + "© 2026 Post SEO"
Справа: ссылки: Поддержка · Политика · Telegram-канал

---

## СТРАНИЦА 2: ВХОД/РЕГИСТРАЦИЯ (/auth/sign-in, /auth/sign-up)

**Layout:** Split 50/50 (desktop), стопка (mobile)

**Левая половина (иллюстрация):**
```
bg-gradient-to-br from-blue-600 to-violet-700
hidden md:flex flex-col justify-between p-12
```

Содержимое:
- Логотип белый вверху
- Большая цитата в центре: "150+ каналов уже получают трафик из поиска"
- 3 буллета с галочками: ✓ Без карты  ✓ 10 мин настройка  ✓ Результат за 24ч
- Декоративный мокап экрана внизу (абстрактный)

**Правая половина (форма):**
```
flex flex-col justify-center p-8 md:p-16 max-w-md mx-auto w-full
```

Ссылка "← На главную" вверху
H1: text-2xl font-bold (sign-in: "Войдите в аккаунт", sign-up: "Создайте аккаунт")
p: text-sm text-[--color-text-muted] mt-2
Кнопка Telegram (размер lg)
Разделитель "или"
Email форма (если есть)
Ссылка "Нет аккаунта? Зарегистрируйтесь" (или наоборот)

---

## СТРАНИЦА 3: ДАШБОРД — LAYOUT ([id]/layout.tsx)

### Сайдбар (desktop)

**Ширина:** 240px fixed
**Фон:** bg-white border-r border-[--color-border]

**Структура сверху вниз:**

1. **Шапка** (p-4 border-b)
   - Лого "Post SEO" — 24px синий квадрат + текст
   - Переключатель каналов dropdown

2. **Карточка канала** (p-3 mx-3 mt-3 rounded-[--radius-md] bg-[--color-bg-subtle] border)
   - Аватар (первая буква) 32px
   - Название канала (text-sm font-semibold)
   - @username (text-xs text-[--color-text-muted])

3. **Онбординг-чеклист** (если не все шаги выполнены)
   ```
   mx-3 mt-2 rounded-[--radius-md] border border-[--color-border] overflow-hidden
   ```
   - Заголовок "Начало работы" с прогресс-баром (синяя линия)
   - "2 из 4 шагов" текст
   - Список шагов: зелёная галочка / серый кружок

4. **Навигация** (mt-4 px-3)
   ```
   каждый пункт: flex items-center gap-2.5 px-3 py-2 rounded-[--radius-md]
   text-sm text-[--color-text-secondary]
   hover: bg-[--color-bg-subtle] text-[--color-text]
   active: bg-[--color-primary-subtle] text-[--color-primary] font-medium
   ```
   Иконки: 16px

   - 📄 Публикации
   - 📊 Аналитика
   - 👥 Команда
   - 💳 Тарифы
   - ⚙️ Настройки

5. **Баннер "Бесплатный доступ"** (mt-auto mx-3 mb-2)
   ```
   bg-emerald-50 border border-emerald-200 rounded-[--radius-md] p-3
   text-xs text-emerald-700
   ```

6. **Юзер-блок** (p-3 border-t)
   - Аватар инициалы 32px
   - Имя + email (text-xs)
   - Кнопка выхода

---

## СТРАНИЦА 4: ПУБЛИКАЦИИ (/posts)

### Header страницы

```
border-b border-[--color-border] bg-white px-6 py-4
flex items-center justify-between
```

**Левый блок:**
- H1: `text-xl font-semibold text-[--color-text]` — "Публикации"
- p: `text-sm text-[--color-text-muted] mt-0.5` — "Управление SEO-индексацией"

**Правый блок:**
- Кнопка "Продвинуть выбранные" (если есть выделение) Primary
- Переключатель автопубликации (toggle)

---

### Фильтры

```
px-6 py-3 border-b border-[--color-border] flex gap-2 overflow-x-auto
```

Таб-кнопки:
```
px-3 py-1.5 rounded-full text-sm font-medium transition-colors
Active: bg-[--color-primary] text-white
Inactive: text-[--color-text-muted] hover:bg-[--color-bg-muted] hover:text-[--color-text]
```

Фильтры: Все · Ожидают · Опубликованы · Обрабатываются

---

### Таблица постов

**Строка поста:**
```
px-6 py-4 border-b border-[--color-border-subtle]
hover:bg-[--color-bg-subtle] transition-colors cursor-default
flex items-center gap-4
```

Структура строки:
- **Чекбокс** (16px)
- **Тип-иконка** (мессенджер: TG/MAX, 20px)
- **Основное** (flex-1):
  - Первая строка: текст поста (text-sm font-medium, truncate max-w-md)
  - Вторая строка: дата (text-xs text-[--color-text-muted])
- **Статус-бейдж** (flex-shrink-0)
- **Действие** (flex-shrink-0):
  - Кнопка "Продвинуть" (Primary sm) — для pending
  - Кнопка "Открыть статью" (Secondary sm) — для indexed
  - Спиннер + "Обрабатывается..." — для processing

**Empty state:**
```
py-20 text-center
Иконка 48px серая
text-base font-medium text-[--color-text] mt-4
text-sm text-[--color-text-muted] mt-2
```

**Skeleton loader** (пока грузится):
```
3-5 строк-заглушек с animate-pulse
bg-[--color-bg-muted] rounded h-4 различной ширины
```

---

### Пагинация

```
px-6 py-4 flex items-center justify-between border-t border-[--color-border]
```

- Текст слева: "Показано 1–10 из 47 публикаций" (text-sm text-[--color-text-muted])
- Кнопки справа: "← Назад" / "Вперёд →" (Secondary sm)

---

## СТРАНИЦА 5: НАСТРОЙКИ (/settings)

**Блоки — единообразные карточки:**
```
bg-white rounded-[--radius-lg] border border-[--color-border] p-6 shadow-[--shadow-sm]
```

**Заголовок блока:**
```
text-sm font-semibold text-[--color-text] mb-1
```

**Подзаголовок блока:**
```
text-xs text-[--color-text-muted] mb-5
```

**Разделитель внутри блока:**
```
border-t border-[--color-border-subtle] -mx-6 my-5
```

**Toggle-переключатель:**
```
w-11 h-6 rounded-full relative transition-colors duration-200
ON:  bg-[--color-primary]
OFF: bg-slate-300
Шарик: absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform
ON: translate-x-5, OFF: translate-x-0
```

**Danger zone:**
```
border border-red-200 (не border-[--color-border])
```

---

## СТРАНИЦА 6: ПУБЛИЧНАЯ СТРАНИЦА ПОСТА (/{channel}/{slug})

**Важно:** это главная SEO-страница. Она должна быть максимально читаемой и профессиональной.

### Header (sticky)

```
bg-white/80 backdrop-blur-md border-b border-[--color-border]
py-3 px-4 flex items-center justify-between
```

Слева: breadcrumb `Post SEO → @channel → Заголовок`
Справа: кнопка "Читать канал в Telegram" (Primary sm)

---

### Layout (двухколоночный, desktop)

```
max-w-5xl mx-auto px-4 py-8
grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8
```

**Основная колонка:**

1. Мета-строка: `text-sm text-[--color-text-muted]` — "@channel · 13 мая 2026"

2. H1: `text-3xl md:text-4xl font-bold text-[--color-text] leading-tight mt-2`

3. Изображение (если есть): `rounded-[--radius-lg] w-full mt-6`

4. Тело статьи (`font-serif` — Lora/Georgia):
   ```
   prose prose-lg max-w-none mt-6
   text-[--color-text-secondary] leading-[1.75]
   ```
   - H2: text-2xl font-bold font-sans (заголовки секций — без serif)
   - H3: text-xl font-semibold font-sans
   - p: text-base leading-[1.8]
   - blockquote: border-l-4 border-[--color-primary] pl-4 italic text-[--color-text-muted]

5. FAQ-секция:
   ```
   mt-10 border-t border-[--color-border] pt-8
   ```
   Аккордеон или статичный список с H3 + p

6. Источник: "Оригинальный пост:" + превью Telegram

7. CTA-блок:
   ```
   bg-[--color-primary-subtle] border border-[--color-primary-border]
   rounded-[--radius-xl] p-6 mt-10 text-center
   ```
   "Понравилась статья? Подпишитесь на канал @{channel}"
   Кнопка Primary lg

**Сайдбар (desktop только):**
```
sticky top-20 space-y-4
```

Карточка "О канале":
```
bg-white border border-[--color-border] rounded-[--radius-lg] p-5 shadow-[--shadow-sm]
```
- Аватар 48px (первая буква в синем круге)
- Название канала: text-base font-semibold
- @username: text-sm text-[--color-text-muted]
- Описание: text-sm text-[--color-text-secondary] mt-2 line-clamp-3
- Кнопка "Открыть в Telegram" (Primary, full-width, mt-4)

Карточка "Ещё статьи":
```
bg-white border border-[--color-border] rounded-[--radius-lg] p-5 shadow-[--shadow-sm]
```
- Заголовок: text-sm font-semibold
- Список 5 постов: truncate + дата

---

## СТРАНИЦА 7: СТРАНИЦА КАНАЛА (/{channel}/)

**Layout:** max-w-4xl mx-auto px-4 py-8

**Шапка канала:**
```
flex items-start gap-4 pb-8 border-b border-[--color-border]
```
- Аватар 64px в синем круге
- Название h1: text-2xl font-bold
- @username: text-sm text-[--color-text-muted]
- Описание: text-base text-[--color-text-secondary] mt-2

**Список статей — карточки:**
```
mt-8 grid grid-cols-1 md:grid-cols-2 gap-4
```

Каждая карточка:
```
bg-white border border-[--color-border] rounded-[--radius-lg] p-5
shadow-[--shadow-sm] hover:shadow-[--shadow-md] transition-shadow cursor-pointer
```
- H2: text-base font-semibold text-[--color-text] line-clamp-2
- Дата: text-xs text-[--color-text-muted] mt-3
- Превью текста: text-sm text-[--color-text-secondary] mt-2 line-clamp-2
- Кнопка/ссылка "Читать →"

---

## АНИМАЦИИ (обязательные)

### Scroll-trigger (Intersection Observer)

```javascript
// Все секции лендинга появляются при скролле
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

Задержки для групп: `transition-delay: 0.1s, 0.2s, 0.3s`

### Hover-эффекты

```css
/* Карточки */
.card { transition: box-shadow 0.2s, border-color 0.2s; }
.card:hover { box-shadow: var(--shadow-md); }

/* Кнопки */
.btn { transition: all 0.15s; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); }
```

### Skeleton loaders (дашборд)

```html
<!-- Пока грузится список постов -->
<div class="animate-pulse space-y-3 px-6 py-4">
  <div class="h-4 bg-slate-100 rounded w-3/4"></div>
  <div class="h-4 bg-slate-100 rounded w-1/2"></div>
  <div class="h-4 bg-slate-100 rounded w-5/6"></div>
</div>
```

### Float (мокап в hero)

```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}
.hero-mockup {
  animation: float 4s ease-in-out infinite;
}
```

---

## МОБИЛЬНАЯ ВЕРСИЯ

**Брейкпоинты:**
- mobile: < 640px
- tablet: 640px–1024px
- desktop: > 1024px

**Ключевые изменения на мобиле:**
1. Лендинг H1: 36px (было 60px)
2. Две кнопки CTA — стопкой, full-width
3. Grid 3 шагов → 1 колонка
4. Auth page — нет левой панели, только форма (full-screen)
5. Дашборд — нет sidebar, только MobileNav снизу
6. Страница поста — нет сайдбара, только основная колонка
7. Таблица постов — упрощённый вид (меньше колонок)

**MobileNav (bottom tabs):**
```
fixed bottom-0 left-0 right-0 bg-white border-t border-[--color-border]
flex justify-around py-2 px-4 safe-area-inset-bottom
z-50
```
Каждый таб: иконка 20px + текст 10px + active индикатор (синяя точка / цвет)

---

## ИКОНКИ

Использовать **Lucide React** (уже есть в Next.js экосистеме):
```bash
npm install lucide-react
```

Размеры: 16px для inline-текст, 20px для кнопки/навигация, 24px для карточки, 48px для empty state

Не использовать inline SVG — только `<Icon size={20} className="text-..." />`

---

## СТРУКТУРА ФАЙЛОВ

```
frontend/src/
├── app/
│   ├── globals.css          ← CSS-токены + reset
│   └── ...pages
├── components/
│   ├── ui/                  ← переиспользуемые
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── Toggle.tsx
│   │   └── Skeleton.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── MobileNav.tsx
│   │   └── SidebarNav.tsx
│   └── features/
│       ├── PostCard.tsx
│       ├── ChannelHeader.tsx
│       └── OnboardingChecklist.tsx
```

---

## ПРИОРИТЕТ РАБОТ

### Фаза 1 — Основа (блокирует всё)
1. CSS-токены в globals.css
2. Компоненты Button, Card, Badge, Input, Toggle, Skeleton
3. Обновить Sidebar layout (типографика, размеры)
4. Исправить MobileNav

### Фаза 2 — Главные страницы
5. Лендинг (/) — полный редизайн с анимациями
6. Auth (/auth/sign-in) — split-layout
7. Страница постов (/posts) — новая таблица

### Фаза 3 — Публичные SEO-страницы
8. Страница поста (/{channel}/{slug}) — двухколоночный, serif, сайдбар
9. Страница канала (/{channel}/) — карточки

### Фаза 4 — Детали
10. Настройки (/settings)
11. Аналитика (/analytics)
12. Пустые состояния, skeleton loaders везде
13. Мобильная версия финальная проверка

---

## ЗАПРЕЩЕНО

- Inline SVG больше 3 строк — только Lucide иконки
- Цвета вне токенов (нет `#1a2b3c` в JSX — только `text-[--color-text]`)
- Тексты < 13px в UI (кроме badge)
- Кнопки с height < 32px (мин. tap target)
- `!important` (только в экстренных случаях)
- `oklch()` цвета — только hex/rgb для совместимости

---

*ТЗ составлено на основе: UX-аудит post-seo.seo-rezult.ru, анализ tgpages.com, карта 13 экранов из кода. Стиль: светлая тема, Inter + Lora, синий акцент, Tailwind v4.*
