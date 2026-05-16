"use client"

interface ToggleProps {
  checked: boolean
  onChange: (val: boolean) => void
  disabled?: boolean
  label?: string
  description?: string
}

export function Toggle({ checked, onChange, disabled, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      {(label || description) && (
        <div>
          {label && (
            <p className="text-sm font-medium text-(--color-text)">{label}</p>
          )}
          {description && (
            <p className="text-xs text-(--color-text-muted) mt-0.5">{description}</p>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={[
          "relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none",
          "focus:ring-2 focus:ring-(--color-primary) focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed shrink-0",
          checked ? "bg-(--color-primary)" : "bg-slate-300",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </button>
    </div>
  )
}
