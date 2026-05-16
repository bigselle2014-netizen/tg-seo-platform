import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { channelOwners } from "@/db/schema"
import { eq } from "drizzle-orm"
import Link from "next/link"
import { SidebarNav } from "@/components/SidebarNav"
import { MobileNav } from "@/components/MobileNav"
import { UserMenu } from "@/components/UserMenu"

const DOC_LINKS = [
  { href: "https://t.me/tg_buster_bot", label: "Канал сервиса" },
  { href: "/docs/how-it-works", label: "Как работает сервис" },
  { href: "/docs/moderation", label: "Модерация контента" },
  { href: "/docs/terms", label: "Условия использования" },
  { href: "/docs/privacy", label: "Политика конфиденциальности" },
  { href: "/docs/complaints", label: "Жалобы на контент" },
  { href: "https://t.me/tg_buster_bot", label: "Поддержка" },
]

function onboardingSteps(ch: { botIsAdmin: boolean; postsIndexed: number; autoPublish: boolean }, channelId: string) {
  return [
    { label: "Канал зарегистрирован", done: true, description: null, action: null },
    { label: "Бот добавлен как администратор", done: ch.botIsAdmin, description: "Добавьте бота в администраторы канала", action: null },
    { label: "Первая публикация проиндексирована", done: ch.postsIndexed > 0, description: "Выберите посты для публикации", action: { label: "Перейти к постам →", href: `/dashboard/channels/${channelId}/posts` } },
    { label: "Настроена автопубликация", done: ch.autoPublish, description: "Включите автопубликацию в настройках", action: { label: "Смотреть настройки →", href: `/dashboard/channels/${channelId}/settings` } },
  ]
}

export default async function ChannelLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/auth/sign-in")

  const allChannels = await db
    .select()
    .from(channelOwners)
    .where(eq(channelOwners.userId, session.user.id))

  const channel = allChannels.find((ch) => ch.id === id)
  if (!channel) redirect("/dashboard")

  const steps = onboardingSteps(channel, id)
  const doneCount = steps.filter((s) => s.done).length
  const progressPct = Math.round((doneCount / steps.length) * 100)
  const allDone = doneCount === steps.length

  const userName = session.user.name || session.user.email || ""
  const userInitials = userName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const channelInitial = (channel.channelTitle || channel.channelUsername)[0].toUpperCase()

  return (
    <div className="min-h-screen bg-(--color-bg-subtle) flex">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 bg-white border-r border-(--color-border) min-h-screen fixed left-0 top-0 bottom-0 z-20">

        {/* Шапка с логотипом */}
        <div className="p-4 border-b border-(--color-border)">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded bg-(--color-primary) shrink-0" />
            <span className="text-sm font-bold text-(--color-text)">Post SEO</span>
          </div>

          {/* Карточка канала */}
          <div className="rounded-[10px] bg-(--color-bg-subtle) border border-(--color-border-subtle) p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-(--color-primary) flex items-center justify-center text-white text-xs font-bold shrink-0">
              {channelInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-(--color-text) truncate">
                {channel.channelTitle || `@${channel.channelUsername}`}
              </p>
              <p className="text-xs text-(--color-text-muted) truncate">@{channel.channelUsername}</p>
            </div>
            <div className="relative group shrink-0">
              <button className="text-(--color-text-muted) hover:text-(--color-text) p-0.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute left-0 top-7 w-56 bg-white rounded-[14px] border border-(--color-border) shadow-(--shadow-lg) py-1 hidden group-focus-within:block z-30">
                {allChannels.map((ch) => (
                  <Link
                    key={ch.id}
                    href={`/dashboard/channels/${ch.id}/posts`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-(--color-text-secondary) hover:bg-(--color-bg-subtle) hover:text-(--color-text) transition-colors"
                  >
                    <div className="w-6 h-6 rounded bg-(--color-primary-subtle) flex items-center justify-center text-(--color-primary) text-xs font-bold">
                      {(ch.channelTitle || ch.channelUsername)[0].toUpperCase()}
                    </div>
                    <span className="truncate">{ch.channelTitle || `@${ch.channelUsername}`}</span>
                  </Link>
                ))}
                <div className="border-t border-(--color-border) mt-1 pt-1">
                  <Link
                    href="/dashboard/channels/add"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-(--color-primary) hover:bg-(--color-primary-subtle) transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Добавить канал
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto p-3 gap-2">
          {/* Онбординг чеклист */}
          {(
            <div className="rounded-[10px] border border-(--color-border)">
              <div className="px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-(--color-primary)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-xs font-semibold text-(--color-text)">Начало работы</span>
                </div>
                <span className="text-xs text-(--color-text-muted)">{doneCount} из {steps.length}</span>
              </div>
              <div className="px-3 pb-1">
                <div className="h-1 bg-(--color-bg-muted) rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-(--color-primary) rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="space-y-1">
                  {steps.map((step) => (
                    <div key={step.label} className={["rounded-[8px] p-2", !step.done ? "bg-(--color-bg-subtle)" : ""].join(" ")}>
                      <div className="flex items-center gap-2">
                        <div className={[
                          "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                          step.done ? "bg-(--color-success)" : "border-2 border-(--color-border) bg-white",
                        ].join(" ")}>
                          {step.done && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={["text-xs font-medium", step.done ? "text-(--color-text-muted)" : "text-(--color-text)"].join(" ")}>
                          {step.label}
                        </span>
                      </div>
                      {!step.done && step.description && (
                        <div className="ml-6 mt-1">
                          <p className="text-xs text-(--color-text-muted)">{step.description}</p>
                          {step.action && (
                            <Link href={step.action.href} className="text-xs text-(--color-primary) hover:underline">
                              {step.action.label}
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button className="w-full text-center text-xs text-(--color-text-muted) hover:text-(--color-text) py-2 mt-1 transition-colors">
                  Скрыть подсказки
                </button>
              </div>
            </div>
          )}

          {/* Навигация */}
          <SidebarNav channelId={id} />

          {/* Баннер бесплатного доступа */}
          <div className="mt-auto rounded-[10px] bg-emerald-50 border border-emerald-200 p-3">
            <p className="text-xs font-semibold text-emerald-800 mb-0.5">Бесплатный доступ</p>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Все функции открыты бесплатно на период бета-тестирования
            </p>
          </div>

          {/* Документация */}
          <div className="pt-2 border-t border-(--color-border)">
            <p className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide px-3 mb-1">
              Документация
            </p>
            {DOC_LINKS.map((doc) => (
              <a
                key={doc.label}
                href={doc.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-1.5 text-xs text-(--color-text-muted) hover:text-(--color-text) transition-colors"
              >
                {doc.label}
              </a>
            ))}
          </div>
        </div>

        {/* Юзер-блок */}
        <UserMenu name={userName} email={session.user.email || ""} initials={userInitials} />
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-60">
        {/* Mobile header */}
        <div className="md:hidden bg-white border-b border-(--color-border) sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded bg-(--color-primary) flex items-center justify-center text-white text-xs font-bold shrink-0">
                {channelInitial}
              </div>
              <p className="text-sm font-semibold text-(--color-text) truncate">
                {channel.channelTitle || `@${channel.channelUsername}`}
              </p>
            </div>
            <div className="w-7 h-7 rounded-full bg-(--color-bg-muted) flex items-center justify-center text-xs font-bold text-(--color-text-secondary) shrink-0">
              {userInitials}
            </div>
          </div>
          <MobileNav channelId={id} />
        </div>

        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
