import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import "./globals.css"

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
  variable: "--ff-inter",
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://post-seo.seo-rezult.ru"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Post SEO — SEO-платформа для Telegram-каналов",
    template: "%s | Post SEO",
  },
  description:
    "Превращаем посты Telegram-каналов в SEO-оптимизированные веб-страницы. Получайте органический трафик из Google и Яндекс.",
  verification: {
    google: "VVDgN5Z0OUxLIfc0XR9seTlod17a1lTEklqGEkAouKY",
    yandex: "26d8a36501a7340a",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className={`${inter.className} ${inter.variable} min-h-full flex flex-col`}>
        {children}
        <Script id="ym" strategy="afterInteractive">{`
          (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
          m[i].l=1*new Date();
          for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
          (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
          ym(109188426,"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});
        `}</Script>
        <noscript>
          <div><img src="https://mc.yandex.ru/watch/109188426" style={{position:"absolute",left:"-9999px"}} alt="" /></div>
        </noscript>
      </body>
    </html>
  )
}
