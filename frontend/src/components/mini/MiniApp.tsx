"use client"

import { useEffect, useState, useCallback } from "react"
import { setToken, getToken } from "./useMiniApi"
import ChannelList from "./ChannelList"
import ChannelDashboard from "./ChannelDashboard"
import PostsList from "./PostsList"
import ChannelSettings from "./ChannelSettings"

type Screen =
  | { name: "channels" }
  | { name: "channel"; channelId: string }
  | { name: "posts"; channelId: string }
  | { name: "settings"; channelId: string }

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void
        expand: () => void
        disableVerticalSwipes?: () => void
        BackButton: { show: () => void; hide: () => void; onClick: (fn: () => void) => void; offClick: (fn: () => void) => void }
        MainButton: { setText: (t: string) => void; show: () => void; hide: () => void; enable: () => void; disable: () => void; showProgress: () => void; hideProgress: () => void; onClick: (fn: () => void) => void; offClick: (fn: () => void) => void }
        HapticFeedback: { impactOccurred: (s: string) => void; notificationOccurred: (s: string) => void; selectionChanged: () => void }
        initData: string
        initDataUnsafe: { user?: { id: number; first_name?: string; username?: string }; start_param?: string }
        showPopup: (params: { message: string; buttons?: Array<{ type: string }> }, cb?: () => void) => void
        showConfirm: (message: string, cb: (ok: boolean) => void) => void
        openLink: (url: string) => void
        openTelegramLink?: (url: string) => void
        themeParams: { bg_color?: string; text_color?: string; button_color?: string; button_text_color?: string; secondary_bg_color?: string }
        colorScheme: "light" | "dark"
      }
    }
  }
}

export default function MiniApp() {
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>({ name: "channels" })
  const [history, setHistory] = useState<Screen[]>([])

  const push = useCallback((s: Screen) => {
    setHistory(h => [...h, screen])
    setScreen(s)
  }, [screen])

  const pop = useCallback(() => {
    setHistory(h => {
      const next = [...h]
      const prev = next.pop()
      if (prev) setScreen(prev)
      return next
    })
  }, [])

  // BackButton
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) return
    if (history.length === 0) {
      tg.BackButton.hide()
    } else {
      tg.BackButton.show()
      tg.BackButton.onClick(pop)
      return () => tg.BackButton.offClick(pop)
    }
  }, [history.length, pop])

  // Init SDK + auth
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) {
      setError("Откройте в Telegram")
      setReady(true)
      return
    }

    tg.ready()
    tg.expand()
    tg.disableVerticalSwipes?.()

    const initData = tg.initData

    // Check start_param for deep link
    const startParam = tg.initDataUnsafe.start_param
    if (startParam) {
      setScreen({ name: "posts", channelId: startParam })
    }

    const existingToken = getToken()

    async function auth() {
      // Try existing token first
      if (existingToken) {
        setAuthed(true)
        setReady(true)
        return
      }

      if (!initData) {
        // Dev mode without real Telegram
        setError("Нет initData — откройте через Telegram")
        setReady(true)
        return
      }

      try {
        const res = await fetch("/api/mini/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        })
        if (!res.ok) throw new Error("Auth failed")
        const data = await res.json()
        setToken(data.token)
        setAuthed(true)
      } catch {
        setError("Ошибка авторизации. Закройте и откройте заново.")
      } finally {
        setReady(true)
      }
    }

    auth()
  }, [])

  if (!ready) {
    return (
      <div className="mini-root" style={{ padding: 16 }}>
        <div className="shimmer" style={{ height: 24, width: "60%", marginBottom: 12 }} />
        <div className="shimmer" style={{ height: 16, width: "80%", marginBottom: 8 }} />
        <div className="shimmer" style={{ height: 16, width: "70%", marginBottom: 8 }} />
        <div className="shimmer" style={{ height: 56, marginBottom: 8 }} />
        <div className="shimmer" style={{ height: 56, marginBottom: 8 }} />
        <div className="shimmer" style={{ height: 56 }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="not-telegram">
        <div style={{ fontSize: 40 }}>📱</div>
        <div style={{ fontWeight: 600 }}>{error}</div>
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="not-telegram">
        <div style={{ fontSize: 40 }}>🔐</div>
        <div>Авторизация...</div>
      </div>
    )
  }

  return (
    <div className="mini-root">
      {screen.name === "channels" && (
        <ChannelList onSelect={ch => push({ name: "channel", channelId: ch })} />
      )}
      {screen.name === "channel" && (
        <ChannelDashboard
          channelId={screen.channelId}
          onPosts={() => push({ name: "posts", channelId: screen.channelId })}
          onSettings={() => push({ name: "settings", channelId: screen.channelId })}
        />
      )}
      {screen.name === "posts" && (
        <PostsList channelId={screen.channelId} />
      )}
      {screen.name === "settings" && (
        <ChannelSettings channelId={screen.channelId} onDeleted={pop} />
      )}
    </div>
  )
}
