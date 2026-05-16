"use client"

import { useEffect, useState } from "react"
import { miniApiFetch } from "./useMiniApi"

interface Channel {
  id: string
  channelUsername: string
  channelTitle: string | null
  botIsAdmin: boolean
  status: string
  autoPublish: boolean
}

const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || "tg_buster_bot"
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://post-seo.seo-rezult.ru"

export default function ChannelList({ onSelect }: { onSelect: (channelId: string) => void }) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    miniApiFetch("/channels")
      .then(r => r.json())
      .then(setChannels)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null

  function statusIcon(ch: Channel) {
    if (ch.botIsAdmin && ch.status === "active") return "✅"
    if (ch.status === "pending") return "⏳"
    return "❌"
  }

  if (loading) {
    return (
      <div className="screen" style={{ padding: 16 }}>
        <div className="shimmer" style={{ height: 28, width: "50%", marginBottom: 20 }} />
        {[1, 2, 3].map(i => (
          <div key={i} className="shimmer" style={{ height: 56, marginBottom: 8 }} />
        ))}
      </div>
    )
  }

  return (
    <div className="screen">
      <div style={{ padding: "16px 16px 8px", fontSize: 20, fontWeight: 700, color: "var(--tg-theme-text-color)" }}>
        Post SEO
      </div>

      <div className="screen-scroll">
        {channels.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: 16, textAlign: "center" }}>
            <div style={{ fontSize: 56 }}>📢</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: "var(--tg-theme-text-color)" }}>
              Нет каналов
            </div>
            <div style={{ fontSize: 14, color: "var(--tg-theme-hint-color, #888)" }}>
              Добавьте Telegram-канал и ваши посты начнут появляться в поиске
            </div>
            <button
              onClick={() => tg?.openLink(`https://t.me/${BOT_USERNAME}?start=add_channel`)}
              style={btnStyle("var(--tg-theme-button-color, #2481cc)")}
            >
              <span style={{ color: "var(--tg-theme-button-text-color, #fff)" }}>➕ Добавить канал</span>
            </button>
          </div>
        ) : (
          <>
            {channels.map(ch => (
              <div
                key={ch.id}
                onClick={() => { tg?.HapticFeedback.impactOccurred("light"); onSelect(ch.id) }}
                style={cellStyle}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {statusIcon(ch)} @{ch.channelUsername}
                  </div>
                  {ch.channelTitle && (
                    <div style={{ fontSize: 13, color: "var(--tg-theme-hint-color, #888)", marginTop: 2 }}>
                      {ch.channelTitle.slice(0, 40)}
                    </div>
                  )}
                </div>
                <div style={{ color: "var(--tg-theme-hint-color, #888)", fontSize: 18 }}>›</div>
              </div>
            ))}
            <div style={{ height: 16 }} />
            <div style={{ padding: "0 16px 16px" }}>
              <button
                onClick={() => tg?.openLink(`https://t.me/${BOT_USERNAME}?start=add_channel`)}
                style={btnStyle("var(--tg-theme-secondary-bg-color, #f0f0f0)")}
              >
                <span style={{ color: "var(--tg-theme-text-color)" }}>➕ Добавить канал</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const cellStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "12px 16px",
  borderBottom: "0.5px solid var(--tg-theme-secondary-bg-color, #f0f0f0)",
  cursor: "pointer",
  gap: 12,
  background: "var(--tg-theme-bg-color)",
  minHeight: 56,
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    display: "block",
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "none",
    background: bg,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "center",
  }
}
