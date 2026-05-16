import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { channelOwners } from "@/db/schema"
import { and, eq } from "drizzle-orm"

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/auth/sign-in")

  const [channel] = await db
    .select()
    .from(channelOwners)
    .where(and(eq(channelOwners.id, id), eq(channelOwners.userId, session.user.id)))
    .limit(1)

  if (!channel) redirect("/dashboard")

  const userName = session.user.name || session.user.email || ""
  const userInitials = userName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)

  return (
    <div className="flex flex-col">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-semibold text-gray-900">Команда</span>
          <span>·</span>
          <span>Управление участниками и уровнями доступа</span>
        </div>
      </div>

      <div className="p-6 max-w-2xl flex flex-col gap-6">
        {/* Members list */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Участники команды</h2>
          <p className="text-xs text-gray-500 mb-4">Управляйте доступом к вашему каналу</p>

          <div className="border border-gray-100 rounded-xl divide-y divide-gray-50">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                {userInitials}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{userName}</p>
                <p className="text-xs text-gray-400">{session.user.email}</p>
              </div>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Владелец
              </span>
            </div>
            <div className="px-4 py-4 text-center text-xs text-gray-400">
              В команде пока нет других участников
            </div>
          </div>
        </div>

        {/* Invite */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Пригласить участника</h2>
          <p className="text-xs text-gray-500 mb-4">
            Добавьте пользователя по его Telegram username (макс. 10 участников)
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Telegram Username</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-sm text-gray-400">@</span>
                <input
                  type="text"
                  placeholder="username"
                  disabled
                  className="flex-1 rounded-r-lg border border-gray-200 px-3 py-2 text-sm bg-gray-50 text-gray-400"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Пользователь должен хотя бы раз авторизоваться в системе
              </p>
            </div>
            <button
              disabled
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Добавить в команду
            </button>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              Функция командного доступа будет доступна после настройки Telegram OAuth
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
