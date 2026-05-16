"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, Users, BarChart2, CreditCard, Settings } from "lucide-react"

const NAV_ITEMS = [
  { href: "posts",     label: "Публикации", Icon: FileText },
  { href: "team",      label: "Команда",    Icon: Users },
  { href: "analytics", label: "Аналитика",  Icon: BarChart2 },
  { href: "billing",   label: "Тарифы",     Icon: CreditCard },
  { href: "settings",  label: "Настройки",  Icon: Settings },
]

export function MobileNav({ channelId }: { channelId: string }) {
  const pathname = usePathname()

  return (
    <div className="overflow-x-auto">
      <div className="flex px-2 pb-2 pt-1 gap-0.5 min-w-max">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const fullHref = `/dashboard/channels/${channelId}/${href}`
          const isActive = pathname === fullHref || pathname.startsWith(fullHref + "/")
          return (
            <Link
              key={href}
              href={fullHref}
              className={[
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-[10px] transition-colors min-w-[60px]",
                isActive
                  ? "bg-(--color-primary-subtle) text-(--color-primary)"
                  : "text-(--color-text-muted) hover:bg-(--color-bg-subtle) hover:text-(--color-text)",
              ].join(" ")}
            >
              <Icon size={16} className="shrink-0" />
              <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
