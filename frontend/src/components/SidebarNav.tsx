"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, Users, BarChart2, CreditCard, Settings } from "lucide-react"

const NAV_ITEMS = [
  { href: "posts",    label: "Публикации",        Icon: FileText },
  { href: "team",     label: "Команда",           Icon: Users },
  { href: "analytics",label: "Аналитика",         Icon: BarChart2 },
  { href: "billing",  label: "Тарифы",            Icon: CreditCard },
  { href: "settings", label: "Настройки",         Icon: Settings },
]

export function SidebarNav({ channelId }: { channelId: string }) {
  const pathname = usePathname()

  return (
    <nav className="space-y-0.5">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const fullHref = `/dashboard/channels/${channelId}/${href}`
        const isActive = pathname === fullHref || pathname.startsWith(fullHref + "/")
        return (
          <Link
            key={href}
            href={fullHref}
            className={[
              "flex items-center gap-2.5 px-3 py-2 text-sm rounded-[10px] transition-colors",
              isActive
                ? "bg-(--color-primary-subtle) text-(--color-primary) font-medium"
                : "text-(--color-text-secondary) hover:bg-(--color-bg-subtle) hover:text-(--color-text)",
            ].join(" ")}
          >
            <Icon size={16} className="shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
