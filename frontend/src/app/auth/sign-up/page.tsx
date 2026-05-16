"use client"

import Link from "next/link"
import { TelegramAuthButton } from "@/components/TelegramAuthButton"
import { ArrowLeft, Check } from "lucide-react"

function LeftPanel() {
  return (
    <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-600 to-violet-700 text-white">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded bg-white/20 border border-white/30 flex items-center justify-center">
          <div className="w-3.5 h-3.5 rounded-sm bg-white" />
        </div>
        <span className="font-bold text-lg">Post SEO</span>
      </div>

      <div>
        <blockquote className="text-2xl font-bold leading-snug mb-8">
          Превратите каждый пост в источник органического трафика
        </blockquote>

        <ul className="space-y-3">
          {[
            "Бесплатно в период бета-теста",
            "Результат через 24 часа",
            "Настройка за 10 минут",
          ].map((item) => (
            <li key={item} className="flex items-center gap-3 text-blue-100">
              <div className="w-5 h-5 rounded-full border border-blue-300/60 flex items-center justify-center shrink-0">
                <Check size={12} className="text-blue-200" />
              </div>
              <span className="text-sm">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl bg-white/10 border border-white/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
          <div className="flex-1 bg-white/10 rounded px-2 py-0.5 ml-1">
            <div className="h-2 bg-white/20 rounded w-32" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2.5 bg-white/20 rounded w-full" />
          <div className="h-2.5 bg-white/20 rounded w-3/4" />
          <div className="h-2.5 bg-white/15 rounded w-5/6" />
        </div>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <main className="min-h-screen grid md:grid-cols-2">
      <LeftPanel />

      <div className="flex flex-col justify-center p-8 md:p-16 bg-white">
        <div className="max-w-sm mx-auto w-full">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-(--color-text-muted) hover:text-(--color-text) transition-colors mb-10"
          >
            <ArrowLeft size={14} />
            На главную
          </Link>

          <h1 className="text-2xl font-bold text-(--color-text) mb-2">
            Создайте аккаунт
          </h1>
          <p className="text-sm text-(--color-text-muted) mb-8">
            Бесплатно — карта не нужна
          </p>

          <TelegramAuthButton />

          <p className="mt-8 text-xs text-(--color-text-muted) leading-relaxed text-center">
            Уже есть аккаунт?{" "}
            <Link href="/auth/sign-in" className="text-(--color-primary) hover:underline">
              Войдите
            </Link>
          </p>
          <p className="mt-3 text-xs text-(--color-text-placeholder) text-center leading-relaxed">
            Мы не получаем доступ к вашему каналу и не производим никаких действий по управлению.
          </p>
        </div>
      </div>
    </main>
  )
}
