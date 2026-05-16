"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function ActivateButton({ channelId }: { channelId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleActivate() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/channels/${channelId}/manual-activate`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Ошибка активации")
      } else {
        router.refresh()
      }
    } catch {
      setError("Ошибка соединения")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={handleActivate}
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Проверяем..." : "Я добавил бота — активировать"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
