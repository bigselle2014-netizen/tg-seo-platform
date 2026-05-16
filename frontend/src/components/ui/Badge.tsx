import { ReactNode } from "react"

type BadgeStatus = "success" | "warning" | "danger" | "info" | "neutral"

interface BadgeProps {
  status?: BadgeStatus
  children: ReactNode
  dot?: boolean
  className?: string
}

const statusStyles: Record<BadgeStatus, string> = {
  success: "bg-(--color-success-subtle) text-emerald-700",
  warning: "bg-(--color-warning-subtle) text-amber-700",
  danger:  "bg-(--color-danger-subtle)  text-red-700",
  info:    "bg-(--color-primary-subtle) text-blue-700",
  neutral: "bg-(--color-bg-muted)       text-slate-600",
}

const dotColors: Record<BadgeStatus, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-400",
  danger:  "bg-red-500",
  info:    "bg-blue-400",
  neutral: "bg-slate-400",
}

export function Badge({
  status = "neutral",
  dot = false,
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        statusStyles[status],
        className,
      ].join(" ")}
    >
      {dot && (
        <span className={["w-1.5 h-1.5 rounded-full shrink-0", dotColors[status]].join(" ")} />
      )}
      {children}
    </span>
  )
}
