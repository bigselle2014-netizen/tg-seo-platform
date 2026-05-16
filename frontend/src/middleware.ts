import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "mini-app-secret-change-in-prod"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Dashboard: cookie-based auth (Better Auth)
  if (pathname.startsWith("/dashboard")) {
    const sessionToken =
      request.cookies.get("better-auth.session_token")?.value ||
      request.cookies.get("__Secure-better-auth.session_token")?.value

    if (!sessionToken) {
      return NextResponse.redirect(new URL("/auth/sign-in", request.url))
    }
    return NextResponse.next()
  }

  // Mini App API: JWT Bearer auth
  if (pathname.startsWith("/api/mini/") && pathname !== "/api/mini/auth") {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.slice(7)
    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      const { payload } = await jwtVerify(token, secret)
      const userId = payload.userId as string

      const requestHeaders = new Headers(request.headers)
      requestHeaders.set("x-mini-user-id", userId)

      return NextResponse.next({ request: { headers: requestHeaders } })
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/mini/:path*"],
}
