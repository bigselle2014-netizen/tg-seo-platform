"use client"

import { useEffect, useState } from "react"
import { miniApiFetch } from "./useMiniApi"

interface Channel { id: string; channelUsername: string; autoPublish: boolean; autoPublishDelay: number }

const DELAYS = [
  { value: 0, label: "Без задержки" },
  { value: 10, label: "10 минут" },
  { value: 30, label: "30 минут" },
  { value: 60, label: "1 час" },
  { value: 120, label: "2 часа" },
]

export default function ChannelSettings({ channelId, onDeleted }: { channelId: string; onDeleted: () => void }) {
  const [channel, setChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null

  useEffect(() => {
    miniApiFetch(`/channels/${channelId}`)
      .then(r => r.json())
      .then(data => setChannel(data.channel))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [channelId])

  async function patch(update: Partial<Channel>) {
    if (!channel) return
    const optimistic = { ...channel, ...update }
    setChannel(optimistic)
    setSaving(true)
    const res = await miniApiFetch(`/channels/${channelId}/settings`, {
      method: "PATCH",
      body: JSON.stringify(update),
    })
    if (!res.ok) setChannel(channel)
    setSaving(false)
  }

  function confirmDelete() {
    tg?.showConfirm(
      `Удалить канал @${channel?.channelUsername}?\n\nВсе данные будут удалены навсегда.`,
      async (ok) => {
        if (!ok) return
        await miniApiFetch(`/channels/${channelId}`, { method: "DELETE" }).catch(() => {})
        onDeleted()
      }
    )
  }

  if (loading || !channel) {
    return (
      <div className="screen" style={{ padding: 16 }}>
        <div className="shimmer" style={{ height: 24, width: "50%", marginBottom: 16 }} />
        <div className="shimmer" style={{ height: 56, marginBottom: 8 }} />
        <div className="shimmer" style={{ height: 200 }} />
      </div>
    )
  }

  return (
    <div className="screen">
      <div style={{ padding: "16px 16px 8px", fontSize: 17, fontWeight: 700, color: "var(--tg-theme-text-color)" }}>
        ⚙️ Настройки @{channel.channelUsername}
      </div>

      <div className="screen-scroll" style={{ padding: "0 16px" }}>
        {/* Autopublish toggle */}
        <div style={sectionStyle}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--tg-theme-text-color)" }}>Автопубликация</div>
          <div
            onClick={() => { tg?.HapticFeedback.impactOccurred("light"); patch({ autoPublish: !channel.autoPublish }) }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 0", cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 15, color: "var(--tg-theme-text-color)" }}>
              {channel.autoPublish ? "🟢 Включена" : "🔴 Выключена"}
            </span>
            <Toggle on={channel.autoPublish} onChange={() => patch({ autoPublish: !channel.autoPublish })} />
          </div>
        </div>

        {/* Delay */}
        <div style={sectionStyle}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--tg-theme-text-color)" }}>⏱ Задержка публикации</div>
          {DELAYS.map(d => (
            <div
              key={d.value}
              onClick={() => { if (saving) return; tg?.HapticFeedback.selectionChanged(); patch({ autoPublishDelay: d.value }) }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 0", borderBottom: "0.5px solid var(--tg-theme-secondary-bg-color, #f0f0f0)",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 15, color: "var(--tg-theme-text-color)" }}>{d.label}</span>
              {channel.autoPublishDelay === d.value && (
                <span style={{ color: "var(--tg-theme-button-color, #2481cc)", fontWeight: 700 }}>✓</span>
              )}
            </div>
          ))}
        </div>

        {/* Delete */}
        <button
          onClick={confirmDelete}
          style={{
            display: "block", width: "100%", padding: "14px 16px", borderRadius: 12, border: "none",
            background: "rgba(255,59,48,0.1)", color: "#ff3b30",
            fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 8,
          }}
        >
          🗑 Удалить канал
        </button>
        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div onClick={e => { e.stopPropagation(); onChange() }} style={{
      width: 51, height: 31, borderRadius: 16, cursor: "pointer", transition: "background 0.2s",
      background: on ? "var(--tg-theme-button-color, #2481cc)" : "var(--tg-theme-secondary-bg-color, #ccc)",
      position: "relative", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", top: 2, left: on ? 22 : 2, width: 27, height: 27,
        borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)",
      }} />
    </div>
  )
}

const sectionStyle: React.CSSProperties = {
  background: "var(--tg-theme-secondary-bg-color, #f0f0f0)",
  borderRadius: 12, padding: "12px 16px", marginBottom: 12,
}
