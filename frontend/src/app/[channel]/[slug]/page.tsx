import { Metadata } from "next"
import Link from "next/link"
import { Lora } from "next/font/google"
import DOMPurify from "isomorphic-dompurify"

const lora = Lora({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--ff-lora",
})

import { fetchPost } from "@/lib/api"
import { blogPostingSchema, breadcrumbSchema, faqSchema } from "@/lib/schema"
import { db } from "@/db"
import { channelOwners } from "@/db/schema"
import { eq } from "drizzle-orm"
import { TrackView } from "@/components/TrackView"
import { ChevronRight, ExternalLink } from "lucide-react"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://post-seo.seo-rezult.ru"

type Props = { params: Promise<{ channel: string; slug: string }> }

function readingTime(text: string): number {
  return Math.max(1, Math.ceil(text.replace(/<[^>]*>/g, "").split(/\s+/).length / 200))
}

function countWords(html: string): number {
  return html.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { channel, slug } = await params
  const post = await fetchPost(channel, slug)
  return {
    title: post.seo_title,
    description: post.seo_description,
    keywords: post.seo_keywords?.join(", "),
    robots: "index, follow",
    alternates: {
      canonical: `/${channel}/${slug}`,
    },
    openGraph: {
      type: "article",
      locale: "ru_RU",
      url: `${SITE_URL}/${channel}/${slug}`,
      title: post.seo_title,
      description: post.seo_description,
      publishedTime: post.date,
      ...(post.media_urls?.[0] && {
        images: [{
          url: post.media_urls[0],
          alt: post.seo_title,
          width: 1200,
          height: 630,
        }]
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: post.seo_title,
      description: post.seo_description,
      ...(post.media_urls?.[0] && { images: [post.media_urls[0]] }),
    },
  }
}

export default async function PostPage({ params }: Props) {
  const { channel: username, slug } = await params
  const [post, channelRow] = await Promise.all([
    fetchPost(username, slug),
    db.select({ inviteLink: channelOwners.inviteLink })
      .from(channelOwners)
      .where(eq(channelOwners.channelUsername, username))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ])

  const channelUrl = channelRow?.inviteLink ?? `https://t.me/${username}`
  const postUrl = post.telegram_message_id
    ? `https://t.me/${username}/${post.telegram_message_id}`
    : channelUrl

  // Считаем слова для schema.org
  const wordCount = countWords((post.article_html || "") + (post.text || "") + (post.content_html || ""))

  const blogSchema = blogPostingSchema(post, wordCount)
  const breadcrumb = breadcrumbSchema({ username, title: post.channel.title }, post.seo_title, post.seo_slug)
  const faqData = post.content_html ? faqSchema(post.content_html) : null

  // Sanitize HTML
  const ALLOWED_ARTICLE = {
    ALLOWED_TAGS: ["p","h2","h3","h4","ul","ol","li","table","thead","tbody","tr","th","td","b","i","em","strong","br","blockquote","a","span"],
    ALLOWED_ATTR: ["href","rel","target","class"],
  }
  const ALLOWED_FAQ = {
    ALLOWED_TAGS: ["div","h3","p","b","i","em","strong","br","ol","li"],
    ALLOWED_ATTR: ["class"],
  }
  const ALLOWED_POST = {
    ALLOWED_TAGS: ["p","b","i","em","strong","br","a","blockquote","code","pre","span","ul","ol","li"],
    ALLOWED_ATTR: ["href","rel","target"],
  }

  const articleHtml = post.article_html
    ? DOMPurify.sanitize(post.article_html, ALLOWED_ARTICLE)
    : ""
  const faqHtml = post.content_html
    ? DOMPurify.sanitize(post.content_html, ALLOWED_FAQ)
    : ""
  const rawPostHtml = DOMPurify.sanitize(post.text_html || post.text || "", ALLOWED_POST)

  const minutes = readingTime((post.article_html || "") + (post.text_html || post.text || "") + (post.content_html || ""))
  const channelTitle = post.channel.title || `@${username}`
  const channelInitial = channelTitle[0].toUpperCase()

  // H1: seo_h1 (отличается от title) если есть, иначе seo_title
  const h1Text = post.seo_h1 || post.seo_title

  return (
    <div className={lora.variable}>
      <TrackView channelUsername={username} pageSlug={slug} />

      {/* JSON-LD schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([blogSchema, breadcrumb, faqData].filter(Boolean))
        }}
      />

      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-(--color-border) py-3 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <nav className="flex items-center gap-1.5 text-sm text-(--color-text-muted) min-w-0 overflow-hidden">
            <Link href="/" className="hover:text-(--color-primary) transition-colors shrink-0 font-medium">
              Post SEO
            </Link>
            <ChevronRight size={14} className="shrink-0 opacity-50" />
            <Link href={`/${username}`} className="hover:text-(--color-primary) transition-colors shrink-0">
              @{username}
            </Link>
            <ChevronRight size={14} className="shrink-0 opacity-50" />
            <span className="truncate text-(--color-text-secondary)">{post.seo_title}</span>
          </nav>
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-(--color-primary) text-xs font-medium text-white hover:bg-(--color-primary-hover) transition-colors shrink-0 min-h-[32px]"
          >
            <ExternalLink size={12} />
            Читать канал
          </a>
        </div>
      </header>

      {/* Двухколоночный layout */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

          {/* === Основная колонка === */}
          <article>
            {/* Мета-строка */}
            <p className="text-sm text-(--color-text-muted)">
              <Link href={`/${username}`} className="hover:text-(--color-primary) transition-colors">
                @{username}
              </Link>
              {" · "}
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
              </time>
              {post.views > 0 && (
                <>{" · "}{post.views.toLocaleString("ru-RU")} просмотров</>
              )}
              {" · "}{minutes} мин чтения
            </p>

            {/* H1 — отличается от Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-(--color-text) leading-tight mt-2 mb-6">
              {h1Text}
            </h1>

            {/* Изображение из поста */}
            {post.media_urls?.[0] && (
              <img
                src={post.media_urls[0]}
                alt={post.seo_title}
                width={800}
                height={450}
                loading="eager"
                fetchPriority="high"
                className="rounded-[14px] w-full mb-6 object-cover"
                style={{ maxHeight: 400 }}
              />
            )}

            {/* ═══ ТЕЛО СТАТЬИ (1500–3000 слов от tools.seo-rezult.ru) ═══ */}
            {articleHtml ? (
              <div
                className="article-body"
                dangerouslySetInnerHTML={{ __html: articleHtml }}
              />
            ) : (
              /* Fallback если статья ещё не сгенерирована */
              <div className="article-body">
                <p>Статья на основе этого поста готовится...</p>
              </div>
            )}

            {/* Оригинальный пост — как первоисточник */}
            <div className="border-l-4 border-(--color-primary) bg-(--color-primary-subtle) rounded-r-(--radius-lg) px-5 py-4 my-8">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-(--color-primary) shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span className="text-xs font-semibold text-(--color-primary)">@{username} · оригинальный пост</span>
              </div>
              <div
                className="text-(--color-text-secondary) leading-relaxed text-sm"
                dangerouslySetInnerHTML={{ __html: rawPostHtml }}
              />
            </div>

            {/* FAQ с FAQPage разметкой */}
            {faqHtml && (
              <section className="mt-10 border-t border-(--color-border) pt-8 mb-8">
                <h2 className="text-2xl font-bold text-(--color-text) mb-6">Вопросы по теме</h2>
                <div
                  className="space-y-3"
                  dangerouslySetInnerHTML={{ __html: faqHtml }}
                />
              </section>
            )}

            {/* CTA */}
            <div className="bg-(--color-primary-subtle) border border-(--color-primary-border) rounded-[20px] p-6 mt-10 text-center">
              <p className="text-sm text-(--color-text-muted) mb-2">Понравилась статья?</p>
              <p className="text-lg font-bold text-(--color-text) mb-4">
                Подпишитесь на канал @{username}
              </p>
              <a
                href={postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-[10px] bg-(--color-primary) text-white font-medium hover:bg-(--color-primary-hover) transition-all min-h-[44px]"
              >
                <ExternalLink size={16} />
                Открыть пост в Telegram
              </a>
            </div>

            {/* Похожие посты */}
            {post.related_posts && post.related_posts.length > 0 && (
              <section className="border-t border-(--color-border) pt-8 mt-10">
                <h2 className="text-xl font-bold text-(--color-text) mb-5">Читайте также</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  {post.related_posts.map((related) => (
                    <Link
                      key={related.seo_slug}
                      href={`/${username}/${related.seo_slug}`}
                      className="rounded-[14px] border border-(--color-border) p-4 hover:border-(--color-primary-border) hover:shadow-(--shadow-md) transition-all"
                    >
                      <h3 className="font-medium text-(--color-text) text-sm line-clamp-2">{related.seo_title}</h3>
                      {related.seo_description && (
                        <p className="mt-1.5 text-xs text-(--color-text-muted) line-clamp-2">{related.seo_description}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </article>

          {/* === Сайдбар === */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-4">

              {/* О канале */}
              <div className="bg-white border border-(--color-border) rounded-[14px] p-5 shadow-(--shadow-sm)">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-(--color-primary) flex items-center justify-center text-white text-lg font-bold shrink-0">
                    {channelInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-(--color-text) truncate">{channelTitle}</p>
                    <p className="text-sm text-(--color-text-muted)">@{username}</p>
                  </div>
                </div>
                {post.channel.description && (
                  <p className="text-sm text-(--color-text-secondary) mt-2 line-clamp-3 leading-relaxed">
                    {post.channel.description}
                  </p>
                )}
                <a
                  href={postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] bg-(--color-primary) text-sm font-medium text-white hover:bg-(--color-primary-hover) transition-colors min-h-[40px]"
                >
                  Открыть пост в Telegram
                </a>
              </div>

              {/* Ещё статьи */}
              {post.related_posts && post.related_posts.length > 0 && (
                <div className="bg-white border border-(--color-border) rounded-[14px] p-5 shadow-(--shadow-sm)">
                  <p className="text-sm font-semibold text-(--color-text) mb-3">Ещё статьи</p>
                  <div className="space-y-3">
                    {post.related_posts.slice(0, 5).map((related) => (
                      <Link
                        key={related.seo_slug}
                        href={`/${username}/${related.seo_slug}`}
                        className="block group"
                      >
                        <p className="text-sm text-(--color-text-secondary) group-hover:text-(--color-primary) transition-colors line-clamp-2 leading-snug">
                          {related.seo_title}
                        </p>
                        {related.date && (
                          <p className="text-xs text-(--color-text-muted) mt-1">
                            {new Date(related.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
