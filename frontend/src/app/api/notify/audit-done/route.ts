import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { channelOwners, users } from "@/db/schema"
import { eq } from "drizzle-orm"

const WORKER_SECRET = process.env.WORKER_SECRET || ""

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-worker-secret")
  if (!WORKER_SECRET || secret !== WORKER_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { channel_username, audit_text, indexable_count } = await req.json()
  if (!channel_username) {
    return NextResponse.json({ error: "Missing channel_username" }, { status: 400 })
  }

  if (!audit_text) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const [channel] = await db
    .select()
    .from(channelOwners)
    .where(eq(channelOwners.channelUsername, String(channel_username)))
    .limit(1)

  if (!channel) return NextResponse.json({ ok: false, reason: "channel not found" })

  // Сохраняем аудит в БД
  await db
    .update(channelOwners)
    .set({ seoAuditText: audit_text, seoAuditedAt: new Date() })
    .where(eq(channelOwners.channelUsername, String(channel_username)))

  // Telegram уведомление
  const [user] = await db
    .select({ telegramId: users.telegramId })
    .from(users)
    .where(eq(users.id, channel.userId))
    .limit(1)

  if (!user?.telegramId) return NextResponse.json({ ok: true })

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ ok: true })

  const escapedText = audit_text
    .replace(/\\/g, "\\\\")
    .replace(/\./g, "\\.")
    .replace(/!/g, "\\!")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/-/g, "\\-")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/>/g, "\\>")
    .replace(/#/g, "\\#")
    .replace(/\+/g, "\\+")
    .replace(/=/g, "\\=")
    .replace(/\|/g, "\\|")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\~")
    .replace(/`/g, "\\`")

  const text =
    `📊 SEO\\-аудит канала @${channel.channelUsername} готов\\!\n\n` +
    `${escapedText}\n\n` +
    `📄 Готово к индексации: ${indexable_count ?? 0} постов`

  const keyboard = {
    inline_keyboard: [
      [{ text: "📄 Посмотреть публикации", callback_data: `ch:posts:${channel.id}:p:1:all` }],
    ],
  }

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
    console.error("[notify/audit-done] Telegram API error:", e)
  }

  return NextResponse.json({ ok: true })
}
