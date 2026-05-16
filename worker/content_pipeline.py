"""
Content Pipeline — полный AI пайплайн для генерации SEO-контента из TG-поста.

Шаги:
  1. extract_topic    — Gemini извлекает главный поисковый запрос из текста поста
  2. fetch_serp       — XMLStock возвращает TOP-20 Яндекс SERP
  3. compute_lsi      — Python TF-IDF: слова ≥35% docs → title, ≥15% → desc
  4. generate_meta    — Gemini: SEO title + description + slug (с LSI)
  5. generate_article — Gemini: SEO-статья 800-1200 слов на основе поста
"""
import json
import re
import asyncio
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime
from urllib.parse import quote_plus

import httpx
from sqlalchemy import select

from config import DEEPSEEK_API_KEY, XMLSTOCK_URL, SITE_URL, TOOLSELFIZAL_API_KEY, TOOLSELFIZAL_BASE_URL
from database import async_session, init_db
from models import Channel, Post


DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

RU_STOP_WORDS = {
    "и","в","во","не","что","он","на","я","с","со","как","а","то","все","она",
    "так","его","но","да","ты","к","у","же","вы","за","бы","по","только","ее",
    "мне","было","вот","от","меня","еще","нет","о","из","ему","теперь","когда",
    "даже","ну","вдруг","ли","если","уже","или","ни","быть","был","него","до",
    "вас","нибудь","опять","уж","вам","ведь","там","потом","себя","ничего","ей",
    "может","они","тут","где","есть","надо","ней","для","мы","тебя","их","чем",
    "была","сам","чтоб","без","будто","чего","раз","тоже","себе","под","будет",
    "ж","тогда","кто","этот","того","потому","этого","какой","совсем","ним",
    "здесь","этом","один","почти","мой","тем","чтобы","нее","сейчас","были",
    "куда","зачем","всех","никогда","можно","при","наконец","два","об","другой",
    "хоть","после","над","больше","тот","через","эти","нас","про","всего","них",
    "какая","много","разве","три","эту","моя","впрочем","хорошо","свою","этой",
    "перед","иногда","лучше","чуть","том","нельзя","такой","им","более","всегда",
    "конечно","всю","между","это","очень","руб","рублей","также","который","которая",
    "которые","этим","тем","этих","этому","него","нему","себе",
}


async def _deepseek_call(prompt: str, max_tokens: int = 2048) -> str:
    """Single DeepSeek API call. Returns raw text."""
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            DEEPSEEK_URL,
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "deepseek-v4-flash",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "max_tokens": max_tokens,
                "thinking": {"type": "disabled"},
            },
        )
        resp.raise_for_status()
        data = resp.json()

    return data["choices"][0]["message"]["content"].strip()


def _parse_json(text: str) -> dict:
    """Parse JSON from Gemini response, strip markdown if needed."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```\w*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return json.loads(text)


# -- Шаг 1: Извлечь поисковый запрос -----------------------------------------

async def extract_topic(post_text: str, channel_title: str) -> str:
    """Ask Gemini: what is the main search query for this post?"""
    prompt = f"""Канал: {channel_title}

Текст поста:
---
{post_text[:1500]}
---

Определи ОДИН главный поисковый запрос (2-5 слов) по которому пользователь нашёл бы эту статью в Яндексе.
Верни ТОЛЬКО строку с запросом, без кавычек, без объяснений."""

    topic = await _deepseek_call(prompt, max_tokens=100)
    topic = topic.strip().strip('"\'').strip()
    return topic[:100] if topic else channel_title


# -- Шаг 2: XMLStock SERP -----------------------------------------------------

async def fetch_serp(query: str) -> list[dict]:
    """Fetch TOP-20 Yandex SERP via XMLStock. Returns list of {title, snippet, url}."""
    if not XMLSTOCK_URL:
        return []

    results: list[dict] = []
    encoded_query = quote_plus(query)
    groupby = "attr%3D%22%22.mode%3Dflat.groups-on-page%3D10.docs-in-group%3D1"

    async with httpx.AsyncClient(timeout=30) as client:
        for page in range(2):
            url = (
                f"{XMLSTOCK_URL}"
                f"&query={encoded_query}"
                f"&groupby={groupby}"
                f"&page={page}"
            )
            try:
                resp = await client.get(url)
                if not resp.is_success:
                    break
                root = ET.fromstring(resp.text)

                error = root.find(".//error")
                if error is not None:
                    break

                for doc in root.findall(".//doc"):
                    title_el = doc.find("title")
                    url_el = doc.find("url")
                    headline_el = doc.find("headline")
                    passages = doc.findall(".//passages/passage")

                    title = (title_el.text or "").strip() if title_el is not None else ""
                    link = (url_el.text or "").strip() if url_el is not None else ""

                    snippet_parts = []
                    if headline_el is not None and headline_el.text:
                        snippet_parts.append(headline_el.text.strip())
                    for p in passages:
                        if p.text:
                            snippet_parts.append(p.text.strip())
                    snippet = " ".join(snippet_parts)

                    if title:
                        results.append({"title": title, "snippet": snippet, "url": link})

            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"[xmlstock] error page {page}: {e}")
                break

    return results


# -- Шаг 3: LSI анализ --------------------------------------------------------

def _normalize_word(word: str) -> str:
    prefixes = [
        ("цен", "цена"), ("магазин", "магазин"), ("интернет", "интернет"),
        ("доставк", "доставка"), ("купи", "купить"), ("купл", "купить"),
        ("тренировк", "тренировка"), ("питани", "питание"), ("упражнени", "упражнение"),
        ("мышц", "мышца"), ("подход", "подход"), ("повторени", "повторение"),
        ("результат", "результат"), ("програм", "программа"), ("нагрузк", "нагрузка"),
    ]
    for prefix, normalized in prefixes:
        if word.startswith(prefix):
            return normalized
    return word


def compute_lsi(serp_data: list[dict]) -> dict:
    """
    TF-IDF LSI analysis.
    Returns:
      title_words: list[str]  — words in >=35% of docs
      desc_words:  list[str]  — words in 15-35% of docs
    """
    if not serp_data:
        return {"title_words": [], "desc_words": []}

    total = len(serp_data)
    doc_counts: dict[str, int] = defaultdict(int)

    for doc in serp_data:
        text = (doc["title"] + " " + doc["snippet"]).lower()
        text = re.sub(r"[^а-яёa-z0-9\s]", " ", text)
        words = set(text.split())
        words = {_normalize_word(w) for w in words if len(w) > 2 and w not in RU_STOP_WORDS and not w.isdigit()}

        for w in words:
            doc_counts[w] += 1

    title_words = []
    desc_words = []
    for word, count in doc_counts.items():
        pct = count / total * 100
        if pct >= 35:
            title_words.append((word, count))
        elif pct >= 15:
            desc_words.append((word, count))

    title_words.sort(key=lambda x: -x[1])
    desc_words.sort(key=lambda x: -x[1])

    return {
        "title_words": [w for w, _ in title_words[:6]],
        "desc_words": [w for w, _ in desc_words[:10]],
    }


# -- Шаг 4: Генерация мета ----------------------------------------------------

META_PROMPT = """ROLE: Senior SEO Expert & CTR Copywriter.

TASK: Напиши идеальный Title, H1 и Meta Description для страницы в Яндексе.

Канал: {channel_title}
Поисковый запрос: {query}

LSI слова для Title (использовать ВСЕ, можно менять падежи): {title_words}
LSI слова для Description (использовать ВСЕ, можно менять падежи): {desc_words}

ДАННЫЕ ТОП-20 ЯНДЕКСА (для анализа ниши и конкурентов):
{serp_snippets}

ПРАВИЛА:
- Title: строго 10-11 слов, макс 65 символов, главный запрос в начале, ВСЕ title_words включить, БЕЗ названия бренда
- H1: читаемая форма маркера для людей, отличается от Title
- Description: строго 28-32 слова, макс 158 символов, ВСЕ desc_words включить, CTA в конце
- Slug: 3-5 слов через дефис, только латиница, транслитерация ключевого запроса
- Без тавтологии в Title (не повторять корни слов)
- Язык: русский

Верни ТОЛЬКО JSON (без markdown):
{{
  "title": "...",
  "h1": "...",
  "description": "...",
  "slug": "...",
  "keywords": ["слово1", "слово2", "слово3"],
  "missed_lsi": []
}}"""


async def generate_meta(
    query: str,
    channel_title: str,
    channel_description: str,
    lsi: dict,
    serp: list[dict] | None = None,
) -> dict:
    """Generate SEO meta using XMLStock LSI words."""
    serp_snippets = ""
    if serp:
        lines = [f"[{i+1}] {r['title']} — {r['snippet'][:120]}" for i, r in enumerate(serp[:20])]
        serp_snippets = "\n".join(lines)
    else:
        serp_snippets = "нет данных"

    prompt = META_PROMPT.format(
        channel_title=channel_title,
        query=query,
        title_words=", ".join(lsi["title_words"]) or "нет данных",
        desc_words=", ".join(lsi["desc_words"]) or "нет данных",
        serp_snippets=serp_snippets,
    )

    text = await _deepseek_call(prompt, max_tokens=600)
    try:
        result = _parse_json(text)
    except Exception:
        result = {}

    title = str(result.get("title", "")).strip()
    desc = str(result.get("description", "")).strip()
    slug = str(result.get("slug", "")).strip()

    if len(title) > 70:
        title = title[:67] + "..."
    if len(desc) > 160:
        desc = desc[:157] + "..."
    if not slug:
        slug = _transliterate(title)

    return {
        "title": title,
        "description": desc,
        "slug": slug,
        "keywords": result.get("keywords", []),
    }


async def generate_h1(seo_title: str, post_text: str) -> str:
    """Generate H1 that differs from seo_title: more conversational, different word order."""
    prompt = (
        f"Title страницы: {seo_title}\n\n"
        f"Тема поста: {post_text[:300]}\n\n"
        "Напиши H1 заголовок страницы который:\n"
        "- Отличается от title (другие слова или другой порядок)\n"
        "- Более разговорный стиль, менее SEO-шаблонный\n"
        "- 5-12 слов, на русском\n"
        "- Без кавычек и лишних символов\n\n"
        "Верни только H1, без пояснений."
    )
    result = await _deepseek_call(prompt, max_tokens=80)
    h1 = result.strip().strip('"').strip("'")
    return h1 if h1 else seo_title


def _transliterate(text: str) -> str:
    mapping = {
        "а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"yo","ж":"zh",
        "з":"z","и":"i","й":"y","к":"k","л":"l","м":"m","н":"n","о":"o",
        "п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"kh","ц":"ts",
        "ч":"ch","ш":"sh","щ":"shch","ъ":"","ы":"y","ь":"","э":"e","ю":"yu","я":"ya",
    }
    result = []
    for char in text.lower():
        if char in mapping:
            result.append(mapping[char])
        elif char.isascii() and (char.isalnum() or char == "-"):
            result.append(char)
        elif char == " ":
            result.append("-")
    slug = "-".join(filter(None, "".join(result).split("-")))
    return slug[:80]


# -- Шаг 5: Генерация статьи через tools.seo-rezult.ru -----------------------

async def _toolselfizal_generate_article(
    topic: str,
    brand_name: str,
    brand_facts: str,
    lsi_seed: str,
    region: int = 213,
    timeout: int = 180,
) -> dict:
    """
    Запускает генерацию SEO-статьи через tools.seo-rezult.ru API.
    Возвращает: { full_html, title, h1, description, word_count }
    Время ожидания: 40–120 сек.
    """
    if not TOOLSELFIZAL_API_KEY:
        raise ValueError("[toolselfizal] TOOLSELFIZAL_API_KEY not set")

    headers = {
        "Authorization": f"Bearer {TOOLSELFIZAL_API_KEY}",
        "Content-Type": "application/json",
    }

    import logging
    logger = logging.getLogger(__name__)

    async with httpx.AsyncClient(timeout=30) as client:
        start_resp = await client.post(
            f"{TOOLSELFIZAL_BASE_URL}/api/content-v2/info/start",
            json={
                "topic": topic,
                "region": region,
                "brand_name": brand_name,
                "brand_facts": brand_facts[:3000],
                "raw_lsi_seed": lsi_seed,
            },
            headers=headers,
        )
        start_resp.raise_for_status()
        task_id = start_resp.json()["task_id"]
        logger.info(f"[toolselfizal] task_id={task_id} started")

    deadline = asyncio.get_event_loop().time() + timeout
    poll_interval = 8

    async with httpx.AsyncClient(timeout=30) as client:
        while asyncio.get_event_loop().time() < deadline:
            await asyncio.sleep(poll_interval)
            status_resp = await client.get(
                f"{TOOLSELFIZAL_BASE_URL}/api/content-v2/status/{task_id}",
                headers=headers,
            )
            status_resp.raise_for_status()
            status_data = status_resp.json()
            status = status_data.get("status")
            logger.info(f"[toolselfizal] task_id={task_id} status={status}")

            if status == "done":
                break
            elif status == "error":
                raise RuntimeError(f"[toolselfizal] generation failed: {status_data}")

        else:
            raise TimeoutError(f"[toolselfizal] task_id={task_id} timed out after {timeout}s")

        result_resp = await client.get(
            f"{TOOLSELFIZAL_BASE_URL}/api/content-v2/result/{task_id}",
            headers=headers,
        )
        result_resp.raise_for_status()
        return result_resp.json()


# -- Fallback: генерация статьи через DeepSeek --------------------------------

ARTICLE_PROMPT = """Ты senior SEO-копирайтер. Пишешь статью для продвижения в Яндекс и Google.

ПОИСКОВЫЙ ЗАПРОС: {query}
КАНАЛ: {channel_title}
ДАТА ПОСТА: {post_date}

ТЕКСТ ПОСТА (первоисточник — используй как основу, цитируй конкретные данные):
---
{post_text}
---

ПОДТЕМЫ КОНКУРЕНТОВ ИЗ ТОП-20 (обязательно раскрой каждую в H2):
{serp_subtopics}

LSI-СЛОВА (использовать ВСЕ, минимум 1 раз, в любой словоформе):
{lsi_words}

{zone_instruction}

ПРАВИЛА:
- Структура: Вступление (2-3 предложения) → H2 (3-4 штуки по подтемам SERP) → Переменная зона → H2 Итог
- H2-заголовки = точные формулировки подтем из SERP (QBST покрытие)
- В тексте: конкретные цифры и факты из поста, прямые цитаты в кавычках
- НЕ придумывать данные которых нет в посте
- Стиль: экспертный, живой, без канцелярщины
- Объём: 800-1200 слов
- Язык: русский

Верни ТОЛЬКО HTML без markdown и обёрток:
<p>вступление</p><h2>...</h2><p>...</p>..."""

_ARTICLE_ZONE_INSTRUCTIONS = [
    "ЗОНА УСИЛИЯ (тип 0 — руководство): между разделами добавь <h2>Пошаговый план</h2> с нумерованным списком <ol><li>...</li></ol> — 5-7 шагов из практики поста",
    "ЗОНА УСИЛИЯ (тип 1 — сравнение): между разделами добавь <h2>Сравнение подходов</h2> с таблицей <table><tr><th>Подход</th><th>Плюсы</th><th>Минусы</th></tr>...</table>",
    "ЗОНА УСИЛИЯ (тип 2 — кейс): между разделами добавь <h2>Реальный кейс</h2> — пример из поста: Проблема → Действие → Результат с конкретными цифрами",
]


async def _generate_article_deepseek(
    post_text: str,
    query: str,
    serp: list[dict],
    lsi_words: list[str],
    post_date: str,
    zone_type: int,
    channel_title: str,
) -> str:
    """Fallback: генерация SEO-статьи через DeepSeek."""
    import logging
    logger = logging.getLogger(__name__)
    logger.info("[pipeline] Using DeepSeek fallback for article generation")

    if len(post_text.strip()) < 50:
        return ""

    serp_subtopics = _extract_serp_subtopics(serp)
    zone_instruction = _ARTICLE_ZONE_INSTRUCTIONS[zone_type % 3]

    prompt = ARTICLE_PROMPT.format(
        query=query,
        channel_title=channel_title,
        post_date=post_date or "неизвестно",
        post_text=post_text[:3000],
        serp_subtopics=serp_subtopics,
        lsi_words=", ".join(lsi_words) if lsi_words else "нет данных",
        zone_instruction=zone_instruction,
    )

    html = await _deepseek_call(prompt, max_tokens=3000)

    if html.startswith("```"):
        html = re.sub(r"^```\w*\n?", "", html)
        html = re.sub(r"\n?```$", "", html)

    return html.strip()


async def generate_article(
    post_text: str,
    query: str,
    serp: list[dict],
    lsi_words: list[str],
    post_date: str,
    zone_type: int,
    channel_title: str,
) -> dict:
    """
    Генерирует SEO-статью.
    Сначала пробует tools.seo-rezult.ru, при ошибке — DeepSeek fallback.
    Возвращает: { full_html, title, h1, description, word_count }
    """
    import logging
    logger = logging.getLogger(__name__)

    lsi_seed = ", ".join(lsi_words)

    if TOOLSELFIZAL_API_KEY:
        try:
            serp_subtopics = _extract_serp_subtopics(serp)
            structured_facts = (
                f"{post_text[:1600]}\n\n"
                f"ПОДТЕМЫ ДЛЯ РАСКРЫТИЯ В СТАТЬЕ:\n{serp_subtopics}"
            )
            result = await _toolselfizal_generate_article(
                topic=query,
                brand_name=channel_title,
                brand_facts=structured_facts,
                lsi_seed=lsi_seed,
            )
            if result.get("full_html"):
                logger.info(f"[pipeline] Article via toolselfizal: {result.get('word_count','?')} words")
                return result
        except Exception as e:
            logger.warning(f"[pipeline] toolselfizal failed ({e}), falling back to DeepSeek")

    html = await _generate_article_deepseek(
        post_text=post_text,
        query=query,
        serp=serp,
        lsi_words=lsi_words,
        post_date=post_date,
        zone_type=zone_type,
        channel_title=channel_title,
    )
    word_count = len(html.replace("<", " <").split()) if html else 0
    return {"full_html": html, "title": "", "h1": "", "description": "", "word_count": word_count}


# -- Шаг 6: Генерация FAQ -----------------------------------------------------

FAQ_PROMPT = """Ты SEO-эксперт. Создай раздел FAQ для статьи на основе поста из Telegram-канала.

Поисковый запрос: {query}
LSI-слова (используй их в ответах): {lsi_words}
Дата поста: {post_date}

Подтемы которые освещают конкуренты в топе (QBST — обязательно раскрой каждую):
{serp_subtopics}

Текст поста:
---
{post_text}
---

ПРАВИЛА:
- Составь 5-7 вопросов — обязательно покрой все подтемы конкурентов выше
- В каждом ответе используй 1-2 LSI-слова из списка
- Для 1-2 ответов используй структуру: утверждение → уточнение → практический вывод
- Добавь в один из ответов: "По данным на {post_date}..."
- Используй ТОЛЬКО факты из текста поста, не придумывай
- Прямые цитаты из поста (в кавычках) приветствуются
{zone_instruction}

Верни ТОЛЬКО HTML (без markdown, без обёрток):
<div class="faq-item"><h3>Вопрос?</h3><p>Ответ.</p></div>
... повтори 5-7 раз"""

_ZONE_INSTRUCTIONS = [
    "- Формат: практическое руководство. Один из ответов — пошаговая инструкция (1. 2. 3.)",
    "- Формат: сравнительный анализ. Один из ответов — сравни два подхода или варианта по критериям",
    "- Формат: кейс. Один из ответов — конкретный пример из поста с описанием проблемы, действия и результата",
]


def _extract_serp_subtopics(serp: list[dict]) -> str:
    """Extract unique subtopic phrases from SERP snippets for QBST coverage."""
    if not serp:
        return "нет данных"
    # Collect question-like and topic phrases from titles+snippets
    phrases: list[str] = []
    seen: set[str] = set()
    for item in serp[:10]:
        for field in ("title", "snippet"):
            text = item.get(field, "")
            # Split on common delimiters to get subtopics
            parts = re.split(r"[|–—:,]", text)
            for part in parts:
                part = part.strip()
                words = part.split()
                if 2 <= len(words) <= 8 and part.lower() not in seen:
                    seen.add(part.lower())
                    phrases.append(part)
                if len(phrases) >= 12:
                    break
        if len(phrases) >= 12:
            break
    return "\n".join(f"- {p}" for p in phrases[:10]) if phrases else "нет данных"


async def generate_faq(
    post_text: str,
    query: str,
    lsi_words: list[str] = [],
    post_date: str = "",
    serp: list[dict] = [],
    zone_type: int = 0,
) -> str:
    """Generate FAQ HTML with QBST subtopic coverage and variable zone format."""
    if len(post_text.strip()) < 100:
        return ""

    serp_subtopics = _extract_serp_subtopics(serp)
    zone_instruction = _ZONE_INSTRUCTIONS[zone_type % len(_ZONE_INSTRUCTIONS)]

    prompt = FAQ_PROMPT.format(
        query=query,
        lsi_words=", ".join(lsi_words) if lsi_words else "нет данных",
        post_date=post_date or "неизвестно",
        serp_subtopics=serp_subtopics,
        zone_instruction=zone_instruction,
        post_text=post_text[:2500],
    )

    faq_html = await _deepseek_call(prompt, max_tokens=3000)

    if faq_html.startswith("```"):
        faq_html = re.sub(r"^```\w*\n?", "", faq_html)
        faq_html = re.sub(r"\n?```$", "", faq_html)

    return faq_html.strip()


# -- Анализ канала ------------------------------------------------------------

async def analyze_channel(channel_id: str) -> dict:
    """
    Анализ последних постов канала для SEO-аудита.
    Возвращает: {audit_text: str, indexable_count: int}
    """
    import logging
    logger = logging.getLogger(__name__)

    try:
        async with async_session() as session:
            channel_result = await session.execute(
                select(Channel).where(Channel.id == channel_id)
            )
            channel = channel_result.scalar_one_or_none()
            if not channel:
                logger.warning(f"[analyze_channel] Channel {channel_id} not found")
                return {"audit_text": "", "indexable_count": 0}

            posts_result = await session.execute(
                select(Post)
                .where(Post.channel_id == channel_id)
                .order_by(Post.date.desc())
                .limit(20)
            )
            posts = posts_result.scalars().all()

            posts = [p for p in posts if p.text and len(p.text) > 50]

            indexable_count = sum(1 for p in posts if p.is_indexed)

            combined_texts = "\n---\n".join(
                p.text[:400] for p in posts[:12]
            )

            if not combined_texts.strip():
                return {"audit_text": "", "indexable_count": indexable_count}

            prompt = f"""Ты SEO-эксперт. Проанализируй тексты постов Telegram-канала и напиши краткий аудит для владельца канала.

Тексты постов:
---
{combined_texts}
---

Напиши 2-3 предложения: какой контент в канале, почему он подходит (или не подходит) для SEO-продвижения через поисковые системы, какие темы хорошо ранжируются, есть ли недостатки.

Стиль: профессиональный, конкретный. Начни с сильной стороны. Упомяни конкретные темы из постов.
Верни ТОЛЬКО текст аудита, без заголовков и лишнего."""

            audit_text = await _deepseek_call(prompt, max_tokens=300)
            audit_text = (audit_text or "").strip().strip('"').strip()

            return {
                "audit_text": audit_text,
                "indexable_count": indexable_count,
                # Обратная совместимость
                "topics": [],
                "keywords": [],
                "focus_score": 0.0,
            }

    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"[analyze_channel] Error: {e}")
        return {"audit_text": "", "indexable_count": 0, "topics": [], "keywords": [], "focus_score": 0.0}


# -- Основная функция ---------------------------------------------------------

async def process_post(post_id: int) -> bool:
    """
    Full pipeline for one post.
    Returns True on success, False on error.
    """
    import logging
    logger = logging.getLogger(__name__)

    async with async_session() as session:
        post_result = await session.execute(
            select(Post).where(Post.id == post_id)
        )
        post = post_result.scalar_one_or_none()
        if not post:
            logger.warning(f"[pipeline] Post {post_id} not found")
            return False

        channel_result = await session.execute(
            select(Channel).where(Channel.id == post.channel_id)
        )
        channel = channel_result.scalar_one_or_none()
        if not channel:
            logger.warning(f"[pipeline] Channel for post {post_id} not found")
            return False

        if not post.text or not post.text.strip():
            logger.info(f"[pipeline] Post {post_id} has no text, skipping")
            return False

        logger.info(f"[pipeline] Processing post {post_id} (@{channel.username})...")

        try:
            query = await extract_topic(post.text, channel.title or channel.username)
            logger.info(f"[pipeline]   topic: '{query}'")

            serp = await fetch_serp(query)
            logger.info(f"[pipeline]   serp: {len(serp)} results")

            lsi = compute_lsi(serp)
            logger.info(f"[pipeline]   lsi title_words: {lsi['title_words']}")

            # ── Шаг 5: Генерация статьи ─────────────────────────────────────
            article_result = await generate_article(
                post_text=post.text,
                query=query,
                serp=serp,
                lsi_words=lsi["title_words"] + lsi["desc_words"],
                post_date=post.date.strftime("%d.%m.%Y") if post.date else "",
                zone_type=post_id % 3,
                channel_title=channel.title or channel.username,
            )
            logger.info(f"[pipeline]   article: {article_result.get('word_count', '?')} words")

            # Мета из результата API (title, h1, description)
            api_title = str(article_result.get("title", "")).strip()
            api_h1    = str(article_result.get("h1", "")).strip()
            api_desc  = str(article_result.get("description", "")).strip()
            article_html = str(article_result.get("full_html", "")).strip()

            # Fallback: если API не вернул мета — генерируем своим методом
            if not api_title:
                logger.warning("[pipeline]   API returned empty title, falling back to generate_meta()")
                meta = await generate_meta(
                    query=query,
                    channel_title=channel.title or channel.username,
                    channel_description=channel.description or "",
                    lsi=lsi,
                    serp=serp,
                )
                api_title = meta["title"]
                api_h1    = meta.get("h1", meta["title"])
                api_desc  = meta["description"]

            # Slug из title (транслитерация)
            seo_slug = _transliterate(api_title)

            if not api_title.strip():
                logger.warning(f"[pipeline] Post {post_id}: empty title, skipping")
                return False
            if not seo_slug.strip():
                logger.warning(f"[pipeline] Post {post_id}: empty slug, skipping")
                return False

            logger.info(f"[pipeline]   title: '{api_title}'")

            # ── Шаг 6: FAQ ──────────────────────────────────────────────────
            faq_html = await generate_faq(
                post_text=post.text,
                query=query,
                lsi_words=lsi["title_words"] + lsi["desc_words"],
                post_date=post.date.strftime("%d.%m.%Y") if post.date else "",
                serp=serp,
                zone_type=post_id % 3,
            )
            logger.info(f"[pipeline]   faq: {len(faq_html)} chars")

            post.seo_title = api_title[:70]
            if not api_h1:
                api_h1 = await generate_h1(api_title, post.text or "")
                logger.info(f"[pipeline]   h1 generated: '{api_h1[:60]}'")
            post.seo_h1 = api_h1[:200]
            post.seo_description = api_desc[:160]
            post.seo_slug = seo_slug
            post.seo_keywords = lsi["title_words"] + lsi["desc_words"][:3]
            post.seo_generated_at = datetime.utcnow()
            post.article_html = article_html
            post.article_generated_at = datetime.utcnow()
            post.content_html = faq_html
            post.content_generated_at = datetime.utcnow()

            await session.commit()
            logger.info(f"[pipeline] Post {post_id} done: {seo_slug}")

            # Notify frontend → send Telegram message to channel owner
            try:
                import os, httpx
                frontend_url = os.getenv("FRONTEND_URL", "http://frontend:3000")
                worker_secret = os.getenv("WORKER_SECRET", "")
                async with httpx.AsyncClient(timeout=5) as http:
                    await http.post(
                        f"{frontend_url}/api/notify/post-done",
                        json={
                            "channel_username": channel.username,
                            "post_id": post_id,
                            "seo_slug": seo_slug,
                            "seo_title": api_title,
                        },
                        headers={"X-Worker-Secret": worker_secret},
                    )
            except Exception as e:
                logger.warning(f"[pipeline] Notify failed (non-critical): {e}")

            # Ping IndexNow + mark as indexed
            if SITE_URL and seo_slug:
                from indexnow import ping_indexnow
                url = f"{SITE_URL.rstrip('/')}/{channel.username}/{seo_slug}"
                try:
                    await ping_indexnow([url])
                    logger.info(f"[pipeline] IndexNow pinged: {url}")
                except Exception as e:
                    logger.warning(f"[pipeline] IndexNow ping failed: {e}")
                # Mark as submitted to search engines regardless of ping result
                post.is_indexed = True
                await session.commit()
                logger.info(f"[pipeline] Post {post_id} marked as indexed")

            return True

        except Exception as e:
            import traceback
            logger.error(f"[pipeline] Post {post_id} error: {e}\n{traceback.format_exc()}")
            return False


async def process_channel(channel_username: str, batch_size: int = 20) -> None:
    """Process batch of posts without SEO content in a channel."""
    import logging
    logger = logging.getLogger(__name__)

    async with async_session() as session:
        ch_result = await session.execute(
            select(Channel).where(Channel.username == channel_username.lstrip("@"))
        )
        channel = ch_result.scalar_one_or_none()
        if not channel:
            logger.warning(f"[pipeline] Channel @{channel_username} not found")
            return

        posts_result = await session.execute(
            select(Post)
            .where(Post.channel_id == channel.id)
            .where(Post.seo_title.is_(None))
            .where(Post.text.isnot(None))
            .where(Post.text != "")
            .order_by(Post.date.desc())
            .limit(batch_size)
        )
        posts = posts_result.scalars().all()

        if not posts:
            logger.info(f"[pipeline] No posts to process in @{channel_username}")
            return

        logger.info(f"[pipeline] Processing {len(posts)} posts in @{channel_username}...")

        for i, post in enumerate(posts):
            logger.info(f"[pipeline] [{i+1}/{len(posts)}] post_id={post.id}")
            ok = await process_post(post.id)
            if ok:
                await asyncio.sleep(2)


if __name__ == "__main__":
    import sys
    import logging
    logging.basicConfig(level=logging.INFO)
    channel = sys.argv[1] if len(sys.argv) > 1 else "storyline_life_"
    batch = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    asyncio.run(process_channel(channel, batch_size=batch))
