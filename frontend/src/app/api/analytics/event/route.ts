import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { analyticsEvents } from "@/db/schema"

const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_MAX = 30
const RATE_LIMIT_WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = (rateLimitMap.get(ip) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS)
  if (timestamps.length >= RATE_LIMIT_MAX) return true
  timestamps.push(now)
  rateLimitMap.set(ip, timestamps)
  return false
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { channelUsername, eventType, pageSlug, sessionId } = body

    if (!channelUsername || !eventType) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    if (!["page_view", "tg_click"].includes(eventType)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 })
    }

    await db.insert(analyticsEvents).values({
      channelUsername: String(channelUsername).slice(0, 100),
      eventType: String(eventType),
      pageSlug: pageSlug ? String(pageSlug).slice(0, 300) : null,
      sessionId: sessionId ? String(sessionId).slice(0, 100) : null,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
