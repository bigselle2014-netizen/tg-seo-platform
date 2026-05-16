import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { channelOwners, analyticsEvents } from "@/db/schema"
import { eq, and, gte, count } from "drizzle-orm"

export default async function ChannelAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/auth/sign-in")

  const [channel] = await db
    .select()
    .from(channelOwners)
    .where(and(eq(channelOwners.id, id), eq(channelOwners.userId, session.user.id)))
    .limit(1)

  if (!channel) redirect("/dashboard")

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [views, clicks] = await Promise.all([
    db
      .select({ count: count() })
      .from(analyticsEvents)
      .where(and(
        eq(analyticsEvents.channelUsername, channel.channelUsername),
        eq(analyticsEvents.eventType, "page_view"),
        gte(analyticsEvents.createdAt, thirtyDaysAgo),
      ))
      .then((r) => r[0]?.count ?? 0),
    db
      .select({ count: count() })
      .from(analyticsEvents)
      .where(and(
        eq(analyticsEvents.channelUsername, channel.channelUsername),
        eq(analyticsEvents.eventType, "tg_click"),
        gte(analyticsEvents.createdAt, thirtyDaysAgo),
      ))
      .then((r) => r[0]?.count ?? 0),
  ])

  const totalViews = Number(views)
  const totalClicks = Number(clicks)
  const conv = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0"
  const hasData = totalViews > 0 || totalClicks > 0

  return (
    <div className="flex flex-col">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-semibold text-gray-900">Аналитика</span>
          <span>·</span>
          <span>Отслеживание трафика из поиска</span>
        </div>
      </div>

      <div className="p-6 max-w-3xl flex flex-col gap-4">
        {!hasData && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex gap-3">
            <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-800">
              Ваш канал недавно добавлен на платформу. Поисковым системам требуется время для ранжирования контента — первые значимые результаты следует ожидать через 4–6 месяцев.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Трафик из поисковых систем</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">За последние 30 дней</span>
          </div>
          {hasData ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Просмотры страниц</p>
                <p className="text-2xl font-bold text-gray-900">{totalViews.toLocaleString("ru-RU")}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Переходы в Telegram</p>
                <p className="text-2xl font-bold text-blue-600">{totalClicks.toLocaleString("ru-RU")}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Конверсия</p>
                <p className="text-2xl font-bold text-green-600">{conv}%</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">Недостаточно данных для отображения статистики</p>
          )}
        </div>

        {/* Yandex Webmaster stub */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-900">Поисковая статистика канала</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">За все время</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Отчёт построен на основе данных сервиса «Яндекс Вебмастер» и включает только статистику поисковой системы Яндекс.
          </p>
          <p className="text-sm text-gray-400 py-4 text-center">Недостаточно данных за выбранный интервал</p>
        </div>
      </div>
    </div>
  )
}
