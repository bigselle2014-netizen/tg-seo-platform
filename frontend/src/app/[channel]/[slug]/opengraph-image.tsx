import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const WORKER_URL = process.env.WORKER_API_URL || "http://localhost:8000"
const WORKER_SECRET = process.env.WORKER_SECRET || ""
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://post-seo.seo-rezult.ru"

export default async function Image({
  params,
}: {
  params: Promise<{ channel: string; slug: string }>
}) {
  const { channel, slug } = await params

  let title = "Статья из Telegram-канала"
  let channelTitle = `@${channel}`

  try {
    const res = await fetch(
      `${WORKER_URL}/api/channels/${channel}/posts/${slug}`,
      {
        headers: { "X-Worker-Secret": WORKER_SECRET },
        signal: AbortSignal.timeout(5000),
      },
    )
    if (res.ok) {
      const post = await res.json()
      if (post.seo_title) title = post.seo_title
      if (post.channel?.title) channelTitle = post.channel.title
    }
  } catch {
    // fallback to defaults
  }

  // Trim title to 3 lines max
  if (title.length > 120) title = title.slice(0, 117) + "..."

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
          padding: "80px",
          position: "relative",
        }}
      >
        {/* Акцентная полоса сверху */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "#6366f1",
            display: "flex",
          }}
        />

        {/* Название канала */}
        <div
          style={{
            fontSize: 28,
            color: "#94a3b8",
            marginBottom: 32,
            display: "flex",
          }}
        >
          {channelTitle}
        </div>

        {/* Заголовок статьи */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.2,
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {title}
        </div>

        {/* Домен снизу */}
        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 80,
            fontSize: 24,
            color: "#6366f1",
            display: "flex",
          }}
        >
          {SITE_URL.replace("https://", "")}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
