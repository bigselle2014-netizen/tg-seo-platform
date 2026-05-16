"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Toggle } from "@/components/ui/Toggle"
import { Skeleton } from "@/components/ui/Skeleton"
import { CheckCircle, XCircle, RotateCw, BarChart2, Trash2 } from "lucide-react"

interface ChannelSettings {
  id: string
  channelUsername: string
  channelTitle: string | null
  channelTgId: string | null
  botIsAdmin: boolean
  status: string
  autoPublish: boolean
  autoPublishDelay: number
  messengerType: string
}

const DELAY_OPTIONS = [
  { value: 0, label: "Без задержки" },
  { value: 10, label: "10 мин" },
  { value: 30, label: "30 мин" },
  { value: 60, label: "1 час" },
  { value: 120, label: "2 часа" },
]

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [settings, setSettings] = useState<ChannelSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activating, setActivating] = useState(false)
  const [activateMsg, setActivateMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    fetch(`/api/channels/${id}/settings`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setSettings(d))
  }, [id])

  async function save(patch: Partial<ChannelSettings>) {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/channels/${id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        const updated = await res.json()
        setSettings(updated)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleActivate() {
    setActivating(true)
    setActivateMsg(null)
    try {
      const res = await fetch(`/api/channels/${id}/manual-activate`, { method: "POST" })
      const json = await res.json()
      if (res.ok && json.ok) {
        setSettings((prev) => prev ? { ...prev, botIsAdmin: true, status: "active" } : prev)
        setActivateMsg({ ok: true, text: "Бот подтверждён! Канал активирован." })
      } else {
        setActivateMsg({ ok: false, text: json.error || "Бот не найден как администратор. Убедитесь что добавили бота с правами публикации." })
      }
    } catch {
      setActivateMsg({ ok: false, text: "Ошибка соединения. Попробуйте ещё раз." })
    } finally {
      setActivating(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/channels/${id}`, { method: "DELETE" })
    router.push("/dashboard")
  }

  if (!settings) {
    return (
      <div className="flex flex-col">
        <div className="border-b border-(--color-border) bg-white px-6 py-4">
          <h1 className="text-xl font-semibold text-(--color-text)">Настройки</h1>
          <p className="text-sm text-(--color-text-muted) mt-0.5">Управление информацией и настройками канала</p>
        </div>
        <div className="p-6 max-w-2xl flex flex-col gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-[14px] border border-(--color-border) p-6 shadow-(--shadow-sm)">
              <Skeleton className="h-4 w-40 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Шапка */}
      <div className="border-b border-(--color-border) bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-(--color-text)">Настройки</h1>
        <p className="text-sm text-(--color-text-muted) mt-0.5">Управление информацией и настройками канала</p>
      </div>

      <div className="p-6 max-w-2xl flex flex-col gap-5">
        {/* Информация о канале */}
        <div className="bg-white rounded-[14px] border border-(--color-border) p-6 shadow-(--shadow-sm)">
          <h2 className="text-sm font-semibold text-(--color-text) mb-1">Информация о канале</h2>
          <p className="text-xs text-(--color-text-muted) mb-5">Основные данные вашего канала</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-(--color-text-secondary) mb-1.5">
                Название канала
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-(--color-bg-subtle) rounded-[10px] border border-(--color-border) text-sm text-(--color-text)">
                <span className="flex-1 truncate">{settings.channelTitle || `@${settings.channelUsername}`}</span>
                <span
                  className={[
                    "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                    settings.messengerType === "max"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-(--color-primary-subtle) text-blue-700",
                  ].join(" ")}
                >
                  {settings.messengerType === "max" ? "MAX" : "TG"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-(--color-text-secondary) mb-1.5">
                Username
              </label>
              <div className="px-3 py-2.5 bg-(--color-bg-subtle) rounded-[10px] border border-(--color-border) text-sm text-(--color-text-muted)">
                @{settings.channelUsername}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-(--color-text-secondary) mb-1.5">
                Статус бота
              </label>
              <div
                className={[
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-xs font-medium",
                  settings.botIsAdmin
                    ? "bg-(--color-success-subtle) text-emerald-700"
                    : "bg-(--color-warning-subtle) text-amber-700",
                ].join(" ")}
              >
                {settings.botIsAdmin
                  ? <CheckCircle size={14} />
                  : <XCircle size={14} />
                }
                {settings.botIsAdmin ? "Бот добавлен как администратор" : "Бот не добавлен"}
              </div>

              {!settings.botIsAdmin && (
                <div className="mt-3 space-y-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleActivate}
                    disabled={activating}
                  >
                    {activating ? (
                      <><RotateCw size={13} className="animate-spin" /> Проверяем...</>
                    ) : (
                      <><RotateCw size={13} /> Проверить — бот добавлен</>
                    )}
                  </Button>
                  {activateMsg && (
                    <p className={[
                      "text-xs px-3 py-2 rounded-[10px]",
                      activateMsg.ok
                        ? "bg-(--color-success-subtle) text-emerald-700"
                        : "bg-(--color-danger-subtle) text-red-700",
                    ].join(" ")}>
                      {activateMsg.text}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Настройки публикации */}
        <div className="bg-white rounded-[14px] border border-(--color-border) p-6 shadow-(--shadow-sm)">
          <h2 className="text-sm font-semibold text-(--color-text) mb-1">Настройки публикации</h2>
          <p className="text-xs text-(--color-text-muted) mb-5">Управление автоматической публикацией постов</p>

          <div className="space-y-5">
            {/* Автопубликация */}
            <Toggle
              checked={settings.autoPublish}
              onChange={(val) => save({ autoPublish: val })}
              disabled={saving}
              label="Автоматическая публикация"
              description="Новые посты автоматически отправляются на индексацию"
            />

            {/* Разделитель */}
            {settings.autoPublish && (
              <>
                <div className="border-t border-(--color-border-subtle) -mx-6" />
                <div>
                  <p className="text-sm font-medium text-(--color-text) mb-1">Задержка публикации</p>
                  <p className="text-xs text-(--color-text-muted) mb-3">
                    Время ожидания перед отправкой поста на индексацию
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {DELAY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => save({ autoPublishDelay: opt.value })}
                        disabled={saving}
                        className={[
                          "px-3 py-1.5 rounded-[10px] text-xs font-medium border transition-colors disabled:opacity-50 min-h-[32px]",
                          settings.autoPublishDelay === opt.value
                            ? "bg-(--color-primary) border-(--color-primary) text-white"
                            : "border-(--color-border) text-(--color-text-secondary) hover:border-(--color-primary-border) hover:bg-(--color-bg-subtle)",
                        ].join(" ")}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {saved && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-(--color-success-subtle) px-3 py-2 rounded-[10px]">
                <CheckCircle size={14} />
                Настройки сохранены
              </div>
            )}
          </div>
        </div>

        {/* SEO-аудит */}
        <div className="bg-white rounded-[14px] border border-(--color-border) p-6 shadow-(--shadow-sm)">
          <h2 className="text-sm font-semibold text-(--color-text) mb-1">SEO-аудит канала</h2>
          <p className="text-xs text-(--color-text-muted) mb-5">Проанализируйте канал для поисковых систем</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => alert("SEO-аудит будет доступен в следующей версии")}
          >
            <BarChart2 size={14} />
            Открыть отчёт
          </Button>
        </div>

        {/* Опасная зона */}
        <div className="bg-white rounded-[14px] border border-red-200 p-6 shadow-(--shadow-sm)">
          <h2 className="text-sm font-semibold text-red-700 mb-1">Опасная зона</h2>
          <p className="text-xs text-(--color-text-muted) mb-5">Необратимые действия с каналом</p>

          {!confirmDelete ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={14} />
              Удалить канал
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-red-700 font-medium">
                Все данные канала <strong>@{settings.channelUsername}</strong> будут удалены навсегда.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Отмена
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Удаляем..." : "Удалить навсегда"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
