import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { analyticsEvents, channelOwners } from "@/db/schema"
import { eq, and, gte, count } from "drizzle-orm"

export default async function AnalyticsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/auth/sign-in")

  const channels = await db
    .select({ channelUsername: channelOwners.channelUsername, channelTitle: channelOwners.channelTitle })
    .from(channelOwners)
    .where(eq(channelOwners.userId, session.user.id))

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const stats = await Promise.all(
    channels.map(async (ch) => {
      const [views, clicks] = await Promise.all([
        db
          .select({ count: count() })
          .from(analyticsEvents)
          .where(
            and(
              eq(analyticsEvents.channelUsername, ch.channelUsername),
              eq(analyticsEvents.eventType, "page_view"),
              gte(analyticsEvents.createdAt, thirtyDaysAgo),
            )
          )
          .then((r) => r[0]?.count ?? 0),
        db
          .select({ count: count() })
          .from(analyticsEvents)
          .where(
            and(
              eq(analyticsEvents.channelUsername, ch.channelUsername),
              eq(analyticsEvents.eventType, "tg_click"),
              gte(analyticsEvents.createdAt, thirtyDaysAgo),
            )
          )
          .then((r) => r[0]?.count ?? 0),
      ])
      return { ...ch, views, clicks }
    })
  )

  const totalViews = stats.reduce((s, c) => s + Number(c.views), 0)
  const totalClicks = stats.reduce((s, c) => s + Number(c.clicks), 0)
  const conversionRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0"

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Аналитика — последние 30 дней</h1>

      {channels.length === 0 ? (
        <div className="rounded-xl bg-white border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">Аналитика будет доступна после подключения канала</p>
          <a
            href="/dashboard/channels/add"
            className="inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Подключить канал
          </a>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl bg-white border border-gray-200 p-5">
              <p className="text-sm text-gray-500">Просмотры страниц</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalViews.toLocaleString("ru-RU")}</p>
            </div>
            <div className="rounded-xl bg-white border border-gray-200 p-5">
              <p className="text-sm text-gray-500">Переходы в Telegram</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{totalClicks.toLocaleString("ru-RU")}</p>
            </div>
            <div className="rounded-xl bg-white border border-gray-200 p-5">
              <p className="text-sm text-gray-500">Конверсия в подписчиков</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{conversionRate}%</p>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Канал</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Просмотры</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Клики в TG</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Конверсия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.map((ch) => {
                  const views = Number(ch.views)
                  const clicks = Number(ch.clicks)
                  const conv = views > 0 ? ((clicks / views) * 100).toFixed(1) : "0"
                  return (
                    <tr key={ch.channelUsername} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {ch.channelTitle || `@${ch.channelUsername}`}
                        <span className="ml-1 text-gray-400 text-xs">@{ch.channelUsername}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{views.toLocaleString("ru-RU")}</td>
                      <td className="px-4 py-3 text-right text-blue-600 font-medium">{clicks.toLocaleString("ru-RU")}</td>
                      <td className="px-4 py-3 text-right text-green-600">{conv}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
