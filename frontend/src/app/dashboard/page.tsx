import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { channelOwners } from "@/db/schema"
import { eq } from "drizzle-orm"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/auth/sign-in")

  const channels = await db
    .select()
    .from(channelOwners)
    .where(eq(channelOwners.userId, session.user.id))

  if (channels.length > 0) {
    redirect(`/dashboard/channels/${channels[0].id}/posts`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Добавьте первый канал</h1>
        <p className="text-gray-500 mb-6">Подключите Telegram-канал и начните получать органический трафик из поиска</p>
        <Link
          href="/dashboard/channels/add"
          className="inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Подключить канал
        </Link>
      </div>
    </div>
  )
}
