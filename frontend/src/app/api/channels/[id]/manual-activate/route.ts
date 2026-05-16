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

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ error: "Bot token missing" }, { status: 500 })

  // Проверяем через Telegram API что бот действительно является администратором
  const botInfoRes = await fetch(`https://api.telegram.org/bot${token}/getMe`)
  const botInfo = await botInfoRes.json()
  const botId = botInfo.result?.id

  if (!botId) return NextResponse.json({ error: "Cannot get bot info" }, { status: 500 })

  const chatId = `@${channel.channelUsername}`
  const memberRes = await fetch(
    `https://api.telegram.org/bot${token}/getChatMember?chat_id=${chatId}&user_id=${botId}`
  )
  const memberData = await memberRes.json()

  const status = memberData.result?.status
  const isAdmin = status === "administrator" || status === "creator"

  if (!isAdmin) {
    return NextResponse.json(
      { error: "Бот ещё не администратор", status: memberData.result?.status ?? "not_member" },
      { status: 400 }
    )
  }

  // Получаем информацию о канале
  const chatInfoRes = await fetch(
    `https://api.telegram.org/bot${token}/getChat?chat_id=${chatId}`
  )
  const chatInfo = await chatInfoRes.json()
  const chatData = chatInfo.result

  // Создаём invite link для трекинга
  let inviteLink: string | null = null
  try {
    const linkRes = await fetch(`https://api.telegram.org/bot${token}/createChatInviteLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        name: "TG SEO Tracking",
        creates_join_request: false,
      }),
    })
    const linkData = await linkRes.json()
    inviteLink = linkData.result?.invite_link ?? null
  } catch {
    // invite link не критичен
  }

  // Обновляем запись в БД
  await db
    .update(channelOwners)
    .set({
      botIsAdmin: true,
      status: "active",
      channelTgId: String(chatData?.id ?? ""),
      channelTitle: chatData?.title ?? null,
      inviteLink,
    })
    .where(eq(channelOwners.id, id))

  // Запускаем импорт истории в воркере
  const workerUrl = process.env.WORKER_API_URL || "http://worker:8000"
  const workerSecret = process.env.WORKER_SECRET || ""
  try {
    await fetch(`${workerUrl}/api/channels/${channel.channelUsername}/scrape`, {
      method: "POST",
      headers: { "X-Worker-Secret": workerSecret },
    })
    fetch(`${workerUrl}/api/channels/${channel.channelUsername}/generate-meta`, {
      method: "POST",
      headers: { "X-Worker-Secret": workerSecret },
    }).catch(() => {})
  } catch {
    // Не критично — можно повторить
  }

  return NextResponse.json({ ok: true, inviteLink })
}
