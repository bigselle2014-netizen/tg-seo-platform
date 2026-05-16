import { HTMLAttributes, ReactNode } from "react"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "base" | "subtle"
  hover?: boolean
  children: ReactNode
}

export function Card({
  variant = "base",
  hover = false,
  className = "",
  children,
  ...props
}: CardProps) {
  const base =
    variant === "subtle"
      ? "bg-(--color-bg-subtle) border border-(--color-border-subtle)"
      : "bg-white border border-(--color-border) shadow-(--shadow-sm)"

  const hoverClass = hover
    ? "hover:shadow-(--shadow-md) hover:border-(--color-border) transition-shadow duration-200 cursor-pointer"
    : ""

  return (
    <div
      {...props}
      className={[
        "rounded-[14px] p-5",
        base,
        hoverClass,
        className,
      ].join(" ")}
    >
      {children}
    </div>
  )
}
