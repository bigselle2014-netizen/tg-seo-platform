import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { channelOwners, users } from "@/db/schema"
import { eq, and, sql } from "drizzle-orm"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const postIds: number[] = Array.isArray(body.postIds) ? body.postIds : []

  if (postIds.length === 0) {
    return NextResponse.json({ error: "No postIds provided" }, { status: 400 })
  }
  if (postIds.length > 100) {
    return NextResponse.json({ error: "Max 100 posts per batch" }, { status: 400 })
  }

  const [channel] = await db
    .select()
    .from(channelOwners)
    .where(and(eq(channelOwners.id, id), eq(channelOwners.userId, session.user.id)))
    .limit(1)

  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Проверяем лимит тарифа
  const [userRow] = await db
    .select({ postsLimit: users.postsLimit })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  const totalRow = await db
    .select({ total: sql<number>`coalesce(sum(${channelOwners.postsIndexed}), 0)` })
    .from(channelOwners)
    .where(eq(channelOwners.userId, session.user.id))

  const totalIndexed = Number(totalRow[0]?.total ?? 0)
  const postsLimit = userRow?.postsLimit ?? 10

  if (totalIndexed + postIds.length > postsLimit) {
    return NextResponse.json(
      { error: `Достигнут лимит тарифа (${totalIndexed}/${postsLimit}). Перейдите на следующий план.`, upgrade: true },
      { status: 402 }
    )
  }

  const workerUrl = process.env.WORKER_API_URL || "http://worker:8000"
  const workerSecret = process.env.WORKER_SECRET || ""

  const results = await Promise.allSettled(
    postIds.map((postId) =>
      fetch(`${workerUrl}/api/posts/${postId}/promote`, {
        method: "POST",
        headers: { "X-Worker-Secret": workerSecret },
      }),
    ),
  )

  const started = results.filter((r) => r.status === "fulfilled").length
  return NextResponse.json({ status: "started", started, total: postIds.length })
}
