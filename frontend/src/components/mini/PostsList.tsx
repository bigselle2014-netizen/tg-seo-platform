"use client"

import { useEffect, useState, useCallback } from "react"
import { miniApiFetch } from "./useMiniApi"

interface Post {
  id: number
  text?: string
  date?: string
  seo_title?: string
  seo_slug?: string | null
  is_indexed?: boolean
  search_position?: number | null
  search_impressions?: number | null
  search_clicks?: number | null
}

type Filter = "all" | "pending" | "generating" | "indexed"

function cleanTitle(text: string, len = 52): string {
  return (text || "")
    .replace(/\n+/g, " ").replace(/#\w+/g, "")
    .replace(/[*_`[\]()]/g, "")
    .replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu, "")
    .replace(/\s{2,}/g, " ").trim().slice(0, len) || "Медиа-пост"
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

export default function PostsList({ channelId }: { channelId: string }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ inSearch: 0, generatingTotal: 0, pendingTotal: 0, totalAll: 0 })
  const [autoPublish, setAutoPublish] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter] = useState<Filter>("pending")
  const [page, setPage] = useState(1)
  const [promotingIds, setPromotingIds] = useState(new Set<number>())
  const [promotedIds, setPromotedIds] = useState(new Set<number>())
  const [promotingAll, setPromotingAll] = useState(false)

  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null

  const loadPosts = useCallback(async (f: Filter, p: number, append = false) => {
    const filterParam = f === "pending" ? "pending" : f === "indexed" ? "indexed" : "all"
    const res = await miniApiFetch(`/channels/${channelId}?filter=${filterParam}&page=${p}&per_page=50`)
    if (!res.ok) return
    const data = await res.json()
    setPosts(prev => append ? [...prev, ...(data.posts || [])] : (data.posts || []))
    setTotal(data.total || 0)
    setStats(data.stats || { inSearch: 0, pendingTotal: 0, totalAll: 0 })
    if (p === 1 && data.channel) {
      setAutoPublish(!!data.channel.autoPublish)
    }
  }, [channelId])

  useEffect(() => {
    setLoading(true)
    setPage(1)
    loadPosts(filter, 1, false).finally(() => setLoading(false))
  }, [filter, loadPosts])

  const toggleAutoPublish = async () => {
    tg?.HapticFeedback.impactOccurred("light")
    const newVal = !autoPublish
    setAutoPublish(newVal)
    const res = await miniApiFetch(`/channels/${channelId}/settings`, {
      method: "PATCH",
      body: JSON.stringify({ autoPublish: newVal }),
    })
    if (!res.ok) setAutoPublish(!newVal)
  }

  const promoteOne = async (postId: number) => {
    if (promotingIds.has(postId) || promotedIds.has(postId)) return
    tg?.HapticFeedback.impactOccurred("light")
    setPromotingIds(prev => new Set(prev).add(postId))
    try {
      const res = await miniApiFetch(`/channels/${channelId}/promote`, {
        method: "POST",
        body: JSON.stringify({ postIds: [postId] }),
      })
      if (!res.ok) throw new Error("promote failed")
      setPromotedIds(prev => new Set(prev).add(postId))
      tg?.HapticFeedback.notificationOccurred("success")
      tg?.showPopup({
        message: "⚡ Запущено!\nСтатья появится через 2-5 минут.",
        buttons: [{ type: "ok" }],
      })
    } catch {
      tg?.HapticFeedback.notificationOccurred("error")
      tg?.showPopup({
        message: "❌ Ошибка запуска. Попробуйте ещё раз.",
        buttons: [{ type: "ok" }],
      })
    } finally {
      setPromotingIds(prev => { const s = new Set(prev); s.delete(postId); return s })
    }
  }

  const promoteAll = async () => {
    if (promotingAll) return
    const pending = posts.filter(p => !p.is_indexed && p.text && p.text.length > 100)
    if (pending.length === 0) return
    tg?.HapticFeedback.impactOccurred("medium")
    setPromotingAll(true)
    try {
      const res = await miniApiFetch(`/channels/${channelId}/promote`, {
        method: "POST",
        body: JSON.stringify({ postIds: pending.map(p => p.id) }),
      })
      const data = await res.json()
      tg?.HapticFeedback.notificationOccurred("success")
      tg?.showPopup({
        message: `⚡ Запущено ${data.started} постов!\nРезультаты появятся в кабинете через несколько минут.`,
        buttons: [{ type: "ok" }],
      })
      await loadPosts(filter, 1, false)
    } catch {
      tg?.HapticFeedback.notificationOccurred("error")
    } finally {
      setPromotingAll(false)
    }
  }

  const loadMore = async () => {
    if (loadingMore || posts.length >= total) return
    setLoadingMore(true)
    const nextPage = page + 1
    setPage(nextPage)
    await loadPosts(filter, nextPage, true)
    setLoadingMore(false)
  }

  const shortCount = Math.max(0, stats.totalAll - stats.inSearch - stats.pendingTotal)

  return (
    <div className="screen">

      {/* Автоиндексация + статистика */}
      <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--tg-theme-secondary-bg-color, #f0f0f0)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--tg-theme-text-color)" }}>Автоиндексация</span>
          <div onClick={toggleAutoPublish} style={{
            width: 51, height: 31, borderRadius: 16, cursor: "pointer", transition: "background 0.2s",
            background: autoPublish ? "var(--tg-theme-button-color, #2481cc)" : "var(--tg-theme-secondary-bg-color, #ccc)",
            position: "relative",
          }}>
            <div style={{
              position: "absolute", top: 2, left: autoPublish ? 22 : 2, width: 27, height: 27,
              borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)",
            }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--tg-theme-hint-color, #888)", flexWrap: "wrap" }}>
          <span>📤 В индексе: <b style={{ color: "var(--tg-theme-text-color)" }}>{stats.inSearch}</b></span>
          {stats.generatingTotal > 0 && (
            <span>⏳ Генерируется: <b style={{ color: "#f59e0b" }}>{stats.generatingTotal}</b></span>
          )}
          <span>⚡ Ждут: <b style={{ color: "var(--tg-theme-text-color)" }}>{stats.pendingTotal}</b></span>
        </div>
      </div>

      {/* Фильтры */}
      <div style={{ display: "flex", padding: "10px 16px 6px", gap: 8, overflowX: "auto" }}>
        {(["pending", "generating", "indexed", "all"] as Filter[]).map(f => {
          const count = f === "pending" ? stats.pendingTotal : f === "generating" ? stats.generatingTotal : f === "indexed" ? stats.inSearch : stats.totalAll
          if (f === "generating" && stats.generatingTotal === 0) return null
          return (
            <button
              key={f}
              onClick={() => { tg?.HapticFeedback.selectionChanged(); setFilter(f) }}
              style={{
                padding: "5px 12px", borderRadius: 20, border: "none", fontSize: 13, cursor: "pointer",
                whiteSpace: "nowrap", flexShrink: 0,
                background: filter === f ? (f === "generating" ? "#f59e0b" : "var(--tg-theme-button-color, #2481cc)") : "var(--tg-theme-secondary-bg-color, #f0f0f0)",
                color: filter === f ? "#fff" : "var(--tg-theme-text-color)",
                fontWeight: filter === f ? 600 : 400,
              }}
            >
              {f === "pending" ? `Ждут (${count})` : f === "generating" ? `⏳ Генерируется (${count})` : f === "indexed" ? "В поиске" : "Все"}
            </button>
          )
        })}
      </div>

      {/* Продвинуть все — только во вкладке "Ждут" */}
      {filter === "pending" && stats.pendingTotal > 0 && (
        <div style={{ padding: "4px 16px 10px" }}>
          <button
            onClick={promoteAll}
            disabled={promotingAll}
            style={{
              width: "100%", padding: "11px", borderRadius: 10, border: "none",
              background: "var(--tg-theme-button-color, #2481cc)",
              color: "var(--tg-theme-button-text-color, #fff)",
              fontSize: 14, fontWeight: 600, cursor: promotingAll ? "default" : "pointer",
              opacity: promotingAll ? 0.7 : 1,
            }}
          >
            {promotingAll ? "Запускаем..." : `⚡ Продвинуть все (${stats.pendingTotal})`}
          </button>
        </div>
      )}

      {/* Список постов */}
      {loading ? (
        <div style={{ padding: "0 16px" }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="shimmer" style={{ height: 52, marginBottom: 1, borderRadius: 0 }} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: 8, textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>📭</div>
          <div style={{ fontSize: 14, color: "var(--tg-theme-hint-color, #888)" }}>
            {filter === "pending" ? "Нет постов для продвижения" : "Нет постов"}
          </div>
        </div>
      ) : (
        <div style={{ overflowY: "auto", flex: 1 }}>
          {posts.map(p => {
            const isIndexed = p.is_indexed
            const isGenerating = !isIndexed && !!p.seo_slug
            const isShort = !isIndexed && !isGenerating && (!p.text || p.text.length < 100)
            const isPromoting = promotingIds.has(p.id)
            const isPromoted = promotedIds.has(p.id)
            const title = cleanTitle(p.seo_title || p.text || "")
            const date = formatDate(p.date)

            return (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 16px",
                borderBottom: "0.5px solid var(--tg-theme-secondary-bg-color, #f0f0f0)",
                minHeight: 52,
              }}>
                {/* Дата */}
                <div style={{
                  fontSize: 11, color: "var(--tg-theme-hint-color, #888)",
                  minWidth: 46, flexShrink: 0, lineHeight: 1.3,
                }}>
                  {date}
                </div>

                {/* Текст поста */}
                <div style={{
                  flex: 1, fontSize: 13, color: "var(--tg-theme-text-color)",
                  overflow: "hidden", textOverflow: "ellipsis",
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  lineHeight: 1.4,
                }}>
                  {title}
                </div>

                {/* Статус / Кнопка */}
                <div style={{ flexShrink: 0 }}>
                  {isIndexed ? (
                    p.search_position ? (
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: "#10b981",
                        background: "rgba(16,185,129,0.1)", padding: "4px 8px",
                        borderRadius: 20, whiteSpace: "nowrap",
                      }}>
                        📍 Позиция {p.search_position}
                      </span>
                    ) : (
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: "#6366f1",
                        background: "rgba(99,102,241,0.1)", padding: "4px 8px",
                        borderRadius: 20, whiteSpace: "nowrap",
                      }}>
                        📤 В индексе
                      </span>
                    )
                  ) : isGenerating || isPromoted ? (
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: "#f59e0b",
                      background: "rgba(245,158,11,0.1)", padding: "4px 8px",
                      borderRadius: 20, whiteSpace: "nowrap",
                    }}>
                      ⏳ Генерируется
                    </span>
                  ) : isShort ? (
                    <span style={{
                      fontSize: 11, color: "var(--tg-theme-hint-color, #888)",
                      background: "var(--tg-theme-secondary-bg-color, #f0f0f0)",
                      padding: "4px 8px", borderRadius: 20, whiteSpace: "nowrap",
                    }}>
                      Короткий
                    </span>
                  ) : (
                    <button
                      onClick={() => promoteOne(p.id)}
                      disabled={isPromoting}
                      style={{
                        fontSize: 12, fontWeight: 600,
                        color: isPromoting ? "var(--tg-theme-hint-color, #888)" : "var(--tg-theme-button-color, #2481cc)",
                        background: "transparent", border: "none", cursor: isPromoting ? "default" : "pointer",
                        padding: "4px 0", whiteSpace: "nowrap",
                      }}
                    >
                      {isPromoting ? "..." : "⚡ Продвинуть"}
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Подгрузить ещё */}
          {posts.length < total && (
            <div style={{ padding: 16, textAlign: "center" }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  border: "none", background: "none",
                  color: "var(--tg-theme-button-color, #2481cc)",
                  fontSize: 14, cursor: "pointer",
                }}
              >
                {loadingMore ? "Загружаем..." : "Загрузить ещё"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
