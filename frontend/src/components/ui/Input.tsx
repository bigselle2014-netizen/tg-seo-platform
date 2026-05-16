import { InputHTMLAttributes, forwardRef } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = "", id, ...props },
  ref
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-(--color-text-secondary) mb-1.5"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        {...props}
        className={[
          "w-full border border-(--color-border) rounded-[10px] px-3 py-2.5",
          "text-sm text-(--color-text) bg-white min-h-[40px]",
          "placeholder:text-(--color-text-placeholder)",
          "focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:ring-offset-0",
          "focus:border-(--color-primary) transition-colors duration-150",
          "disabled:opacity-50 disabled:bg-(--color-bg-subtle) disabled:cursor-not-allowed",
          error ? "border-(--color-danger) focus:ring-(--color-danger)" : "",
          className,
        ].join(" ")}
      />
      {error && (
        <p className="mt-1 text-xs text-(--color-danger)">{error}</p>
      )}
    </div>
  )
})
