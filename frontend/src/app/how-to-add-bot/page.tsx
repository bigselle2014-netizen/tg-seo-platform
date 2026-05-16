import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Как добавить бота в канал — Post SEO",
  description: "Пошаговая инструкция по добавлению @tg_buster_bot как администратора в ваш Telegram-канал.",
}

const STEPS = [
  {
    num: 1,
    title: "Откройте настройки канала",
    desc: "Зайдите в Telegram, откройте свой канал, нажмите на название канала вверху — откроется профиль. Нажмите «Изменить» или три точки → «Управление каналом».",
  },
  {
    num: 2,
    title: "Перейдите в Администраторы",
    desc: "В настройках канала найдите раздел «Администраторы» и нажмите «Добавить администратора».",
  },
  {
    num: 3,
    title: "Найдите @tg_buster_bot",
    desc: "В строке поиска введите @tg_buster_bot. Выберите бота из результатов.",
  },
  {
    num: 4,
    title: "Выдайте право публикации и сохраните",
    desc: "Включите право «Публикация сообщений» — остальные можно оставить выключенными. Нажмите «Сохранить».",
  },
]

export default function HowToAddBotPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Навигация */}
      <nav
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-bg)",
        }}
      >
        <div
          style={{
            maxWidth: 640,
            margin: "0 auto",
            padding: "0 16px",
            height: 56,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
              color: "var(--color-text-secondary)",
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>←</span>
            <span>Post SEO</span>
          </Link>
        </div>
      </nav>

      {/* Контент */}
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "48px 16px 64px",
        }}
      >
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1.25,
            color: "var(--color-text)",
            marginBottom: 8,
          }}
        >
          Как добавить бота в канал
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "var(--color-text-secondary)",
            marginBottom: 40,
            lineHeight: 1.6,
          }}
        >
          Нужно добавить @tg_buster_bot как администратора с правом публикации сообщений.
          Это единственное право — остальные не нужны.
        </p>

        {/* Шаги */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {STEPS.map((step) => (
            <div
              key={step.num}
              style={{
                display: "flex",
                gap: 16,
                background: "var(--color-bg-subtle)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                padding: "20px 20px",
              }}
            >
              {/* Номер */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--color-primary)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 15,
                  flexShrink: 0,
                }}
              >
                {step.num}
              </div>

              {/* Текст */}
              <div>
                <p
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    color: "var(--color-text)",
                    marginBottom: 6,
                  }}
                >
                  {step.title}
                </p>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Подсказка */}
        <div
          style={{
            marginTop: 24,
            padding: "16px 20px",
            background: "var(--color-success-subtle)",
            border: "1px solid #A7F3D0",
            borderRadius: "var(--radius-md)",
            fontSize: 14,
            color: "#065F46",
            lineHeight: 1.6,
          }}
        >
          После добавления бот автоматически получит уведомление и пришлёт вам доступ в панель управления.
        </div>

        {/* Кнопка */}
        <div style={{ marginTop: 40 }}>
          <a
            href="https://t.me/tg_buster_bot"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "14px 28px",
              background: "var(--color-primary)",
              color: "#fff",
              borderRadius: "var(--radius-md)",
              fontWeight: 600,
              fontSize: 15,
              textDecoration: "none",
              boxShadow: "var(--shadow-md)",
              minHeight: 48,
            }}
          >
            Открыть бота →
          </a>
        </div>
      </div>
    </main>
  )
}
