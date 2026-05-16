"use client"
import { useEffect } from "react"

interface TrackViewProps {
  channelUsername: string
  pageSlug: string
}

export function TrackView({ channelUsername, pageSlug }: TrackViewProps) {
  useEffect(() => {
    let sessionId = sessionStorage.getItem("tgseo_sid")
    if (!sessionId) {
      sessionId = Math.random().toString(36).slice(2)
      sessionStorage.setItem("tgseo_sid", sessionId)
    }

    fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelUsername,
        eventType: "page_view",
        pageSlug,
        sessionId,
      }),
    }).catch(() => {/* silent */})
  }, [channelUsername, pageSlug])

  return null
}
