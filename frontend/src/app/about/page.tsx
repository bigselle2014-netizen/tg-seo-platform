import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "О сервисе — Post SEO",
  description:
    "Post SEO создан Вагизом Хасановым — SEO-специалистом с 5-летним опытом. Автоматизируем индексацию Telegram-каналов в Google и Яндекс.",
}

const CASES = [
  { label: "Кардиологическая клиника", result: "Трафик ×5.17, стоимость лида −91%" },
  { label: "Интернет-магазин автозапчастей", result: "Трафик ×44, выручка +1.42М ₽/мес" },
  { label: "SaaS QRGet", result: "Запросы в топ-10 ×30, регистрации ×23" },
  { label: "Салон омоложения (Москва)", result: "Трафик ×27, стоимость лида −86%" },
]

const SKILLS = [
  "Технический SEO",
  "E-E-A-T контент-стратегия",
  "Семантическое ядро",
  "Schema.org / микроразметка",
  "Core Web Vitals",
  "AI+SEO автоматизация",
  "GEO-оптимизация под AI Overviews",
  "Google Search Console",
]

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Вагиз Хасанов",
  jobTitle: "SEO-специалист",
  url: "https://post-seo.seo-rezult.ru/about",
  sameAs: [
    "https://t.me/vag_h",
    "https://seo-rezult.ru",
    "https://portfolio-azure-iota-67.vercel.app/",
  ],
  worksFor: {
    "@type": "Organization",
    name: "Post SEO",
    url: "https://post-seo.seo-rezult.ru",
  },
  description:
    "SEO-специалист с 5-летним опытом, основатель агентства seo-rezult.ru. Вывод сайтов в топ Яндекса и Google по медицине, e-commerce, SaaS, B2B. Создатель сервиса Post SEO.",
}

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }}
      />

      <div className="min-h-screen bg-(--color-bg)">
        {/* Nav */}
        <nav className="border-b border-(--color-border) bg-white">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-2 text-sm">
            <Link href="/" className="text-(--color-primary) font-semibold">Post SEO</Link>
            <span className="text-(--color-text-muted)">/</span>
            <span className="text-(--color-text-muted)">О сервисе</span>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto px-4 py-12">

          {/* Hero */}
          <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
            <div className="w-20 h-20 rounded-2xl bg-(--color-primary) flex items-center justify-center text-white text-3xl font-bold shrink-0">
              В
            </div>
            <div>
              <h1 className="text-3xl font-bold text-(--color-text) leading-tight">
                Вагиз Хасанов
              </h1>
              <p className="text-(--color-primary) font-medium mt-1">
                SEO-специалист · Основатель{" "}
                <a href="https://seo-rezult.ru" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  seo-rezult.ru
                </a>
                {" "}· Создатель Post SEO
              </p>
              <p className="text-(--color-text-secondary) mt-3 leading-relaxed max-w-xl">
                5 лет вывожу сайты в топ Яндекса и Google — медицина, e-commerce, SaaS, B2B.
                Руковожу SEO-агентством{" "}
                <a href="https://seo-rezult.ru" target="_blank" rel="noopener noreferrer" className="text-(--color-primary) hover:underline">
                  seo-rezult.ru
                </a>.
                Post SEO создан из личного опыта: Telegram-каналы теряют трафик, потому что
                поисковики не видят их контент. Мы это исправляем автоматически.
              </p>
              <div className="flex gap-3 mt-5 flex-wrap">
                <a
                  href="https://t.me/vag_h"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-(--color-primary) text-white text-sm font-medium hover:bg-(--color-primary-hover) transition-colors"
                >
                  Telegram @vag_h
                </a>
                <a
                  href="https://portfolio-azure-iota-67.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] border border-(--color-border) text-(--color-text-secondary) text-sm font-medium hover:bg-(--color-bg-subtle) transition-colors"
                >
                  Портфолио
                </a>
              </div>
            </div>
          </div>

          {/* Навыки */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-(--color-text) mb-4">Экспертиза</h2>
            <div className="flex flex-wrap gap-2">
              {SKILLS.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1.5 rounded-full bg-(--color-primary-subtle) text-(--color-primary) text-sm font-medium border border-(--color-primary-border)"
                >
                  {s}
                </span>
              ))}
            </div>
          </section>

          {/* Кейсы */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-(--color-text) mb-4">Результаты клиентов</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CASES.map((c) => (
                <div
                  key={c.label}
                  className="bg-white border border-(--color-border) rounded-[14px] p-5"
                >
                  <p className="text-sm font-semibold text-(--color-text)">{c.label}</p>
                  <p className="text-sm text-(--color-primary) font-medium mt-1">{c.result}</p>
                </div>
              ))}
            </div>
          </section>

          {/* О сервисе */}
          <section className="mb-12 bg-white border border-(--color-border) rounded-[14px] p-6">
            <h2 className="text-xl font-bold text-(--color-text) mb-3">О сервисе Post SEO</h2>
            <p className="text-(--color-text-secondary) leading-relaxed text-sm">
              Post SEO автоматически превращает посты Telegram-каналов в SEO-статьи. Система
              анализирует топ Яндекса по теме поста, собирает LSI-слова, генерирует
              оптимизированный заголовок и FAQ — всё за 2–3 минуты. Страницы индексируются
              в Google и Яндекс, принося органический трафик обратно на ваш канал.
            </p>
            <div className="mt-4 pt-4 border-t border-(--color-border) flex gap-6 text-sm">
              <div>
                <p className="text-2xl font-bold text-(--color-text)">150+</p>
                <p className="text-(--color-text-muted)">каналов</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-(--color-text)">2–3 мин</p>
                <p className="text-(--color-text-muted)">на статью</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-(--color-text)">2 поиска</p>
                <p className="text-(--color-text-muted)">Google + Яндекс</p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] bg-(--color-primary) text-white font-medium hover:bg-(--color-primary-hover) transition-colors"
            >
              Подключить канал бесплатно →
            </Link>
          </div>
        </main>
      </div>
    </>
  )
}
