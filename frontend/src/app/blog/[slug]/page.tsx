import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Lora } from "next/font/google"
import DOMPurify from "isomorphic-dompurify"
import { db } from "@/db"
import { blogPosts } from "@/db/schema"
import { eq } from "drizzle-orm"
import { ChevronRight } from "lucide-react"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://post-seo.seo-rezult.ru"

const lora = Lora({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--ff-lora",
})

type Props = { params: Promise<{ slug: string }> }

function readingTime(html: string) {
  return Math.max(1, Math.ceil(html.replace(/<[^>]*>/g, "").split(/\s+/).length / 200))
}

function extractH2(html: string): { id: string; text: string }[] {
  const matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)]
  return matches.map(([, inner], i) => ({
    id: `section-${i + 1}`,
    text: inner.replace(/<[^>]+>/g, "").trim(),
  }))
}

function injectH2Ids(html: string): string {
  let i = 0
  return html.replace(/<h2([^>]*)>/g, (_m, attrs) => {
    i++
    return `<h2${attrs} id="section-${i}">`
  })
}

function extractFaq(html: string) {
  const matches = [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/g)]
  if (!matches.length) return null
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: matches.map(([, q, a]) => ({
      "@type": "Question",
      name: q.replace(/<[^>]+>/g, "").trim(),
      acceptedAnswer: { "@type": "Answer", text: a.replace(/<[^>]+>/g, "").trim() },
    })),
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      locale: "ru_RU",
      url: `${SITE_URL}/blog/${slug}`,
      title: post.title,
      description: post.description,
      publishedTime: post.publishedAt.toISOString(),
      ...(post.imageUrl && { images: [{ url: post.imageUrl, width: 1200, height: 630 }] }),
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1)
  if (!post) notFound()

  const ALLOWED = {
    ALLOWED_TAGS: ["p","h2","h3","h4","ul","ol","li","table","thead","tbody","tr","th","td",
      "b","i","em","strong","br","blockquote","a","span","figure","figcaption","code","pre","cite","footer"],
    ALLOWED_ATTR: ["href","rel","target","class","id"],
  }
  const safeHtml = DOMPurify.sanitize(injectH2Ids(post.contentHtml), ALLOWED)
  const toc = extractH2(post.contentHtml)
  const minutes = readingTime(post.contentHtml)
  const faqSchemaData = extractFaq(post.contentHtml)

  const blogPostSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    inLanguage: "ru",
    url: `${SITE_URL}/blog/${slug}`,
    author: {
      "@type": "Person",
      name: "Вагиз Хасанов",
      url: `${SITE_URL}/blog/author/vagiz-hasanov`,
      sameAs: ["https://seo-rezult.ru"],
    },
    publisher: {
      "@type": "Organization",
      name: "Post SEO",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${slug}` },
    ...(post.imageUrl && {
      image: { "@type": "ImageObject", url: post.imageUrl, width: 1200, height: 630 },
    }),
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Post SEO", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Блог", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${SITE_URL}/blog/${slug}` },
    ],
  }

  const pubDate = new Date(post.publishedAt).toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
  })

  return (
    <div className={lora.variable}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([blogPostSchema, breadcrumbSchema, faqSchemaData].filter(Boolean)),
        }}
      />

      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-(--color-border) py-3 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <nav className="flex items-center gap-1.5 text-sm text-(--color-text-muted) min-w-0 overflow-hidden">
            <Link href="/" className="hover:text-(--color-primary) transition-colors shrink-0 font-medium">Post SEO</Link>
            <ChevronRight size={14} className="shrink-0 opacity-50" />
            <Link href="/blog" className="hover:text-(--color-primary) transition-colors shrink-0">Блог</Link>
            <ChevronRight size={14} className="shrink-0 opacity-50" />
            <span className="truncate text-(--color-text-secondary)">{post.title}</span>
          </nav>
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-(--color-primary) text-xs font-medium text-white hover:bg-(--color-primary-hover) transition-colors shrink-0 whitespace-nowrap"
          >
            Попробовать бесплатно
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10">

          {/* Main */}
          <article>
            <p className="text-xs font-semibold text-(--color-primary) uppercase tracking-wide mb-3">{post.category}</p>

            <h1 className="text-3xl md:text-4xl font-bold text-(--color-text) leading-tight mb-4" style={{ fontFamily: "var(--ff-lora, Georgia), serif" }}>
              {post.h1}
            </h1>

            {/* Author + meta */}
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-(--color-border)">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">В</div>
              <div>
                <Link href="/blog/author/vagiz-hasanov" className="text-sm font-semibold text-(--color-text) hover:text-(--color-primary) transition-colors">
                  Вагиз Хасанов
                </Link>
                <p className="text-xs text-(--color-text-muted)">{pubDate} · {minutes} мин чтения</p>
              </div>
            </div>

            {/* Hero image */}
            {post.imageUrl && (
              <img
                src={post.imageUrl}
                alt={post.title}
                width={800} height={450}
                loading="eager"
                className="rounded-2xl w-full object-cover mb-8"
                style={{ maxHeight: 420 }}
              />
            )}

            {/* Article body */}
            <div
              className="blog-article-body"
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />

            {/* Author card */}
            <div className="mt-12 rounded-2xl border border-(--color-border) p-6 flex gap-5">
              <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">В</div>
              <div>
                <p className="text-sm text-(--color-text-muted) mb-0.5">Автор</p>
                <Link href="/blog/author/vagiz-hasanov" className="text-base font-bold text-(--color-text) hover:text-(--color-primary) transition-colors">
                  Вагиз Хасанов
                </Link>
                <p className="text-sm text-(--color-text-secondary) mt-1 leading-relaxed">
                  SEO-специалист с 8-летним опытом продвижения в Яндексе и Google. Основатель сервиса Post SEO. Помог вывести в топ более 200 сайтов.
                </p>
                <a
                  href="https://seo-rezult.ru"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-sm text-(--color-primary) hover:underline"
                >
                  seo-rezult.ru →
                </a>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-8 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-7 text-center text-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-200 mb-2">Автоматизируйте SEO</p>
              <h2 className="text-xl font-bold mb-2">Заказать SEO-аудит у Вагиза</h2>
              <p className="text-blue-100 text-sm mb-5">Бесплатный анализ вашего Telegram или MAX канала с рекомендациями по росту трафика из поиска</p>
              <a
                href="https://seo-rezult.ru"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-5 py-2.5 rounded-[10px] hover:bg-blue-50 transition-colors text-sm mr-3"
              >
                Заказать аудит на seo-rezult.ru
              </a>
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center gap-2 bg-blue-500/40 text-white font-semibold px-5 py-2.5 rounded-[10px] hover:bg-blue-500/60 transition-colors text-sm"
              >
                Попробовать Post SEO бесплатно
              </Link>
            </div>
          </article>

          {/* Sidebar — TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              {toc.length > 0 && (
                <div className="bg-white border border-(--color-border) rounded-[14px] p-5 shadow-(--shadow-sm)">
                  <p className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide mb-3">Содержание</p>
                  <nav className="space-y-2">
                    {toc.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="block text-sm text-(--color-text-secondary) hover:text-(--color-primary) transition-colors leading-snug"
                      >
                        {item.text}
                      </a>
                    ))}
                  </nav>
                </div>
              )}

              {/* Sidebar CTA */}
              <div className="bg-(--color-primary-subtle) border border-(--color-primary-border) rounded-[14px] p-5">
                <p className="text-sm font-bold text-(--color-text) mb-2">Канал в поиске за 48 часов</p>
                <p className="text-xs text-(--color-text-muted) mb-4 leading-relaxed">
                  Post SEO автоматически превращает каждый пост в SEO-статью и пингует Яндекс через IndexNow
                </p>
                <Link
                  href="/auth/sign-up"
                  className="block w-full text-center bg-(--color-primary) text-white text-sm font-semibold py-2.5 rounded-[10px] hover:bg-(--color-primary-hover) transition-colors"
                >
                  Начать бесплатно
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
