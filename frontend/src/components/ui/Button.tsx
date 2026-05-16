import { ButtonHTMLAttributes, ReactNode } from "react"

type Variant = "primary" | "secondary" | "ghost" | "danger"
type Size = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-(--color-primary) text-white hover:bg-(--color-primary-hover) shadow-(--shadow-sm) hover:shadow-(--shadow-md) hover:-translate-y-px",
  secondary:
    "bg-white border border-(--color-border) text-(--color-text) hover:bg-(--color-bg-subtle)",
  ghost:
    "bg-transparent text-(--color-text-secondary) hover:bg-(--color-bg-muted) hover:text-(--color-text)",
  danger:
    "bg-(--color-danger) text-white hover:bg-red-700",
}

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs min-h-[28px]",
  md: "px-4 py-2.5 text-sm min-h-[36px]",
  lg: "px-5 py-3 text-base min-h-[44px]",
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-2 font-medium rounded-[10px]",
        "transition-all duration-150 cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
        variantStyles[variant],
        sizeStyles[size],
        className,
      ].join(" ")}
    >
      {children}
    </button>
  )
}
