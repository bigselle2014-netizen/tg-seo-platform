"use client"

import { useEffect, useState, useRef } from "react"

export function TelegramAuthButton({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  const [botUrl, setBotUrl] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "waiting" | "error">("loading")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch("/api/auth/telegram/init")
      .then((r) => r.json())
      .then((data) => {
        setBotUrl(data.botUrl)
        setToken(data.token)
        setStatus("ready")
      })
      .catch(() => setStatus("error"))
  }, [])

  function startPolling(t: string) {
    setStatus("waiting")
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/telegram/check?token=${t}`)
        const data = await res.json()
        if (data.status === "ok") {
          clearInterval(pollRef.current!)
          window.location.href = redirectTo
        } else if (data.status === "expired") {
          clearInterval(pollRef.current!)
          setStatus("error")
        }
      } catch {
        // keep polling
      }
    }, 2000)
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  function handleClick() {
    if (!botUrl || !token) return
    window.open(botUrl, "_blank", "noopener,noreferrer")
    startPolling(token)
  }

  return (
    <div className="w-full space-y-3">
      <button
        onClick={handleClick}
        disabled={status === "loading" || status === "error"}
        className="inline-flex items-center justify-center w-full px-4 py-3 text-base font-medium text-white bg-[#0088cc] border border-transparent rounded-md shadow-sm hover:bg-[#006699] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0088cc] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2" aria-hidden="true">
          <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/>
        </svg>
        {status === "loading" ? "Загрузка..." : "Войти через Telegram"}
      </button>

      {status === "waiting" && (
        <p className="text-xs text-center text-gray-500">
          Ожидаем подтверждения в Telegram...
        </p>
      )}
      {status === "error" && (
        <p className="text-xs text-center text-red-500">
          Ссылка устарела.{" "}
          <button
            className="underline"
            onClick={() => { setStatus("loading"); window.location.reload() }}
          >
            Обновить
          </button>
        </p>
      )}
    </div>
  )
}
