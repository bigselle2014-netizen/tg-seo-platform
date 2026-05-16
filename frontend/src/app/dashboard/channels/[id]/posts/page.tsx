"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { Zap, FileText, ChevronRight, SlidersHorizontal, Archive } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { PostsListSkeleton } from "@/components/ui/Skeleton"

interface Post {
  id: number
  text: string
  date: string
  telegram_message_id: number | null
  seo_title: string | null
  seo_slug: string | null
  is_indexed: boolean
  search_position?: number | null
  google_position_prev?: number | null
  yandex_position?: number | null
  yandex_position_prev?: number | null
}

interface Stats {
  inSearch: number
  pendingTotal: number
  totalAll: number
}

interface ChannelInfo {
  channelUsername: string
  channelTitle: string | null
  seoAuditText?: string | null
  seoAuditedAt?: string | null
}

type FilterKey = "all" | "ready" | "indexed" | "short"

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "Все",
  ready: "Готовы к индексации",
  indexed: "Активные",
  short: "Не подходящие для SEO",
}

function positionColor(pos: number): string {
  if (pos <= 3) return "text-emerald-600"
  if (pos <= 10) return "text-amber-500"
  return "text-slate-400"
}

function positionArrow(current: number, prev: number | null | undefined): string {
  if (!prev) return ""
  if (current < prev) return " ↑"
  if (current > prev) return " ↓"
  return " →"
}

function PositionCell({ post }: { post: Post }) {
  const g = post.search_position
  const y = post.yandex_position
  if (!post.is_indexed || (!g && !y)) return <span className="text-xs text-(--color-text-muted)">—</span>
  const best = g && y ? Math.min(g, y) : g ?? y!
  const isBestG = !y || (g && g <= y)
  const bestPrev = isBestG ? post.google_position_prev : post.yandex_position_prev
  const label = isBestG ? "Г" : "Я"
  const arrow = positionArrow(best, bestPrev)
  return (
    <span className={`text-xs font-semibold ${positionColor(best)}`}>
      {label}: {Math.round(best)}{arrow}
    </span>
  )
}

function canPromote(post: Post): boolean {
  return !post.seo_slug && Boolean(post.text) && post.text.length >= 100
}

function isShort(post: Post): boolean {
  return !post.seo_slug && (!post.text || post.text.length < 100)
}

export default function PostsPage() {
  const { id } = useParams<{ id: string }>()
  const [posts, setPosts] = useState<Post[]>([])
  const [channel, setChannel] = useState<ChannelInfo | null>(null)
  const [stats, setStats] = useState<Stats>({ inSearch: 0, pendingTotal: 0, totalAll: 0 })
  const [autoPublish, setAutoPublish] = useState(true)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [promoting, setPromoting] = useState<Set<number>>(new Set())
  const [promotingAll, setPromotingAll] = useState(false)
  const [autoPublishSaving, setAutoPublishSaving] = useState(false)
  const [auditExpanded, setAuditExpanded] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [kebabOpen, setKebabOpen] = useState<number | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const perPage = 50

  // Map our filter to API filter param
  const apiFilter = filter === "ready" ? "pending" : filter === "indexed" ? "indexed" : "all"

  const load = useCallback(async (f: FilterKey, p: number) => {
    setLoading(true)
    const apiF = f === "ready" ? "pending" : f === "indexed" ? "indexed" : "all"
    try {
      const res = await fetch(`/api/channels/${id}/posts-data?filter=${apiF}&page=${p}&per_page=${perPage}`)
      if (!res.ok) return
      const data = await res.json()
      setPosts(data.posts || [])
      setTotal(data.total || 0)
      setStats(data.stats || { inSearch: 0, pendingTotal: 0, totalAll: 0 })
      setAutoPublish(data.autoPublish ?? true)
      setChannel(data.channel || null)
      setSelected(new Set())
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { setPage(1); load(filter, 1) }, [filter, load])

  // Close filter dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  async function toggleAutoPublish() {
    setAutoPublishSaving(true)
    const newVal = !autoPublish
    setAutoPublish(newVal)
    try {
      await fetch(`/api/channels/${id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoPublish: newVal }),
      })
    } catch { setAutoPublish(!newVal) }
    finally { setAutoPublishSaving(false) }
  }

  async function promoteOne(postId: number) {
    setPromoting(prev => new Set(prev).add(postId))
    try {
      await fetch(`/api/channels/${id}/posts/${postId}/promote`, { method: "POST" })
      setTimeout(() => load(filter, page), 3000)
    } finally {
      setPromoting(prev => { const s = new Set(prev); s.delete(postId); return s })
    }
  }

  async function promoteSelected() {
    if (selected.size === 0 || promotingAll) return
    setPromotingAll(true)
    try {
      await fetch(`/api/channels/${id}/posts/promote-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds: Array.from(selected) }),
      })
      setSelected(new Set())
      setTimeout(() => load(filter, page), 3000)
    } finally { setPromotingAll(false) }
  }

  async function promoteAll() {
    const pending = visiblePosts.filter(canPromote)
    if (pending.length === 0 || promotingAll) return
    setPromotingAll(true)
    try {
      await fetch(`/api/channels/${id}/posts/promote-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds: pending.map(p => p.id) }),
      })
      setTimeout(() => load(filter, page), 3000)
    } finally { setPromotingAll(false) }
  }

  function toggleSelect(postId: number) {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(postId) ? s.delete(postId) : s.add(postId)
      return s
    })
  }

  const visiblePosts = search.trim()
    ? posts.filter(p => (p.text || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.seo_title || "").toLowerCase().includes(search.toLowerCase()))
    : posts

  // Apply client-side filter for short posts (API doesn't have this filter)
  const filteredPosts = filter === "short"
    ? visiblePosts.filter(isShort)
    : visiblePosts

  const promotable = filteredPosts.filter(canPromote)
  const allSelected = promotable.length > 0 && promotable.every(p => selected.has(p.id))

  function toggleSelectAll() {
    const ids = promotable.map(p => p.id)
    if (allSelected) {
      setSelected(prev => { const s = new Set(prev); ids.forEach(i => s.delete(i)); return s })
    } else {
      setSelected(prev => { const s = new Set(prev); ids.forEach(i => s.add(i)); return s })
    }
  }

  const shortCount = Math.max(0, stats.totalAll - stats.inSearch - stats.pendingTotal)
  const totalPages = Math.ceil(total / perPage)
  const auditText = channel?.seoAuditText

  const filterCounts: Record<FilterKey, number> = {
    all: stats.totalAll,
    ready: stats.pendingTotal,
    indexed: stats.inSearch,
    short: shortCount,
  }

  return (
    <div className="min-h-screen">
      {/* Шапка */}
      <div className="border-b border-(--color-border) bg-white px-6 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-semibold text-(--color-text)">Публикации</h1>
          <span className="text-(--color-text-muted) text-sm">·</span>
          <span className="text-sm text-(--color-text-muted)">Управление индексацией публикаций</span>
        </div>
      </div>

      <div>

        {/* Аудит карточка */}
        {auditText && (
          <div className="mx-6 mt-5 rounded-[14px] border border-(--color-border) bg-white p-6">
            <p className="text-xs text-(--color-text-muted) mb-2">Результат аудита</p>
            <h2 className="text-xl font-bold text-(--color-text) mb-3">
              Канал подходит для SEO-продвижения
            </h2>
            <p className={[
              "text-sm text-(--color-text) leading-relaxed",
              !auditExpanded ? "line-clamp-3" : "",
            ].join(" ")}>
              {auditText}
            </p>
            <button
              onClick={() => setAuditExpanded(v => !v)}
              className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] bg-(--color-primary) text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {auditExpanded ? "Свернуть" : "Открыть полный отчет"}
              <ChevronRight size={15} className={auditExpanded ? "rotate-90" : ""} />
            </button>
          </div>
        )}

        {/* Строка поиска + фильтр */}
        <div className="mx-6 mt-5 flex items-center gap-3 flex-wrap">
          {/* Поиск */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по публикациям"
            className="flex-1 max-w-xs px-3 py-2 text-sm border border-(--color-border) rounded-[10px] bg-white text-(--color-text) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:border-transparent"
          />

          {/* Фильтр дропдаун */}
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setFilterOpen(v => !v)}
              className={[
                "flex items-center gap-2 px-3 py-2 text-sm rounded-[10px] border transition-colors",
                filter !== "all"
                  ? "border-(--color-primary) text-(--color-primary) bg-(--color-primary-subtle)"
                  : "border-(--color-border) text-(--color-text-secondary) bg-white hover:bg-(--color-bg-subtle)",
              ].join(" ")}
            >
              <SlidersHorizontal size={14} />
              Фильтр
              {filter !== "all" && (
                <span className="w-4 h-4 rounded-full bg-(--color-primary) text-white text-[10px] flex items-center justify-center">1</span>
              )}
            </button>

            {filterOpen && (
              <div className="absolute left-0 top-10 w-64 bg-white border border-(--color-border) rounded-[14px] shadow-(--shadow-lg) py-1.5 z-20">
                <p className="px-4 py-2 text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide">
                  Фильтр по статусу
                </p>
                {(["all", "ready", "indexed", "short"] as FilterKey[]).map(f => (
                  <button
                    key={f}
                    onClick={() => { setFilter(f); setFilterOpen(false) }}
                    className={[
                      "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
                      filter === f
                        ? "bg-(--color-primary-subtle) text-(--color-primary) font-medium"
                        : "text-(--color-text) hover:bg-(--color-bg-subtle)",
                    ].join(" ")}
                  >
                    <span>{FILTER_LABELS[f]}</span>
                    <span className="text-xs text-(--color-text-muted) font-medium">{filterCounts[f]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Архив */}
          <button
            disabled
            className="flex items-center gap-2 px-3 py-2 text-sm border border-(--color-border) rounded-[10px] text-(--color-text-muted) bg-white opacity-50 cursor-not-allowed"
          >
            <Archive size={14} />
            Архив
          </button>

          {/* Продвинуть выбранные */}
          {selected.size > 0 && (
            <Button variant="primary" size="sm" onClick={promoteSelected} disabled={promotingAll}>
              <Zap size={14} />
              {promotingAll ? "Запускаем..." : `Продвинуть (${selected.size})`}
            </Button>
          )}

          {/* Автоиндексация */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-(--color-text-muted)">Автоиндексация</span>
            <button
              onClick={toggleAutoPublish}
              disabled={autoPublishSaving}
              aria-label="Переключить автопубликацию"
              className={[
                "relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50",
                autoPublish ? "bg-(--color-primary)" : "bg-slate-300",
              ].join(" ")}
            >
              <span className={[
                "absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
                autoPublish ? "translate-x-5" : "translate-x-0",
              ].join(" ")} />
            </button>
          </div>
        </div>

        {/* Таблица */}
        <div className="mx-6 my-4 min-w-0">
          <div className="bg-white rounded-[14px] border border-(--color-border) shadow-(--shadow-sm) overflow-x-auto">

            {loading ? (
              <PostsListSkeleton count={5} />
            ) : filteredPosts.length === 0 ? (
              <div className="py-20 text-center">
                <FileText size={48} className="text-(--color-text-muted) mx-auto mb-4" style={{ opacity: 0.4 }} />
                <p className="text-base font-medium text-(--color-text)">
                  {search ? "Ничего не найдено" : "Публикаций нет"}
                </p>
              </div>
            ) : (
              <>
                {/* Таблица с фиксированными колонками */}
                <table className="w-full table-fixed" onClick={() => setKebabOpen(null)}>
                  <colgroup>
                    <col style={{ width: "32px" }} />
                    <col style={{ width: "100px" }} />
                    <col />
                    <col style={{ width: "90px" }} />
                    <col style={{ width: "130px" }} />
                    <col style={{ width: "32px" }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-(--color-border-subtle) bg-(--color-bg-subtle)">
                      <th className="px-4 py-2.5 text-left">
                        {promotable.length > 0 && (
                          <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                            className="rounded border-(--color-border) text-(--color-primary) focus:ring-(--color-primary) cursor-pointer" />
                        )}
                      </th>
                      <th className="py-2.5 text-left text-xs font-medium text-(--color-text-muted)">Дата</th>
                      <th className="py-2.5 text-left text-xs font-medium text-(--color-text-muted)">Публикация</th>
                      <th className="py-2.5 text-left text-xs font-medium text-(--color-text-muted)">Позиция</th>
                      <th className="py-2.5 text-left text-xs font-medium text-(--color-text-muted)">Статус</th>
                      <th className="pr-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                  {filteredPosts.map(post => {
                    const indexed = post.is_indexed
                    const short = isShort(post)
                    const pending = canPromote(post)
                    const isPromoting = promoting.has(post.id)
                    const isSelected = selected.has(post.id)
                    const isKebabOpen = kebabOpen === post.id
                    const tgUrl = channel && post.telegram_message_id
                      ? `https://t.me/${channel.channelUsername}/${post.telegram_message_id}`
                      : null
                    const displayText = post.text?.replace(/\n+/g, " ").replace(/#\w+/g, "").trim() || "Без текста"

                    return (
                      <tr
                        key={post.id}
                        className={[
                          "border-b border-(--color-border-subtle) transition-colors",
                          isSelected ? "bg-(--color-primary-subtle)" : "hover:bg-(--color-bg-subtle)",
                        ].join(" ")}
                      >
                        {/* Чекбокс */}
                        <td className="px-4 py-3.5">
                          {pending && (
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(post.id)}
                              className="rounded border-(--color-border) text-(--color-primary) focus:ring-(--color-primary) cursor-pointer" />
                          )}
                        </td>

                        {/* Дата */}
                        <td className="py-3.5 text-xs text-(--color-text-muted) whitespace-nowrap">
                          {new Date(post.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </td>

                        {/* Текст */}
                        <td className="py-3.5 pr-4 max-w-0">
                          <p className="text-sm text-(--color-text) truncate">{displayText}</p>
                        </td>

                        {/* Позиция */}
                        <td className="py-3.5">
                          <PositionCell post={post} />
                        </td>

                        {/* Статус */}
                        <td className="py-3.5">
                          {indexed ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              В поиске
                            </span>
                          ) : short ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-(--color-text-muted)">
                              <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                              Не подходит
                            </span>
                          ) : pending ? (
                            <button
                              onClick={e => { e.stopPropagation(); promoteOne(post.id) }}
                              disabled={isPromoting}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--color-primary) hover:opacity-80 transition-opacity disabled:opacity-50"
                            >
                              {isPromoting
                                ? <span className="w-3 h-3 rounded-full border-2 border-(--color-primary) border-t-transparent animate-spin" />
                                : <span className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-(--color-primary)" />
                              }
                              {isPromoting ? "Запускается..." : "Индексировать"}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                              SEO готово
                            </span>
                          )}
                        </td>

                        {/* Kebab */}
                        <td className="pr-4 py-3.5 relative">
                          <button
                            onClick={e => { e.stopPropagation(); setKebabOpen(isKebabOpen ? null : post.id) }}
                            className="w-6 h-6 flex items-center justify-center rounded text-(--color-text-muted) hover:bg-(--color-bg-muted) hover:text-(--color-text) transition-colors"
                          >
                            <svg viewBox="0 0 4 16" className="w-1 h-4 fill-current">
                              <circle cx="2" cy="2" r="1.5" />
                              <circle cx="2" cy="8" r="1.5" />
                              <circle cx="2" cy="14" r="1.5" />
                            </svg>
                          </button>

                          {isKebabOpen && (
                            <div
                              onClick={e => e.stopPropagation()}
                              className="absolute right-0 top-8 w-48 bg-white border border-(--color-border) rounded-[12px] shadow-(--shadow-lg) py-1 z-30"
                            >
                              {tgUrl ? (
                                <a
                                  href={tgUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block px-4 py-2.5 text-sm text-(--color-text) hover:bg-(--color-bg-subtle) transition-colors"
                                  onClick={() => setKebabOpen(null)}
                                >
                                  Открыть в Telegram
                                </a>
                              ) : (
                                <span className="block px-4 py-2.5 text-sm text-(--color-text-muted) opacity-50">Открыть в Telegram</span>
                              )}
                              <button
                                disabled
                                className="w-full text-left px-4 py-2.5 text-sm text-(--color-text-muted) opacity-50 cursor-not-allowed"
                              >
                                Отправить в архив
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  </tbody>
                </table>
              </>
            )}

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between border-t border-(--color-border) bg-(--color-bg-subtle)">
                <p className="text-sm text-(--color-text-muted)">
                  Показано {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} из {total}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => { setPage(p => p - 1); load(filter, page - 1) }} disabled={page === 1}>← Назад</Button>
                  <Button variant="secondary" size="sm" onClick={() => { setPage(p => p + 1); load(filter, page + 1) }} disabled={page === totalPages}>Вперёд →</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Продвинуть все — внизу когда фильтр ready */}
        {filter === "ready" && stats.pendingTotal > 0 && !loading && (
          <div className="mx-6 mb-6">
            <Button variant="primary" onClick={promoteAll} disabled={promotingAll}>
              <Zap size={15} />
              {promotingAll ? "Запускаем..." : `Продвинуть все (${stats.pendingTotal})`}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
