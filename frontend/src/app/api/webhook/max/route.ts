import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { channelOwners } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const maxSecret = process.env.MAX_WEBHOOK_SECRET
    if (maxSecret) {
      const headerSecret = req.headers.get("x-max-secret")
      if (headerSecret !== maxSecret) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const event = await req.json()

    if (event.update_type !== "message_created") {
      return NextResponse.json({ ok: true })
    }

    const message = event.message
    if (!message || message.recipient?.chat_type !== "channel") {
      return NextResponse.json({ ok: true })
    }

    const chatId = String(message.recipient?.chat_id ?? "")
    if (!chatId) return NextResponse.json({ ok: true })

    const channel = await db
      .select({ channelUsername: channelOwners.channelUsername })
      .from(channelOwners)
      .where(and(
        eq(channelOwners.channelTgId, chatId),
        eq(channelOwners.messengerType, "max"),
        eq(channelOwners.botIsAdmin, true),
      ))
      .limit(1)
      .then(r => r[0] ?? null)

    if (!channel) return NextResponse.json({ ok: true })

    const workerUrl = process.env.WORKER_API_URL || "http://worker:8000"
    fetch(`${workerUrl}/api/max/new-post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": process.env.WORKER_SECRET || "",
      },
      body: JSON.stringify({
        channel_username: channel.channelUsername,
        message,
      }),
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[max webhook] Error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
