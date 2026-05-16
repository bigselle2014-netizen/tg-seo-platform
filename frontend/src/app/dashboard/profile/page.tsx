import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/auth/sign-in")

  const user = session.user
  const userName = user.name || ""
  const initials = userName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) || "?"

  return (
    <div className="min-h-screen bg-(--color-bg-subtle)">
      <div className="max-w-xl mx-auto px-6 py-10">

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-(--color-text-muted) hover:text-(--color-text) mb-8 transition-colors"
        >
          <ArrowLeft size={14} />
          Назад
        </Link>

        <h1 className="text-2xl font-bold text-(--color-text) mb-6">Настройки профиля</h1>

        <div className="bg-white rounded-[14px] border border-(--color-border) p-6 mb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-(--color-primary) flex items-center justify-center text-white text-xl font-bold shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-base font-semibold text-(--color-text)">{userName}</p>
              <p className="text-sm text-(--color-text-muted)">{user.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-(--color-text-muted) uppercase tracking-wide block mb-1">
                Имя
              </label>
              <div className="px-3 py-2.5 bg-(--color-bg-subtle) rounded-[10px] border border-(--color-border) text-sm text-(--color-text)">
                {userName || "—"}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-(--color-text-muted) uppercase tracking-wide block mb-1">
                Email
              </label>
              <div className="px-3 py-2.5 bg-(--color-bg-subtle) rounded-[10px] border border-(--color-border) text-sm text-(--color-text)">
                {user.email || "—"}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-(--color-text-muted) uppercase tracking-wide block mb-1">
                Авторизация
              </label>
              <div className="px-3 py-2.5 bg-(--color-bg-subtle) rounded-[10px] border border-(--color-border) text-sm text-(--color-text)">
                Telegram
              </div>
            </div>
          </div>

          <p className="text-xs text-(--color-text-muted) mt-4">
            Данные профиля синхронизированы с вашим Telegram-аккаунтом и не могут быть изменены вручную.
          </p>
        </div>

        <div className="bg-white rounded-[14px] border border-(--color-border) p-6">
          <h2 className="text-sm font-semibold text-(--color-text) mb-4">Выход из аккаунта</h2>
          <form action="/api/auth/sign-out" method="POST">
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-[10px] hover:bg-red-50 transition-colors"
            >
              Выйти из аккаунта
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
