import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { channelOwners } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

  const workerUrl = process.env.WORKER_API_URL || "http://localhost:8000"
  const workerSecret = process.env.WORKER_SECRET || ""
  const workerHeaders = {
    "Content-Type": "application/json",
    "X-Worker-Secret": workerSecret,
  }
  try {
    if (channel.messengerType === "max") {
      if (channel.channelTgId) {
        await fetch(`${workerUrl}/api/max/register-channel`, {
          method: "POST",
          headers: workerHeaders,
          body: JSON.stringify({
            channel_username: channel.channelUsername,
            max_chat_id: Number(channel.channelTgId),
            channel_title: channel.channelTitle || "",
          }),
        })
        await fetch(`${workerUrl}/api/max/scrape`, {
          method: "POST",
          headers: workerHeaders,
          body: JSON.stringify({
            channel_username: channel.channelUsername,
            max_chat_id: Number(channel.channelTgId),
          }),
        })
      }
    } else {
      await fetch(`${workerUrl}/api/channels/${channel.channelUsername}/scrape`, {
        method: "POST",
        headers: workerHeaders,
      })
      await fetch(`${workerUrl}/api/channels/${channel.channelUsername}/generate-meta`, {
        method: "POST",
        headers: workerHeaders,
      })
    }
  } catch (e) {
    console.error("Failed to trigger worker:", e)
  }

  return NextResponse.json({ status: "import_started" })
}
