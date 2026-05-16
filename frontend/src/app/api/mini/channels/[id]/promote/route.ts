import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { channelOwners, users } from "@/db/schema"
import { eq, and, sql } from "drizzle-orm"

const WORKER_URL = process.env.WORKER_API_URL || "http://worker:8000"
const WORKER_SECRET = process.env.WORKER_SECRET || ""

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = req.headers.get("x-mini-user-id")
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const postIds: number[] = Array.isArray(body.postIds) ? body.postIds : []

  if (postIds.length === 0) return NextResponse.json({ error: "No postIds" }, { status: 400 })
  if (postIds.length > 100) return NextResponse.json({ error: "Max 100 posts" }, { status: 400 })

  const [ch] = await db
    .select({ id: channelOwners.id })
    .from(channelOwners)
    .where(and(eq(channelOwners.id, id), eq(channelOwners.userId, userId)))
    .limit(1)

  if (!ch) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Проверяем лимит тарифа
  const [userRow] = await db
    .select({ postsLimit: users.postsLimit })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const totalRow = await db
    .select({ total: sql<number>`coalesce(sum(${channelOwners.postsIndexed}), 0)` })
    .from(channelOwners)
    .where(eq(channelOwners.userId, userId))

  const totalIndexed = Number(totalRow[0]?.total ?? 0)
  const postsLimit = userRow?.postsLimit ?? 10

  if (totalIndexed + postIds.length > postsLimit) {
    return NextResponse.json(
      { error: `Лимит тарифа исчерпан (${totalIndexed}/${postsLimit})`, upgrade: true },
      { status: 402 }
    )
  }

  const results = await Promise.allSettled(
    postIds.map(postId =>
      fetch(`${WORKER_URL}/api/posts/${postId}/promote`, {
        method: "POST",
        headers: { "X-Worker-Secret": WORKER_SECRET },
      })
    )
  )

  const started = results.filter(r => r.status === "fulfilled").length
  return NextResponse.json({ started, total: postIds.length })
}
