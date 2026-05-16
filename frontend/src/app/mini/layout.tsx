import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Post SEO",
}

export default function MiniLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script src="https://telegram.org/js/telegram-web-app.js" />
      {children}
    </>
  )
}
