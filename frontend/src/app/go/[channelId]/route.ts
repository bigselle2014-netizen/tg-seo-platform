import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { analyticsEvents } from "@/db/schema"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const { channelId } = await params
  const ref = request.nextUrl.searchParams.get("ref") || ""
  const slug = request.nextUrl.searchParams.get("slug") || ""

  const telegramUrl = `https://t.me/${channelId}${ref ? `/${ref}` : ""}`

  // Log tg_click event (fire-and-forget, don't block redirect)
  db.insert(analyticsEvents).values({
    channelUsername: channelId,
    eventType: "tg_click",
    pageSlug: slug || null,
    sessionId: null,
  }).catch(() => {/* silent */})

  return NextResponse.redirect(telegramUrl, 302)
}
