export const dynamic = "force-dynamic"

import { Metadata } from "next"
import Link from "next/link"
import { db } from "@/db"
import { blogPosts } from "@/db/schema"
import { desc, eq } from "drizzle-orm"
import { ChevronRight, ExternalLink } from "lucide-react"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://post-seo.seo-rezult.ru"

export const metadata: Metadata = {
  title: "Вагиз Хасанов — SEO-специалист, автор блога Post SEO",
  description: "Вагиз Хасанов — SEO-эксперт с 8-летним опытом. Основатель Post SEO и агентства seo-rezult.ru. Продвигает Telegram и MAX каналы в Яндексе и Google.",
  alternates: { canonical: "/blog/author/vagiz-hasanov" },
  openGraph: {
    type: "profile",
    locale: "ru_RU",
    title: "Вагиз Хасанов — SEO-специалист",
    description: "SEO-эксперт, основатель Post SEO и seo-rezult.ru",
    url: `${SITE_URL}/blog/author/vagiz-hasanov`,
  },
}

const CASES = [
  { metric: "200+", label: "сайтов выведено в топ Яндекса и Google" },
  { metric: "8 лет", label: "опыта SEO-продвижения на российском рынке" },
  { metric: "2–4 нед", label: "до первых позиций Telegram-каналов через Post SEO" },
  { metric: "85 млн", label: "пользователей MAX — уникальная экспертиза в РФ" },
]

const authorSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Вагиз Хасанов",
  url: `${SITE_URL}/blog/author/vagiz-hasanov`,
  jobTitle: "SEO-специалист",
  description: "SEO-эксперт с 8-летним опытом продвижения в Яндексе и Google. Основатель Post SEO и агентства seo-rezult.ru.",
  sameAs: ["https://seo-rezult.ru"],
  knowsAbout: ["SEO", "Яндекс", "Google", "Telegram", "MAX мессенджер", "контент-маркетинг"],
}

export default async function AuthorPage() {
  const posts = await db
    .select()
    .from(blogPosts)
    .orderBy(desc(blogPosts.publishedAt))
    .limit(20)

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(authorSchema) }}
      />

      {/* Header */}
      <header className="border-b border-(--color-border) bg-white sticky top-0 z-30 backdrop-blur-md bg-white/80">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-(--color-text-muted)">
          <Link href="/" className="hover:text-(--color-primary) transition-colors font-medium">Post SEO</Link>
          <ChevronRight size={14} className="opacity-50" />
          <Link href="/blog" className="hover:text-(--color-primary) transition-colors">Блог</Link>
          <ChevronRight size={14} className="opacity-50" />
          <span className="text-(--color-text)">Вагиз Хасанов</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Author hero */}
        <div className="flex flex-col sm:flex-row items-start gap-8 mb-12 pb-12 border-b border-(--color-border)">
          <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-white text-4xl font-bold shrink-0">
            В
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-(--color-text) mb-1">Вагиз Хасанов</h1>
            <p className="text-base text-(--color-primary) font-medium mb-4">SEO-специалист · Основатель Post SEO</p>
            <p className="text-(--color-text-secondary) leading-relaxed mb-4">
              Занимаюсь SEO-продвижением с 2017 года. Специализируюсь на продвижении в Яндексе и Google для российского рынка.
              Основал Post SEO — сервис, который автоматически превращает посты Telegram и MAX каналов в SEO-статьи,
              индексируемые в поисковиках за 2–72 часа через IndexNow.
            </p>
            <p className="text-(--color-text-secondary) leading-relaxed mb-5">
              Также веду SEO-агентство <a href="https://seo-rezult.ru" className="text-(--color-primary) hover:underline" target="_blank" rel="noopener noreferrer">seo-rezult.ru</a> —
              комплексное продвижение сайтов, аудиты, семантика, ссылочное. Работаю с бизнесом в России и странах СНГ.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://seo-rezult.ru"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-(--color-primary) text-white text-sm font-medium hover:bg-(--color-primary-hover) transition-colors"
              >
                <ExternalLink size={14} />
                seo-rezult.ru
              </a>
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] border border-(--color-border) text-(--color-text) text-sm font-medium hover:bg-(--color-bg-subtle) transition-colors"
              >
                Попробовать Post SEO
              </Link>
            </div>
          </div>
        </div>

        {/* Cases / metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {CASES.map((c) => (
            <div key={c.metric} className="rounded-2xl border border-(--color-border) bg-white p-5 text-center">
              <p className="text-2xl font-bold text-(--color-primary) mb-1">{c.metric}</p>
              <p className="text-xs text-(--color-text-muted) leading-snug">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Articles */}
        <h2 className="text-xl font-bold text-(--color-text) mb-6">Статьи автора</h2>
        {posts.length === 0 ? (
          <p className="text-(--color-text-muted)">Статьи скоро появятся</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group rounded-2xl border border-(--color-border) bg-white p-5 hover:border-(--color-primary-border) hover:shadow-md transition-all"
              >
                <span className="text-xs font-semibold text-(--color-primary) uppercase tracking-wide">{post.category}</span>
                <h3 className="text-base font-bold text-(--color-text) mt-1 mb-2 leading-snug group-hover:text-(--color-primary) transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-sm text-(--color-text-muted) line-clamp-2 leading-relaxed">{post.description}</p>
                <p className="text-xs text-(--color-text-muted) mt-3">
                  {new Date(post.publishedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
