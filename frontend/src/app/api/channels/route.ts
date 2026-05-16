import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { channelOwners } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const username = (body.username || "").replace("@", "").trim().toLowerCase()
  const messengerType = body.messengerType === "max" ? "max" as const : "telegram" as const

  const usernameRegex = messengerType === "max"
    ? /^[a-zA-Z0-9_.\-]{2,}$/
    : /^[a-zA-Z0-9_]{3,}$/

  if (!username || !usernameRegex.test(username)) {
    return NextResponse.json({ error: "Некорректный username" }, { status: 400 })
  }

  const existing = await db
    .select()
    .from(channelOwners)
    .where(and(
      eq(channelOwners.channelUsername, username),
      eq(channelOwners.messengerType, messengerType),
    ))
    .limit(1)

  if (existing.length > 0) {
    return NextResponse.json({ error: "Канал уже добавлен" }, { status: 409 })
  }

  // Check if bot is already admin in Telegram
  let botIsAdmin = false
  let channelTgId: string | null = null
  let channelTitle: string | null = null

  if (messengerType === "telegram") {
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN
      if (token) {
        const [meRes, chatRes] = await Promise.all([
          fetch(`https://api.telegram.org/bot${token}/getMe`).then(r => r.json()),
          fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=@${username}`).then(r => r.json()),
        ])

        if (chatRes.ok) {
          channelTgId = String(chatRes.result.id)
          channelTitle = chatRes.result.title || null
          const botId = meRes.result?.id
          if (botId) {
            const memberRes = await fetch(
              `https://api.telegram.org/bot${token}/getChatMember?chat_id=@${username}&user_id=${botId}`
            ).then(r => r.json())
            if (memberRes.ok) {
              const status = memberRes.result?.status
              botIsAdmin = status === "administrator" || status === "creator"
            }
          }
        }
      }
    } catch {
      // proceed without check
    }
  }

  const [channel] = await db
    .insert(channelOwners)
    .values({
      userId: session.user.id,
      channelUsername: username,
      messengerType,
      status: botIsAdmin ? "active" : "pending",
      botIsAdmin,
      channelTgId,
      channelTitle,
    })
    .returning()

  return NextResponse.json(channel, { status: 201 })
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const channels = await db
    .select()
    .from(channelOwners)
    .where(eq(channelOwners.userId, session.user.id))

  return NextResponse.json(channels)
}
