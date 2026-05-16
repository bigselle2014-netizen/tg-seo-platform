import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { channelOwners, analyticsEvents } from "@/db/schema"
import { eq, and, count, sql } from "drizzle-orm"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = req.headers.get("x-mini-user-id")
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await db.delete(channelOwners).where(and(eq(channelOwners.id, id), eq(channelOwners.userId, userId)))
  return NextResponse.json({ ok: true })
}

const WORKER_URL = process.env.WORKER_API_URL || "http://worker:8000"
const WORKER_SECRET = process.env.WORKER_SECRET || ""

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = req.headers.get("x-mini-user-id")
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [ch] = await db
    .select()
    .from(channelOwners)
    .where(and(eq(channelOwners.id, id), eq(channelOwners.userId, userId)))
    .limit(1)

  if (!ch) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const page = searchParams.get("page") || "1"
  const perPage = searchParams.get("per_page") || "50"
  const filter = searchParams.get("filter") || "all"

  const workerFilter =
    filter === "pending" ? "&pending_only=true" :
    filter === "indexed" ? "&indexed_only=true" :
    filter === "generating" ? "&generating_only=true" : ""

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [postsData, indexedData, pendingData, generatingData, viewsRow, clicksRow] = await Promise.all([
    fetch(`${WORKER_URL}/api/channels/${ch.channelUsername}/posts?page=${page}&per_page=${perPage}${workerFilter}`, {
      headers: { "X-Worker-Secret": WORKER_SECRET },
      signal: AbortSignal.timeout(10_000),
    }).then(r => r.ok ? r.json() : { posts: [], total: 0 }).catch(() => ({ posts: [], total: 0 })),

    fetch(`${WORKER_URL}/api/channels/${ch.channelUsername}/posts?page=1&per_page=1&indexed_only=true`, {
      headers: { "X-Worker-Secret": WORKER_SECRET },
    }).then(r => r.ok ? r.json() : { total: 0 }).catch(() => ({ total: 0 })),

    fetch(`${WORKER_URL}/api/channels/${ch.channelUsername}/posts?page=1&per_page=1&pending_only=true`, {
      headers: { "X-Worker-Secret": WORKER_SECRET },
    }).then(r => r.ok ? r.json() : { total: 0 }).catch(() => ({ total: 0 })),

    fetch(`${WORKER_URL}/api/channels/${ch.channelUsername}/posts?page=1&per_page=1&generating_only=true`, {
      headers: { "X-Worker-Secret": WORKER_SECRET },
    }).then(r => r.ok ? r.json() : { total: 0 }).catch(() => ({ total: 0 })),

    db.select({ cnt: count() }).from(analyticsEvents).where(and(
      eq(analyticsEvents.channelUsername, ch.channelUsername),
      eq(analyticsEvents.eventType, "page_view"),
      sql`${analyticsEvents.createdAt} >= ${thirtyDaysAgo}`,
    )).then(r => r[0]),

    db.select({ cnt: count() }).from(analyticsEvents).where(and(
      eq(analyticsEvents.channelUsername, ch.channelUsername),
      eq(analyticsEvents.eventType, "tg_click"),
      sql`${analyticsEvents.createdAt} >= ${thirtyDaysAgo}`,
    )).then(r => r[0]),
  ])

  return NextResponse.json({
    channel: ch,
    stats: {
      inSearch: indexedData.total || 0,
      generatingTotal: generatingData.total || 0,
      pendingTotal: pendingData.total || 0,
      totalAll: (indexedData.total || 0) + (generatingData.total || 0) + (pendingData.total || 0),
      views30d: viewsRow?.cnt || 0,
      clicks30d: clicksRow?.cnt || 0,
    },
    posts: postsData.posts || [],
    total: postsData.total || 0,
  })
}
