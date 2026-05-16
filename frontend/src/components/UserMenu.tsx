"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { LogOut, User } from "lucide-react"

interface Props {
  name: string
  email: string
  initials: string
}

export function UserMenu({ name, email, initials }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className="p-3 border-t border-(--color-border) relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 rounded-[10px] hover:bg-(--color-bg-subtle) p-1.5 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-(--color-bg-muted) flex items-center justify-center text-xs font-bold text-(--color-text-secondary) shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-xs font-semibold text-(--color-text) truncate">{name}</p>
          <p className="text-xs text-(--color-text-muted) truncate">{email}</p>
        </div>
        <svg className={["w-4 h-4 text-(--color-text-muted) shrink-0 transition-transform", open ? "rotate-180" : ""].join(" ")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-14 left-3 right-3 bg-white border border-(--color-border) rounded-[12px] shadow-(--shadow-lg) py-1 z-50">
          <Link
            href="/dashboard/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-(--color-text) hover:bg-(--color-bg-subtle) transition-colors"
          >
            <User size={14} className="text-(--color-text-muted)" />
            Настройки профиля
          </Link>
          <div className="border-t border-(--color-border-subtle) mx-2 my-1" />
          <form action="/api/auth/sign-out" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-(--color-danger, #ef4444) hover:bg-red-50 transition-colors"
            >
              <LogOut size={14} />
              Выйти
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
