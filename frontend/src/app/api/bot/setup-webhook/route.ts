import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { Bot } from "grammy"
import { auth } from "@/lib/auth"

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = process.env.TELEGRAM_BOT_TOKEN
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!token || !siteUrl) {
    return NextResponse.json({ error: "Missing config" }, { status: 500 })
  }

  const bot = new Bot(token)
  const webhookUrl = `${siteUrl}/api/webhook/telegram`

  try {
    await bot.api.setWebhook(webhookUrl, {
      allowed_updates: ["channel_post", "my_chat_member"],
      drop_pending_updates: true,
      ...(process.env.TELEGRAM_WEBHOOK_SECRET
        ? { secret_token: process.env.TELEGRAM_WEBHOOK_SECRET }
        : {}),
    })
    const info = await bot.api.getWebhookInfo()
    return NextResponse.json({ ok: true, webhook: info })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ error: "No token" }, { status: 500 })

  const bot = new Bot(token)
  const info = await bot.api.getWebhookInfo()
  return NextResponse.json(info)
}
