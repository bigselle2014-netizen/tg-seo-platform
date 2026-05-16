import { NextRequest, NextResponse } from "next/server"
import { validate, parse } from "@tma.js/init-data-node"
import jwt from "jsonwebtoken"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "mini-app-secret-change-in-prod"
const JWT_EXPIRES = "7d"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const initDataRaw: string = body.initData

    if (!initDataRaw) {
      return NextResponse.json({ error: "Missing initData" }, { status: 400 })
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 500 })
    }

    // Validate HMAC-SHA256 signature — throws on failure
    try {
      validate(initDataRaw, botToken, { expiresIn: 86400 })
    } catch {
      return NextResponse.json({ error: "Invalid or expired initData" }, { status: 401 })
    }

    const initData = parse(initDataRaw)
    const tgUser = initData.user
    if (!tgUser) {
      return NextResponse.json({ error: "No user in initData" }, { status: 400 })
    }

    const telegramId = String(tgUser.id)

    // Find existing user by telegramId
    let [existingUser] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.telegramId, telegramId))
      .limit(1)

    // Create user if not exists
    if (!existingUser) {
      const ctx = await auth.$context
      const adapter = ctx.internalAdapter
      const name = [tgUser.firstName, tgUser.lastName].filter(Boolean).join(" ") || tgUser.username || "Telegram User"
      const newUser = await adapter.createUser({
        name,
        email: `tg_${telegramId}@telegram.invalid`,
        emailVerified: false,
      }) as { id: string; name: string }

      await db.update(users)
        .set({ telegramId, telegramUsername: tgUser.username ?? null })
        .where(eq(users.id, newUser.id))

      existingUser = { id: newUser.id, name: newUser.name }
    }

    const token = jwt.sign(
      { userId: existingUser.id, telegramId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES },
    )

    return NextResponse.json({ token, userId: existingUser.id })
  } catch (err) {
    console.error("[mini/auth] Error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
