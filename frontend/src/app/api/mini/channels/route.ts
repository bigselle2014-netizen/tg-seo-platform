import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { channelOwners, analyticsEvents } from "@/db/schema"
import { eq, and, count, sql } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-mini-user-id")
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const channels = await db
    .select()
    .from(channelOwners)
    .where(and(eq(channelOwners.userId, userId), eq(channelOwners.isArchived, false)))
    .orderBy(channelOwners.createdAt)

  return NextResponse.json(channels)
}
