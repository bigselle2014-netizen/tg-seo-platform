"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ActivateButton } from "./ActivateButton"

type Channel = {
  id: string
  channelUsername: string
  channelTitle: string | null
  messengerType: "telegram" | "max"
  status: string
  botIsAdmin: boolean
  postsIndexed: number
  isArchived: boolean
}

export function ChannelCard({ channel: ch }: { channel: Channel }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loading, setLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function handleArchive() {
    setMenuOpen(false)
    setLoading(true)
    await fetch(`/api/channels/${ch.id}/archive`, { method: "POST" })
    setLoading(false)
    router.refresh()
  }

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/channels/${ch.id}`, { method: "DELETE" })
    setLoading(false)
    setConfirmDelete(false)
    router.refresh()
  }

  return (
    <>
      <div className="relative rounded-xl bg-white border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">@{ch.channelUsername}</h3>
            <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${
              ch.messengerType === "max"
                ? "bg-orange-100 text-orange-700"
                : "bg-blue-100 text-blue-700"
            }`}>
              {ch.messengerType === "max" ? "MAX" : "TG"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              ch.isArchived
                ? "bg-gray-100 text-gray-500"
                : ch.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
            }`}>
              {ch.isArchived ? "Архив" : ch.status === "active" ? "Активен" : "Ожидание"}
            </span>

            {/* Kebab menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                title="Действия"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-gray-100 bg-white shadow-lg py-1">
                  <button
                    onClick={handleArchive}
                    disabled={loading}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {ch.isArchived ? "Вернуть из архива" : "Архивировать"}
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Удалить
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {ch.channelTitle && (
          <p className="text-sm text-gray-600 mb-3 truncate">{ch.channelTitle}</p>
        )}
        <p className="text-sm text-gray-500">
          Проиндексировано: <strong>{ch.postsIndexed}</strong> постов
        </p>

        {!ch.botIsAdmin && !ch.isArchived && ch.messengerType === "telegram" && (
          <div className="mt-2">
            <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 mb-1">
              Добавьте <strong>@tg_buster_bot</strong> как администратора канала
            </p>
            <ActivateButton channelId={ch.id} />
          </div>
        )}
        {!ch.botIsAdmin && !ch.isArchived && ch.messengerType === "max" && (
          <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
            Добавьте @max_buster_bot как администратора в MAX
          </p>
        )}
      </div>

      {/* Модал подтверждения удаления */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Удалить канал?</h2>
            <p className="text-sm text-gray-600 mb-6">
              Канал <strong>@{ch.channelUsername}</strong> и все связанные данные будут удалены навсегда. Это действие нельзя отменить.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Удаляем..." : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
