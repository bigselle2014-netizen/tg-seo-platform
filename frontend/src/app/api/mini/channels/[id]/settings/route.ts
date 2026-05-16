import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { channelOwners } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = req.headers.get("x-mini-user-id")
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const allowed: Record<string, unknown> = {}
  if (typeof body.autoPublish === "boolean") allowed.autoPublish = body.autoPublish
  if (typeof body.autoPublishDelay === "number" && body.autoPublishDelay >= 0) {
    allowed.autoPublishDelay = body.autoPublishDelay
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  const [updated] = await db
    .update(channelOwners)
    .set(allowed)
    .where(and(eq(channelOwners.id, id), eq(channelOwners.userId, userId)))
    .returning()

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(updated)
}
