import { Metadata } from "next"
import Link from "next/link"
import { fetchChannel, fetchPosts } from "@/lib/api"
import { breadcrumbSchema } from "@/lib/schema"
import { ChevronRight } from "lucide-react"

type Props = {
  params: Promise<{ channel: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { channel: username } = await params
  const channel = await fetchChannel(username)
  return {
    title: `${channel.title} — посты Telegram-канала`,
    description: channel.description?.slice(0, 155) || `Посты канала @${username} в Telegram`,
    openGraph: {
      type: "website",
      locale: "ru_RU",
      title: `${channel.title} — Telegram`,
      description: channel.description?.slice(0, 155) || "",
    },
  }
}

export default async function ChannelPage({ params, searchParams }: Props) {
  const { channel: username } = await params
  const { page: pageStr } = await searchParams
  const page = parseInt(pageStr || "1", 10)

  const [channel, postsData] = await Promise.all([
    fetchChannel(username),
    fetchPosts(username, page),
  ])

  const breadcrumb = breadcrumbSchema({ username, title: channel.title })
  const channelInitial = (channel.title || username)[0].toUpperCase()

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      {/* Простой хедер */}
      <header className="bg-white border-b border-(--color-border) py-3 px-4">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-1.5 text-sm text-(--color-text-muted)">
            <Link href="/" className="hover:text-(--color-primary) transition-colors font-medium">
              Post SEO
            </Link>
            <ChevronRight size={14} className="opacity-50" />
            <span className="text-(--color-text-secondary)">{channel.title}</span>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Шапка канала */}
        <header className="flex items-start gap-4 pb-8 border-b border-(--color-border)">
          <div className="w-16 h-16 rounded-full bg-(--color-primary) flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {channelInitial}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-(--color-text)">{channel.title}</h1>
            <p className="text-sm text-(--color-text-muted) mt-0.5">@{username}</p>
            {channel.description && (
              <p className="text-base text-(--color-text-secondary) mt-2 leading-relaxed">
                {channel.description}
              </p>
            )}
            <div className="flex gap-5 mt-3 text-sm text-(--color-text-muted)">
              {channel.subscribers_count > 0 && (
                <span>{channel.subscribers_count.toLocaleString("ru-RU")} подписчиков</span>
              )}
              <span>{postsData.total} публикаций</span>
            </div>
          </div>
        </header>

        {/* Список статей — карточки */}
        <section className="mt-8">
          <h2 className="sr-only">Публикации канала</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {postsData.posts.map((post) => (
              <article
                key={post.id}
                className="bg-white border border-(--color-border) rounded-[14px] p-5 shadow-(--shadow-sm) hover:shadow-(--shadow-md) transition-shadow cursor-pointer"
              >
                <Link href={`/${username}/${post.seo_slug}`}>
                  <h2 className="text-base font-semibold text-(--color-text) line-clamp-2 hover:text-(--color-primary) transition-colors">
                    {post.seo_title}
                  </h2>
                </Link>
                {(post.seo_description || post.text) && (
                  <p className="text-sm text-(--color-text-secondary) mt-2 line-clamp-2 leading-relaxed">
                    {post.seo_description || post.text?.slice(0, 160)}
                  </p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <time
                    dateTime={post.date}
                    className="text-xs text-(--color-text-muted)"
                  >
                    {new Date(post.date).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </time>
                  <Link
                    href={`/${username}/${post.seo_slug}`}
                    className="text-xs font-medium text-(--color-primary) hover:underline"
                  >
                    Читать →
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* Пагинация */}
          {postsData.total > postsData.per_page && (
            <nav className="mt-8 flex justify-center gap-2" aria-label="Навигация по страницам">
              {page > 1 && (
                <Link
                  href={`/${username}?page=${page - 1}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] border border-(--color-border) text-sm text-(--color-text-secondary) hover:bg-(--color-bg-subtle) transition-colors min-h-[36px]"
                >
                  ← Назад
                </Link>
              )}
              <span className="inline-flex items-center px-4 py-2 rounded-[10px] bg-(--color-primary-subtle) border border-(--color-primary-border) text-sm font-medium text-(--color-primary) min-h-[36px]">
                {page}
              </span>
              {page * postsData.per_page < postsData.total && (
                <Link
                  href={`/${username}?page=${page + 1}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] border border-(--color-border) text-sm text-(--color-text-secondary) hover:bg-(--color-bg-subtle) transition-colors min-h-[36px]"
                >
                  Далее →
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </main>
  )
}
