import Link from "next/link"

const NAV = [
  { href: "/docs/how-it-works", label: "Как работает сервис" },
  { href: "/docs/moderation", label: "Модерация контента" },
  { href: "/docs/terms", label: "Условия использования" },
  { href: "/docs/privacy", label: "Политика конфиденциальности" },
  { href: "/docs/complaints", label: "Жалобы на контент" },
]

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Кабинет
          </Link>
          <span className="text-slate-300">·</span>
          <span className="text-sm font-semibold text-slate-800">Post SEO — Документация</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 flex gap-10">
        {/* Sidebar nav */}
        <aside className="w-52 shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Разделы</p>
          <nav className="space-y-1">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-white hover:text-slate-900 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs font-semibold text-blue-800 mb-1">Поддержка</p>
            <a href="https://t.me/tg_buster_bot" className="text-xs text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Написать в Telegram →
            </a>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-10 py-10
            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:mb-3
            [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-800 [&_h2]:mt-8 [&_h2]:mb-3
            [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-800 [&_h3]:mt-6 [&_h3]:mb-2
            [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-slate-700 [&_h4]:mt-4 [&_h4]:mb-2
            [&_p]:text-sm [&_p]:text-slate-600 [&_p]:leading-relaxed [&_p]:mb-3
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:mb-4
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_ol]:mb-4
            [&_li]:text-sm [&_li]:text-slate-600 [&_li]:leading-relaxed
            [&_a]:text-blue-600 [&_a]:hover:underline
            [&_blockquote]:border-l-4 [&_blockquote]:border-blue-200 [&_blockquote]:bg-blue-50 [&_blockquote]:pl-4 [&_blockquote]:py-3 [&_blockquote]:rounded-r-lg [&_blockquote]:my-4
            [&_blockquote_p]:mb-0 [&_blockquote_p]:text-blue-800
            [&_strong]:font-semibold [&_strong]:text-slate-800
          ">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
