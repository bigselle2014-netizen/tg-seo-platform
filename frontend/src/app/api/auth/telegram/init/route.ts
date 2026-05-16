import { NextResponse } from "next/server"
import { db } from "@/db"
import { tgAuthRequests } from "@/db/schema"

export async function GET() {
  const token = crypto.randomUUID().replace(/-/g, "")
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min

  await db.insert(tgAuthRequests).values({ token, expiresAt })

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "tg_buster_bot"
  const botUrl = `https://t.me/${botUsername}?start=auth_${token}`

  return NextResponse.json({ token, botUrl })
}
