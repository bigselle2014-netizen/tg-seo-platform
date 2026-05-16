import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { channelOwners } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(
  _req: NextRequest,
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
  if (channel.messengerType !== "telegram") {
    return NextResponse.json({ error: "Only for Telegram channels" }, { status: 400 })
  }

  const workerUrl = process.env.WORKER_API_URL || "http://localhost:8000"
  const res = await fetch(
    `${workerUrl}/api/channels/${channel.channelUsername}/scrape-web?limit=500`,
    {
      method: "POST",
      headers: { "X-Worker-Secret": process.env.WORKER_SECRET || "" },
    },
  )

  if (!res.ok) return NextResponse.json({ error: "Worker error" }, { status: 500 })
  return NextResponse.json({ status: "started" })
}
