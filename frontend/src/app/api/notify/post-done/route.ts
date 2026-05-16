import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { channelOwners, users } from "@/db/schema"
import { eq, and, sql } from "drizzle-orm"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://post-seo.seo-rezult.ru"
const WORKER_SECRET = process.env.WORKER_SECRET || ""

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-worker-secret")
  if (!WORKER_SECRET || secret !== WORKER_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { channel_username, post_id, seo_slug, seo_title } = await req.json()
  if (!channel_username || !post_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const [channel] = await db
    .select()
    .from(channelOwners)
    .where(and(
      eq(channelOwners.channelUsername, channel_username),
      eq(channelOwners.messengerType, "telegram"),
    ))
    .limit(1)

  if (!channel) return NextResponse.json({ ok: false, reason: "channel not found" })

  // Инкрементируем счётчик проиндексированных постов
  await db
    .update(channelOwners)
    .set({ postsIndexed: sql`${channelOwners.postsIndexed} + 1` })
    .where(eq(channelOwners.id, channel.id))

  const [user] = await db
    .select({ telegramId: users.telegramId })
    .from(users)
    .where(eq(users.id, channel.userId))
    .limit(1)

  if (!user?.telegramId) return NextResponse.json({ ok: false, reason: "no telegram id" })

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ ok: false, reason: "no bot token" })

  const miniUrl = `${SITE_URL}/mini?startapp=${channel.id}`

  const text = `✅ Статья из канала @${channel_username} отправлена на индексацию\\.\n\nПоисковые роботы Яндекс и Google получили уведомление\\. Статья появится в поисковой выдаче через 1–72 часа\\. Как только она попадёт в поиск — мы покажем её позицию в вашем кабинете\\.`

  const keyboard = { inline_keyboard: [
    [{ text: "📊 Открыть кабинет", web_app: { url: miniUrl } }],
  ]}

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: user.telegramId,
        text,
        parse_mode: "MarkdownV2",
        reply_markup: keyboard,
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (e) {
    console.error("[notify/post-done] Telegram API error:", e)
  }

  return NextResponse.json({ ok: true })
}
