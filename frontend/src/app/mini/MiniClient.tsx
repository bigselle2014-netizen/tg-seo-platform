"use client"

import dynamic from "next/dynamic"

const MiniApp = dynamic(() => import("@/components/mini/MiniApp"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, height: "100vh", background: "#fff" }}>
      {[100, 80, 90, 60, 85].map((w, i) => (
        <div key={i} style={{ height: i === 0 ? 28 : 48, width: `${w}%`, borderRadius: 8, background: "#f0f0f0", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  ),
})

export default function MiniClient() {
  return <MiniApp />
}
