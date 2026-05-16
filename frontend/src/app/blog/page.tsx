import { Metadata } from "next"
import Link from "next/link"
import { db } from "@/db"
import { blogPosts } from "@/db/schema"
import { desc } from "drizzle-orm"
import { ChevronRight } from "lucide-react"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://post-seo.seo-rezult.ru"

export const metadata: Metadata = {
  title: "Блог о SEO продвижении Telegram и MAX каналов",
  description: "Экспертные статьи о SEO-продвижении Telegram-каналов и MAX-каналов в Яндексе и Google. Практические гайды, кейсы, инструменты.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: "Блог Post SEO",
    description: "Статьи о SEO-продвижении Telegram и MAX каналов",
    url: `${SITE_URL}/blog`,
  },
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
}

export default async function BlogPage() {
  const posts = await db
    .select()
    .from(blogPosts)
    .orderBy(desc(blogPosts.publishedAt))
    .limit(50)

  return (
    <div className="min-h-screen bg-(--color-bg)">
      {/* Header */}
      <header className="border-b border-(--color-border) bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-2 text-sm text-(--color-text-muted)">
          <Link href="/" className="hover:text-(--color-primary) transition-colors font-medium">Post SEO</Link>
          <ChevronRight size={14} className="opacity-50" />
          <span className="text-(--color-text)">Блог</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="mb-12 text-center">
          <span className="inline-block bg-(--color-primary-subtle) text-(--color-primary) text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Экспертный блог
          </span>
          <h1 className="text-4xl font-bold text-(--color-text) mb-3">
            SEO-продвижение каналов
          </h1>
          <p className="text-lg text-(--color-text-muted) max-w-xl mx-auto">
            Практические гайды по выводу Telegram и MAX каналов в топ Яндекса и Google
          </p>
        </div>

        {/* Articles grid */}
        {posts.length === 0 ? (
          <p className="text-center text-(--color-text-muted) py-16">Статьи скоро появятся</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group rounded-2xl border border-(--color-border) bg-white hover:border-(--color-primary-border) hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col"
              >
                {post.imageUrl && (
                  <div className="aspect-[16/9] overflow-hidden">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                {!post.imageUrl && (
                  <div className="aspect-[16/9] bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                    <svg className="w-10 h-10 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1">
                  <span className="text-xs font-semibold text-(--color-primary) mb-2 uppercase tracking-wide">
                    {post.category}
                  </span>
                  <h2 className="text-base font-bold text-(--color-text) leading-snug mb-2 line-clamp-2 group-hover:text-(--color-primary) transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-sm text-(--color-text-muted) line-clamp-3 flex-1 leading-relaxed">
                    {post.description}
                  </p>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-(--color-border)">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">В</div>
                    <div>
                      <p className="text-xs font-medium text-(--color-text)">Вагиз Хасанов</p>
                      <p className="text-xs text-(--color-text-muted)">{formatDate(post.publishedAt)}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Подключите Post SEO бесплатно</h2>
          <p className="text-blue-100 mb-6">Превращайте посты канала в SEO-статьи — первые 10 постов бесплатно</p>
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-6 py-3 rounded-[10px] hover:bg-blue-50 transition-colors"
          >
            Начать бесплатно
          </Link>
        </div>
      </div>
    </div>
  )
}
