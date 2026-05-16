import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { channelOwners } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const [channel] = await db
    .select()
    .from(channelOwners)
    .where(and(eq(channelOwners.id, id), eq(channelOwners.userId, session.user.id)))
    .limit(1)

  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const page = searchParams.get("page") || "1"
  const perPage = searchParams.get("per_page") || "50"
  const filter = searchParams.get("filter") || "all"

  const workerUrl = process.env.WORKER_API_URL || "http://localhost:8000"
  const workerSecret = process.env.WORKER_SECRET || ""

  const workerFilter =
    filter === "pending" ? "&pending_only=true" :
    filter === "indexed" ? "&indexed_only=true" : ""

  const [postsData, indexedData, allData] = await Promise.all([
    fetch(
      `${workerUrl}/api/channels/${channel.channelUsername}/posts?page=${page}&per_page=${perPage}${workerFilter}`,
      { headers: { "X-Worker-Secret": workerSecret }, signal: AbortSignal.timeout(15_000) },
    ).then(r => r.ok ? r.json() : { posts: [], total: 0 }).catch(() => ({ posts: [], total: 0 })),

    fetch(
      `${workerUrl}/api/channels/${channel.channelUsername}/posts?page=1&per_page=1&indexed_only=true`,
      { headers: { "X-Worker-Secret": workerSecret }, signal: AbortSignal.timeout(8_000) },
    ).then(r => r.ok ? r.json() : { total: 0 }).catch(() => ({ total: 0 })),

    fetch(
      `${workerUrl}/api/channels/${channel.channelUsername}/posts?page=1&per_page=1`,
      { headers: { "X-Worker-Secret": workerSecret }, signal: AbortSignal.timeout(8_000) },
    ).then(r => r.ok ? r.json() : { total: 0 }).catch(() => ({ total: 0 })),
  ])

  return NextResponse.json({
    posts: postsData.posts || [],
    total: postsData.total || 0,
    channel: {
      channelUsername: channel.channelUsername,
      channelTitle: channel.channelTitle,
      seoAuditText: channel.seoAuditText ?? null,
      seoAuditedAt: channel.seoAuditedAt ?? null,
    },
    autoPublish: channel.autoPublish,
    stats: {
      inSearch: indexedData.total || 0,
      pendingTotal: Math.max(0, (allData.total || 0) - (indexedData.total || 0)),
      totalAll: allData.total || 0,
    },
  })
}
