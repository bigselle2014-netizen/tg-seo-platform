"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

type MessengerType = "telegram" | "max"

export default function AddChannelPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [messengerType, setMessengerType] = useState<MessengerType>("telegram")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const clean = username.replace("@", "").trim()

    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: clean, messengerType }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Ошибка добавления")
      setLoading(false)
      return
    }

    router.push("/dashboard")
  }

  const isTg = messengerType === "telegram"
  const botName = isTg ? "@tg_buster_bot" : "@id701745447807_3_bot"
  const accentColor = isTg ? "blue" : "orange"

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Добавить канал</h1>

      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-2">Тип мессенджера</p>
        <div className="flex gap-3">
          {(["telegram", "max"] as MessengerType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMessengerType(type)}
              className={`flex-1 rounded-lg border-2 py-2.5 text-sm font-semibold transition-colors ${
                messengerType === type
                  ? type === "telegram"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {type === "telegram" ? "Telegram" : "MAX"}
            </button>
          ))}
        </div>
      </div>

      <div className={`rounded-lg p-4 mb-6 ${isTg ? "bg-blue-50 border border-blue-200" : "bg-orange-50 border border-orange-200"}`}>
        <h2 className={`font-semibold mb-2 ${isTg ? "text-blue-900" : "text-orange-900"}`}>Как подключить канал:</h2>
        <ol className={`text-sm space-y-1 list-decimal list-inside ${isTg ? "text-blue-800" : "text-orange-800"}`}>
          <li>Добавьте бота <strong>{botName}</strong> в администраторы канала</li>
          <li>Права: только чтение (разрешения по умолчанию)</li>
          <li>Введите username канала ниже и нажмите «Подключить»</li>
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username канала
          </label>
          <div className="flex">
            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">@</span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={isTg ? "channelname" : "channelname"}
              required
              className={`w-full rounded-r-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                isTg ? "focus:ring-blue-500" : "focus:ring-orange-500"
              }`}
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className={`w-full rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50 ${
            isTg ? "bg-blue-600 hover:bg-blue-700" : "bg-orange-500 hover:bg-orange-600"
          }`}
        >
          {loading ? "Подключаем..." : "Подключить канал"}
        </button>
      </form>
    </div>
    </div>
  )
}
