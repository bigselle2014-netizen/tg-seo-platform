"use client"

import { useEffect, useState } from "react"
import { miniApiFetch } from "./useMiniApi"

interface Stats { inSearch: number; pendingTotal: number; views30d: number; clicks30d: number }
interface Channel { id: string; channelUsername: string; channelTitle: string | null; autoPublish: boolean; autoPublishDelay: number; botIsAdmin: boolean }

export default function ChannelDashboard({
  channelId,
  onPosts,
  onSettings,
}: {
  channelId: string
  onPosts: () => void
  onSettings: () => void
}) {
  const [channel, setChannel] = useState<Channel | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null

  useEffect(() => {
    miniApiFetch(`/channels/${channelId}`)
      .then(r => r.json())
      .then(data => { setChannel(data.channel); setStats(data.stats) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [channelId])

  async function toggleAutoPublish() {
    if (!channel) return
    tg?.HapticFeedback.impactOccurred("light")
    const newVal = !channel.autoPublish
    setChannel(c => c ? { ...c, autoPublish: newVal } : c)
    const res = await miniApiFetch(`/channels/${channelId}/settings`, {
      method: "PATCH",
      body: JSON.stringify({ autoPublish: newVal }),
    })
    if (!res.ok) setChannel(c => c ? { ...c, autoPublish: !newVal } : c)
  }

  if (loading || !channel) {
    return (
      <div className="screen" style={{ padding: 16 }}>
        <div className="shimmer" style={{ height: 24, width: "60%", marginBottom: 16 }} />
        <div className="shimmer" style={{ height: 80, marginBottom: 12 }} />
        <div className="shimmer" style={{ height: 56, marginBottom: 8 }} />
        <div className="shimmer" style={{ height: 56, marginBottom: 8 }} />
        <div className="shimmer" style={{ height: 56 }} />
      </div>
    )
  }

  const cleanTitle = (channel.channelTitle || "")
    .replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu, "")
    .split("|")[0].trim().slice(0, 25)

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ padding: "16px 16px 8px" }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--tg-theme-text-color)" }}>
          @{channel.channelUsername}{cleanTitle ? ` · ${cleanTitle}` : ""}
        </div>
      </div>

      <div className="screen-scroll">
        {/* Stats card */}
        <div style={cardStyle}>
          <StatRow icon="📊" label="В поиске" value={`${stats?.inSearch ?? 0} постов`} />
          <StatRow icon="👁" label="Просмотров / 30 дней" value={String(stats?.views30d ?? 0)} />
          <StatRow icon="👆" label="Переходов в Telegram" value={String(stats?.clicks30d ?? 0)} />
          <div style={{ height: 8 }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, color: "var(--tg-theme-hint-color, #888)" }}>Автопубликация</span>
            <Toggle on={channel.autoPublish} onChange={toggleAutoPublish} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <ActionButton
            onClick={() => { tg?.HapticFeedback.impactOccurred("light"); onPosts() }}
            primary
          >
            📄 Публикации {stats?.pendingTotal ? `(${stats.pendingTotal} ждут)` : ""}
          </ActionButton>
          <ActionButton onClick={toggleAutoPublish}>
            {channel.autoPublish ? "🟢 Автопубликация: ВКЛ" : "🔴 Автопубликация: ВЫКЛ"}
          </ActionButton>
          <ActionButton onClick={() => { tg?.HapticFeedback.impactOccurred("light"); onSettings() }}>
            ⚙️ Настройки
          </ActionButton>
        </div>
      </div>
    </div>
  )
}

function StatRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <span style={{ fontSize: 14, color: "var(--tg-theme-hint-color, #888)" }}>{icon} {label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--tg-theme-text-color)" }}>{value}</span>
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{
      width: 51, height: 31, borderRadius: 16, cursor: "pointer", transition: "background 0.2s",
      background: on ? "var(--tg-theme-button-color, #2481cc)" : "var(--tg-theme-secondary-bg-color, #ccc)",
      position: "relative",
    }}>
      <div style={{
        position: "absolute", top: 2, left: on ? 22 : 2, width: 27, height: 27,
        borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)",
      }} />
    </div>
  )
}

function ActionButton({ onClick, children, primary }: { onClick: () => void; children: React.ReactNode; primary?: boolean }) {
  return (
    <button onClick={onClick} style={{
      display: "block", width: "100%", padding: "14px 16px", borderRadius: 12, border: "none",
      background: primary ? "var(--tg-theme-button-color, #2481cc)" : "var(--tg-theme-secondary-bg-color, #f0f0f0)",
      color: primary ? "var(--tg-theme-button-text-color, #fff)" : "var(--tg-theme-text-color)",
      fontSize: 15, fontWeight: 600, cursor: "pointer", textAlign: "left",
    }}>
      {children}
    </button>
  )
}

const cardStyle: React.CSSProperties = {
  margin: "8px 16px 12px",
  padding: 16,
  borderRadius: 12,
  background: "var(--tg-theme-secondary-bg-color, #f0f0f0)",
}
