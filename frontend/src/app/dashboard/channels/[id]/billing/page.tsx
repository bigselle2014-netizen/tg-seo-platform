import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { channelOwners, users } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { redirect } from "next/navigation"

const PLANS = [
  {
    name: "Free",
    price: 0,
    posts: 10,
    features: ["10 постов навсегда", "AI-статьи 800–1200 слов", "IndexNow пинг (Яндекс + Bing)"],
    highlight: false,
  },
  {
    name: "Старт",
    price: 290,
    posts: 100,
    features: ["100 активных постов", "AI-статьи 800–1200 слов", "XMLStock SERP анализ", "IndexNow пинг"],
    highlight: false,
  },
  {
    name: "Hobby",
    price: 590,
    posts: 300,
    features: ["300 активных постов", "AI-статьи 800–1200 слов", "XMLStock SERP анализ", "LSI-оптимизация", "IndexNow пинг"],
    highlight: true,
  },
  {
    name: "Pro",
    price: 990,
    posts: 1000,
    features: ["1000 активных постов", "AI-статьи 800–1200 слов", "XMLStock SERP анализ", "LSI-оптимизация", "Telegram + MAX каналы", "Приоритетная обработка"],
    highlight: false,
  },
  {
    name: "Business",
    price: 1790,
    posts: 3000,
    features: ["3000 активных постов", "Всё из Pro", "Выделенная очередь", "Поддержка 24/7"],
    highlight: false,
  },
] as const

export default async function BillingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/auth/sign-in")

  const [userRow] = await db
    .select({ postsLimit: users.postsLimit, plan: users.plan })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  const totalRow = await db
    .select({ total: sql<number>`coalesce(sum(${channelOwners.postsIndexed}), 0)` })
    .from(channelOwners)
    .where(eq(channelOwners.userId, session.user.id))

  const totalIndexed = Number(totalRow[0]?.total ?? 0)
  const postsLimit = userRow?.postsLimit ?? 10
  const usagePct = Math.min(100, Math.round((totalIndexed / postsLimit) * 100))

  return (
    <div className="flex flex-col">
      <div className="border-b border-(--color-border) bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-(--color-text)">Платежи и подписка</h1>
      </div>

      <div className="p-6 max-w-5xl">

        {/* Текущее использование */}
        <div className="mb-8 rounded-[14px] border border-(--color-border) bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-(--color-text)">Использование постов</span>
            <span className="text-sm text-(--color-text-muted)">{totalIndexed} / {postsLimit}</span>
          </div>
          <div className="h-2 rounded-full bg-(--color-bg-subtle) overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${usagePct}%`,
                background: usagePct >= 90 ? "#ef4444" : usagePct >= 70 ? "#f59e0b" : "#6366f1",
              }}
            />
          </div>
          {usagePct >= 90 && (
            <p className="mt-2 text-xs text-red-600 font-medium">Лимит почти исчерпан — обновите тариф</p>
          )}
        </div>

        {/* Тарифы */}
        <h2 className="text-base font-semibold text-(--color-text) mb-4">Тарифы</h2>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {PLANS.map((plan) => {
            const isCurrent = plan.posts === postsLimit
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-5 flex flex-col ${
                  plan.highlight
                    ? "border-indigo-500 shadow-lg shadow-indigo-100"
                    : isCurrent
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-(--color-border) bg-white"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                      Популярный
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                      Ваш тариф
                    </span>
                  </div>
                )}

                <h3 className="text-sm font-bold text-(--color-text) mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold text-(--color-text)">
                    {plan.price > 0 ? `${plan.price}₽` : "0₽"}
                  </span>
                  {plan.price > 0 && <span className="text-xs text-(--color-text-muted)">/мес</span>}
                </div>
                <p className="text-xs text-(--color-text-muted) mb-4">До {plan.posts} постов</p>

                <ul className="space-y-1.5 flex-1 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-(--color-text-secondary)">
                      <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  disabled={isCurrent}
                  onClick={() => alert("Для смены тарифа напишите в поддержку: @tg_buster_bot")}
                  className={`w-full rounded-xl py-2 text-xs font-semibold transition-colors ${
                    isCurrent
                      ? "bg-(--color-bg-subtle) text-(--color-text-muted) cursor-default"
                      : plan.highlight
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "border border-(--color-border) text-(--color-text) hover:bg-(--color-bg-subtle)"
                  }`}
                >
                  {isCurrent ? "Текущий" : "Выбрать"}
                </button>
              </div>
            )
          })}
        </div>

        <p className="mt-6 text-xs text-(--color-text-muted) text-center">
          Первые результаты в поиске — через 1–4 недели после индексации. Устойчивый рост трафика — через 2–4 месяца.
        </p>
      </div>
    </div>
  )
}
