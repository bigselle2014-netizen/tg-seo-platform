import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { tgAuthRequests, users } from "@/db/schema"
import { eq, or } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { signCookieValue } from "@/lib/cookie-sign"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  if (!token) return NextResponse.json({ status: "error" }, { status: 400 })

  const [request] = await db
    .select()
    .from(tgAuthRequests)
    .where(eq(tgAuthRequests.token, token))
    .limit(1)

  if (!request) return NextResponse.json({ status: "error" }, { status: 404 })
  if (request.expiresAt < new Date()) {
    return NextResponse.json({ status: "expired" })
  }
  if (request.status !== "complete" || !request.telegramId) {
    return NextResponse.json({ status: "pending" })
  }

  // Find or create user
  const ctx = await auth.$context
  const adapter = ctx.internalAdapter

  // Find by telegramId OR by synthetic email (handles legacy rows where telegram_id was NULL)
  let [existing] = await db
    .select()
    .from(users)
    .where(or(
      eq(users.telegramId, request.telegramId),
      eq(users.email, `tg_${request.telegramId}@telegram.invalid`),
    ))
    .limit(1)

  let userId: string
  if (existing) {
    userId = existing.id
    if (!existing.telegramId) {
      await db.update(users).set({
        telegramId: request.telegramId,
        telegramUsername: request.telegramUsername ?? null,
      }).where(eq(users.id, userId))
    }
  } else {
    const newUser = await adapter.createUser({
      name: request.telegramName || request.telegramUsername || "Telegram User",
      email: `tg_${request.telegramId}@telegram.invalid`,
      emailVerified: false,
    }) as { id: string }
    userId = newUser.id
    await db.update(users).set({
      telegramId: request.telegramId,
      telegramUsername: request.telegramUsername ?? null,
    }).where(eq(users.id, userId))
  }

  // Create session
  const session = await adapter.createSession(userId)

  // Sign cookie — exact algorithm from better-call/dist/crypto.mjs
  const secret = process.env.BETTER_AUTH_SECRET!
  const signedValue = await signCookieValue(session.token, secret)

  // Cookie name on HTTPS = __Secure-better-auth.session_token
  const isSecure = (process.env.NEXT_PUBLIC_SITE_URL || "").startsWith("https://")
  const cookieName = isSecure
    ? "__Secure-better-auth.session_token"
    : "better-auth.session_token"

  const maxAge = 7 * 24 * 60 * 60 // 7 days (Better Auth default)

  // Mark token as used
  await db.delete(tgAuthRequests).where(eq(tgAuthRequests.token, token))

  const res = NextResponse.json({ status: "ok" })
  res.headers.set(
    "Set-Cookie",
    `${cookieName}=${signedValue}; Path=/; HttpOnly; SameSite=Lax; ${isSecure ? "Secure; " : ""}Max-Age=${maxAge}`
  )
  return res
}
