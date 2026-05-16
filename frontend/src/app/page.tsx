"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { CheckCircle, ArrowRight } from "lucide-react"

/* ─────────────────────────────────────────
   HOOKS
───────────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale")
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target) } }),
      { threshold: 0.08 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

function useTyping(words: string[], typingSpeed = 75, pauseMs = 1800) {
  const [displayed, setDisplayed] = useState(words[0])
  const [wordIdx, setWordIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const word = words[wordIdx]
    let t: ReturnType<typeof setTimeout>
    if (!deleting && displayed === word) t = setTimeout(() => setDeleting(true), pauseMs)
    else if (deleting && displayed === "") { setDeleting(false); setWordIdx((i) => (i + 1) % words.length) }
    else t = setTimeout(() => setDisplayed(deleting ? displayed.slice(0, -1) : word.slice(0, displayed.length + 1)), deleting ? 45 : typingSpeed)
    return () => clearTimeout(t)
  }, [displayed, deleting, wordIdx, words, typingSpeed, pauseMs, mounted])
  return displayed
}

function useCountUp(target: number, trigger: boolean, duration = 1800) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!trigger) return
    let start = 0
    const step = target / (duration / 16)
    const t = setInterval(() => { start += step; if (start >= target) { setCount(target); clearInterval(t) } else setCount(Math.floor(start)) }, 16)
    return () => clearInterval(t)
  }, [trigger, target, duration])
  return count
}

/* ─────────────────────────────────────────
   PIPELINE — главная визуализация
   Telegram пост → AI → Google SERP
───────────────────────────────────────── */
function Pipeline() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 0,
      flexWrap: "nowrap",
      width: "100%",
    }}>

      {/* ── 1. Телефон с Telegram-постом ── */}
      <div className="animate-slideInLeft delay-300" style={{flexShrink: 0}}>
        <div style={{
          width: 130,
          height: 240,
          border: "7px solid #0f172a",
          borderRadius: 24,
          background: "#efeff4",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)",
          position: "relative",
        }}>
          {/* Notch */}
          <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:36,height:12,background:"#0f172a",borderRadius:"0 0 9px 9px",zIndex:3}} />
          {/* Status bar */}
          <div style={{height:22,background:"#efeff4",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 10px",position:"relative",zIndex:2}}>
            <span style={{fontSize:8,fontWeight:700,color:"#0f172a"}}>9:41</span>
            <div style={{display:"flex",gap:3}}>
              {[3,3,3].map((h,i)=><div key={i} style={{width:2.5,height:h+i*1.5,background:"#0f172a",borderRadius:1}}/>)}
              <div style={{width:7,height:4.5,border:"1px solid #0f172a",borderRadius:1,marginLeft:3,position:"relative"}}>
                <div style={{position:"absolute",top:1,left:1,right:1,bottom:1,background:"#0f172a",borderRadius:0.5}}/>
              </div>
            </div>
          </div>
          {/* Telegram header */}
          <div style={{background:"#2AABEE",padding:"5px 8px",display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:26,height:26,borderRadius:"50%",background:"rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>📢</div>
            <div>
              <div style={{fontSize:9,fontWeight:700,color:"white"}}>SEO Результ</div>
              <div style={{fontSize:7.5,color:"rgba(255,255,255,0.75)"}}>12 821 подписчик</div>
            </div>
          </div>
          {/* Post */}
          <div style={{padding:"8px 8px 6px",display:"flex",flexDirection:"column",gap:6,background:"#efeff4",height:"calc(100% - 82px)"}}>
            <div style={{background:"white",borderRadius:12,padding:"8px 9px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
              <p style={{fontSize:9.5,lineHeight:1.5,margin:0,color:"#0f172a"}}>
                Как получить первых 10 000 читателей без рекламы — наш кейс за 90 дней 📈
              </p>
              <div style={{marginTop:6,height:42,borderRadius:6,background:"linear-gradient(135deg,#dbeafe,#ede9fe)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>📊</div>
              <span style={{fontSize:7.5,color:"#94a3b8",display:"block",marginTop:5}}>14:22 · 4 137 👁</span>
            </div>
            <div style={{background:"white",borderRadius:10,padding:"6px 9px",opacity:0.4}}>
              <div style={{height:6,background:"#e2e8f0",borderRadius:3,marginBottom:4}}/>
              <div style={{height:6,background:"#e2e8f0",borderRadius:3,width:"65%"}}/>
            </div>
          </div>
        </div>
        <p style={{textAlign:"center",fontSize:10,fontWeight:600,color:"#94a3b8",marginTop:8,letterSpacing:"0.02em"}}>
          Telegram-канал
        </p>
      </div>

      {/* ── Стрелка 1 ── */}
      <div className="animate-scaleIn delay-500" style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "0 16px", flexShrink: 0,
      }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          padding: "10px 16px", borderRadius: 16,
          background: "#f1f5f9", border: "1px solid #e2e8f0",
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
            boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
          }}>
            <span style={{fontSize: 14, fontWeight: 800, color: "white"}}>AI</span>
            <div style={{
              position: "absolute", inset: -5, borderRadius: "50%",
              border: "2px solid rgba(99,102,241,0.3)",
              animation: "pulseRing 2s ease-out infinite",
            }} />
            <div style={{
              position: "absolute", inset: -10, borderRadius: "50%",
              border: "1.5px solid rgba(99,102,241,0.15)",
              animation: "pulseRing 2s ease-out 0.7s infinite",
            }} />
          </div>
          <span style={{fontSize: 9, fontWeight: 700, color: "#6366f1", letterSpacing: "0.04em", whiteSpace: "nowrap"}}>
            пишет статью
          </span>
        </div>
        {/* Animated dots */}
        <div style={{display: "flex", gap: 4, marginTop: 6}}>
          {[0, 0.25, 0.5].map((delay, i) => (
            <div key={i} style={{
              width: 4, height: 4, borderRadius: "50%",
              background: "#6366f1",
              animation: `blob ${0.8}s ease-in-out ${delay}s infinite alternate`,
              opacity: 0.6,
            }} />
          ))}
        </div>
      </div>

      {/* ── 2. Google SERP — статья в топе ── */}
      <div className="animate-slideInRight delay-300" style={{flexShrink: 0, width: 260}}>
        <div style={{
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
          border: "1px solid #e2e8f0",
        }}>
          {/* Browser chrome */}
          <div style={{background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8}}>
            <div style={{display: "flex", gap: 4}}>
              {["#ff5f56","#febc2e","#27c93f"].map(c => (
                <div key={c} style={{width: 9, height: 9, borderRadius: "50%", background: c}} />
              ))}
            </div>
            <div style={{
              flex: 1, background: "white", borderRadius: 6, border: "1px solid #e2e8f0",
              padding: "4px 10px", display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="#94a3b8" strokeWidth="2"/><path d="m21 21-4.35-4.35" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/></svg>
              <span style={{fontSize: 9.5, color: "#64748b"}}>как набрать подписчиков telegram</span>
            </div>
          </div>

          {/* SERP content */}
          <div style={{background: "white", padding: "12px 14px"}}>
            {/* Yandex logo area */}
            <div style={{display: "flex", alignItems: "center", gap: 6, marginBottom: 10}}>
              <div style={{fontSize: 11, fontWeight: 800, color: "#fc3f1d", letterSpacing: "-0.5px"}}>Яндекс</div>
              <div style={{fontSize: 9, color: "#94a3b8"}}>Нашлось 2 млн результатов</div>
            </div>

            {/* Result #1 — ИХ СТАТЬЯ */}
            <div style={{
              borderRadius: 10,
              background: "linear-gradient(135deg, #f0fdf4, #f0f9ff)",
              border: "1.5px solid #bbf7d0",
              padding: "10px 12px",
              marginBottom: 8,
              position: "relative",
            }}>
              <div style={{
                position: "absolute", top: -1, right: 10,
                background: "#10b981", color: "white",
                fontSize: 8, fontWeight: 700, padding: "2px 8px",
                borderRadius: "0 0 6px 6px", letterSpacing: "0.04em",
              }}>
                #1
              </div>
              <div style={{fontSize: 8.5, color: "#16a34a", marginBottom: 3, fontWeight: 500}}>
                post-seo.seo-rezult.ru › seorezult › kak-poluchit-podpis...
              </div>
              <div style={{fontSize: 12, fontWeight: 700, color: "#1a0dab", marginBottom: 4, lineHeight: 1.3}}>
                Как получить 10 000 читателей без рекламы — кейс за 90 дней
              </div>
              <div style={{fontSize: 9.5, color: "#4d5156", lineHeight: 1.5}}>
                Разбираем стратегию роста Telegram-канала с 0 до 10 000 подписчиков без платного трафика...
              </div>
              {/* Views badge */}
              <div style={{marginTop: 6, display: "flex", gap: 8}}>
                <span style={{fontSize: 8.5, color: "#64748b"}}>👁 2 340 просмотров</span>
                <span style={{fontSize: 8.5, color: "#10b981", fontWeight: 600}}>● в индексе Яндекс</span>
              </div>
            </div>

            {/* Result #2 — серый, чужой */}
            {[
              "10 способов привлечь подписчиков в Telegram | mediablog.ru",
              "Продвижение Telegram-каналов в 2025 году — tgstat.com",
            ].map((title, i) => (
              <div key={i} style={{padding: "8px 4px", borderBottom: i === 0 ? "1px solid #f1f5f9" : "none", opacity: 0.55}}>
                <div style={{fontSize: 8, color: "#888", marginBottom: 2}}>
                  {i === 0 ? "mediablog.ru" : "tgstat.com"} ›
                </div>
                <div style={{fontSize: 10.5, color: "#1a0dab", fontWeight: 500}}>{title}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  )
}

/* ─────────────────────────────────────────
   MARQUEE
───────────────────────────────────────── */
const CHANNELS = [
  "Маркетинг без воды", "SEO Мастер", "Growth Hacking", "Digital Marketing RU",
  "Инфобизнес 2.0", "Telegram Growth", "Контент Лаборатория", "SEO & Трафик",
  "Бизнес по-русски", "Канал о продажах", "Стартап Академия", "Без рекламы",
]

function ChannelMarquee() {
  const doubled = [...CHANNELS, ...CHANNELS]
  return (
    <div style={{overflow: "hidden", maskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)"}}>
      <div className="animate-marquee" style={{display: "flex", gap: 12, width: "max-content"}}>
        {doubled.map((name, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "7px 14px",
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 100,
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            flexShrink: 0,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
              background: `hsl(${(i * 43) % 360}, 60%, 62%)`,
            }} />
            <span style={{fontSize: 11.5, fontWeight: 500, color: "#334155", whiteSpace: "nowrap"}}>
              @{name.toLowerCase().replace(/ /g, "_")}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   STAT COUNTER
───────────────────────────────────────── */
function StatCounter({ target, suffix, label, dark }: { target: number; suffix: string; label: string; dark?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [triggered, setTriggered] = useState(false)
  const count = useCountUp(target, triggered)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setTriggered(true); io.disconnect() } }, { threshold: 0.5 })
    io.observe(el); return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} style={{textAlign: "center"}}>
      <div style={{
        fontSize: "clamp(2.2rem, 5vw, 3.5rem)", fontWeight: 800, lineHeight: 1,
        letterSpacing: "-0.03em",
        color: dark ? "white" : "#0f172a",
      }}>
        {count.toLocaleString("ru")}{suffix}
      </div>
      <div style={{fontSize: 12, color: dark ? "rgba(255,255,255,0.45)" : "#94a3b8", marginTop: 6, fontWeight: 500}}>
        {label}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   PLANS
───────────────────────────────────────── */
const PLANS = [
  { name: "Free", price: "0 ₽", sub: "навсегда", features: ["1 канал", "До 20 постов", "IndexNow", "Базовый SEO"], featured: false, cta: "Начать бесплатно" },
  { name: "Hobby", price: "490 ₽", sub: "в месяц", features: ["3 канала", "До 200 постов", "SERP-анализ", "Аналитика трафика", "Приоритетная поддержка"], featured: true, cta: "Выбрать Hobby" },
  { name: "Pro", price: "1 490 ₽", sub: "в месяц", features: ["10 каналов", "Безлимит постов", "Глубокий SERP", "API доступ", "Командный доступ"], featured: false, cta: "Выбрать Pro" },
]

/* ─────────────────────────────────────────
   PAGE
───────────────────────────────────────── */
export default function HomePage() {
  useReveal()
  const word = useTyping(["находят", "читают", "подписываются", "растут"], 70, 2000)

  return (
    <main style={{overflowX: "hidden", background: "white"}}>

      {/* ══ NAV ══ */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid #f1f5f9",
        boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
      }}>
        <div style={{maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between"}}>
          <Link href="/" style={{display: "flex", alignItems: "center", gap: 8, textDecoration: "none"}}>
            <div style={{width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg,#6366f1,#8b5cf6)"}} />
            <span style={{fontSize: 15, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px"}}>Post SEO</span>
          </Link>
          <div style={{display: "flex", alignItems: "center", gap: 12}}>
            <Link href="/blog" style={{fontSize: 13, color: "#64748b", textDecoration: "none", padding: "6px 12px"}}>
              Блог
            </Link>
            <Link href="/auth/sign-in" style={{fontSize: 13, color: "#64748b", textDecoration: "none", padding: "6px 12px"}}>
              Войти
            </Link>
            <Link href="/auth/sign-up" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 18px", borderRadius: 10,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              fontSize: 13, fontWeight: 600, color: "white", textDecoration: "none",
              boxShadow: "0 2px 12px rgba(99,102,241,0.35)",
            }}>
              Начать бесплатно
            </Link>
          </div>
        </div>
      </nav>

      {/* ══ HERO — светлый ══ */}
      <section style={{
        background: "linear-gradient(180deg, #fafbff 0%, #f5f7ff 40%, #ffffff 100%)",
        padding: "64px 24px 80px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Subtle blobs */}
        <div className="animate-blob" style={{
          position: "absolute", top: -120, right: "5%",
          width: 480, height: 480,
          background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div className="animate-blob delay-2000" style={{
          position: "absolute", bottom: -80, left: "0%",
          width: 400, height: 400,
          background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Split: текст слева, визуализация справа */}
        <div style={{
          maxWidth: 1160, margin: "0 auto", position: "relative", zIndex: 2,
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px 56px", alignItems: "center",
        }}>

          {/* ── ЛЕВАЯ КОЛОНКА: УТП ── */}
          <div style={{display: "flex", flexDirection: "column", alignItems: "flex-start"}}>

            <div className="animate-fadeInDown" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 14px", borderRadius: 100,
              background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)",
              fontSize: 12, fontWeight: 600, color: "#6366f1", marginBottom: 24,
            }}>
              <div style={{width: 6, height: 6, borderRadius: "50%", background: "#6366f1"}} />
              Бесплатно в период бета-тестирования
            </div>

            <h1 className="animate-fadeInUp delay-100" style={{
              fontSize: "clamp(2rem, 3.2vw, 3rem)",
              fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.04em",
              color: "#0f172a", margin: "0 0 16px",
            }}>
              Читатели находят<br />ваш канал{" "}
              <span style={{
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #3b82f6 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
                {word || " "}
              </span>
              <span style={{color: "#6366f1", animation: "typing-cursor 1s step-end infinite"}}>|</span>
              <br />через поиск
            </h1>

            <p className="animate-fadeInUp delay-200" style={{
              fontSize: "clamp(0.95rem, 1.5vw, 1.05rem)",
              color: "#64748b", margin: "0 0 32px", lineHeight: 1.7, maxWidth: 420,
            }}>
              Каждый пост в Telegram-канале автоматически превращается в SEO-статью.
              Яндекс и Google приводят новых подписчиков — без рекламы.
            </p>

            <div className="animate-fadeInUp delay-300" style={{display: "flex", gap: 12, flexWrap: "wrap"}}>
              <Link href="/auth/sign-up" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "13px 24px", borderRadius: 12,
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                fontSize: 15, fontWeight: 700, color: "white", textDecoration: "none",
                boxShadow: "0 6px 24px rgba(99,102,241,0.4)",
              }}>
                Подключить канал <ArrowRight size={16} />
              </Link>
              <Link href="/auth/sign-up" style={{
                display: "inline-flex", alignItems: "center",
                padding: "13px 20px", borderRadius: 12,
                background: "white", border: "1.5px solid #e2e8f0",
                fontSize: 15, fontWeight: 600, color: "#475569", textDecoration: "none",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}>
                Аудит канала
              </Link>
            </div>

            <div className="animate-fadeInUp delay-400" style={{
              display: "flex", gap: 16, flexWrap: "wrap",
              marginTop: 20, fontSize: 12, fontWeight: 500, color: "#94a3b8",
            }}>
              {["✓ 150+ каналов", "✓ Результат за 24 часа", "✓ Без карты"].map(t => <span key={t}>{t}</span>)}
            </div>
          </div>

          {/* ── ПРАВАЯ КОЛОНКА: PIPELINE ── */}
          <div className="animate-fadeInUp delay-200" style={{display: "flex", justifyContent: "center", alignItems: "center"}}>
            <Pipeline />
          </div>

        </div>
      </section>

      {/* ══ MARQUEE ══ */}
      <section style={{background: "#f8fafc", padding: "28px 0 24px", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9"}}>
        <p style={{textAlign: "center", fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16}}>
          Каналы которые уже получают трафик
        </p>
        <ChannelMarquee />
      </section>

      {/* ══ КАК РАБОТАЕТ ══ */}
      <section style={{background: "white", padding: "72px 0 80px"}}>
        <div style={{maxWidth: 1100, margin: "0 auto", padding: "0 24px"}}>
          <div className="reveal" style={{marginBottom: 52, textAlign: "center"}}>
            <p style={{fontSize: 11, fontWeight: 700, color: "#6366f1", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10}}>Как это работает</p>
            <h2 style={{fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "#0f172a", margin: 0}}>
              Три шага до органического трафика
            </h2>
          </div>
          <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: 20}}>

            {/* Step 1 */}
            <div className="reveal-left" style={{
              background: "linear-gradient(135deg,#f8faff,#f0f4ff)",
              border: "1px solid #e0e7ff", borderRadius: 20, padding: "32px 28px",
            }}>
              <div style={{fontSize: 48, fontWeight: 900, color: "rgba(99,102,241,0.15)", lineHeight: 1, marginBottom: 16}}>01</div>
              <h3 style={{fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 8px"}}>Подключите канал</h3>
              <p style={{fontSize: 13, color: "#64748b", lineHeight: 1.65, margin: 0}}>
                Добавьте бота администратором. Он импортирует все посты — новые и старые — за 2 минуты.
              </p>
              <div style={{marginTop: 20, padding: "10px 14px", background: "white", borderRadius: 10, border: "1px solid #e0e7ff", fontSize: 11, color: "#6366f1", fontWeight: 600}}>
                🤖 Бот активирован · 247 постов найдено
              </div>
            </div>

            {/* Step 2 */}
            <div className="reveal" style={{transitionDelay: "0.12s",
              background: "#0f172a", borderRadius: 20, padding: "32px 28px", position: "relative", overflow: "hidden",
            }}>
              <div style={{position: "absolute", top: -40, right: -40, width: 160, height: 160, background: "radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 70%)"}} />
              <div style={{fontSize: 48, fontWeight: 900, color: "rgba(99,102,241,0.2)", lineHeight: 1, marginBottom: 16}}>02</div>
              <h3 style={{fontSize: 18, fontWeight: 700, color: "white", margin: "0 0 8px"}}>AI пишет статью</h3>
              <p style={{fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.65, margin: 0}}>
                Анализирует топ-20 Яндекса, подбирает LSI-ключи, пишет уникальную статью 800–2000 слов.
              </p>
              <div style={{marginTop: 20, padding: "10px 14px", background: "rgba(99,102,241,0.12)", borderRadius: 10, border: "1px solid rgba(99,102,241,0.2)", fontSize: 11, color: "#a5b4fc", fontWeight: 600}}>
                ⚡ Среднее время: 3–5 минут
              </div>
            </div>

            {/* Step 3 */}
            <div className="reveal-right" style={{transitionDelay: "0.22s",
              background: "linear-gradient(135deg,#ecfdf5,#f0fdf4)",
              border: "1px solid #bbf7d0", borderRadius: 20, padding: "32px 28px",
            }}>
              <div style={{fontSize: 48, fontWeight: 900, color: "rgba(16,185,129,0.2)", lineHeight: 1, marginBottom: 16}}>03</div>
              <h3 style={{fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 8px"}}>Яндекс индексирует</h3>
              <p style={{fontSize: 13, color: "#64748b", lineHeight: 1.65, margin: 0}}>
                IndexNow моментально уведомляет поисковики. Статья появляется в выдаче и приводит новых читателей.
              </p>
              <div style={{display: "flex", gap: 6, marginTop: 20, flexWrap: "wrap"}}>
                {["Яндекс", "Google", "Bing"].map(e => (
                  <span key={e} style={{padding: "4px 10px", borderRadius: 100, background: "white", border: "1px solid #bbf7d0", fontSize: 11, fontWeight: 600, color: "#059669"}}>{e}</span>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ STATS — тёмная секция с косым срезом ══ */}
      <section style={{
        background: "#0f172a",
        clipPath: "polygon(0 6%, 100% 0, 100% 94%, 0 100%)",
        padding: "100px 24px 120px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.12) 0%, transparent 70%)", pointerEvents: "none"}} />
        <div style={{maxWidth: 900, margin: "0 auto", position: "relative"}}>
          <div className="reveal" style={{textAlign: "center", marginBottom: 52}}>
            <h2 style={{fontSize: "clamp(1.5rem,3.5vw,2.25rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "white", margin: 0}}>
              Реальные результаты
            </h2>
          </div>
          <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 40}}>
            <StatCounter target={1240} suffix="+" label="статей опубликовано" dark />
            <StatCounter target={87} suffix="" label="каналов подключено" dark />
            <StatCounter target={34000} suffix="+" label="органических просмотров" dark />
            <StatCounter target={3} suffix=" мин" label="среднее время генерации" dark />
          </div>
        </div>
      </section>

      {/* ══ FEATURES BENTO ══ */}
      <section style={{background: "white", padding: "80px 0 72px"}}>
        <div style={{maxWidth: 1100, margin: "0 auto", padding: "0 24px"}}>
          <div className="reveal" style={{marginBottom: 48, textAlign: "center"}}>
            <h2 style={{fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "#0f172a", margin: 0}}>
              Всё включено
            </h2>
          </div>
          <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16}}>

            <div className="reveal-left" style={{
              gridColumn: "1 / 3",
              background: "linear-gradient(135deg,#0f172a,#1e1b4b)",
              borderRadius: 20, padding: "32px 36px", position: "relative", overflow: "hidden", minHeight: 180,
            }}>
              <div style={{position: "absolute", top: -60, right: -60, width: 240, height: 240, background: "radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 70%)"}} />
              <div style={{display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, padding: "4px 10px", borderRadius: 100, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)"}}>
                <span style={{fontSize: 10, color: "#a5b4fc", fontWeight: 700}}>AI · автоматически</span>
              </div>
              <h3 style={{fontSize: 20, fontWeight: 700, color: "white", margin: "0 0 8px"}}>SEO-оптимизированные статьи</h3>
              <p style={{fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.6}}>
                Анализируем топ-20 выдачи, подбираем LSI-ключи из реального SERP, создаём уникальный текст.
              </p>
            </div>

            <div className="reveal" style={{background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 20, padding: "28px"}}>
              <div style={{width: 44, height: 44, borderRadius: 12, marginBottom: 16, background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22}}>⚡</div>
              <h3 style={{fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px"}}>IndexNow</h3>
              <p style={{fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.6}}>Моментальное уведомление Яндекс и Bing о каждой новой статье.</p>
              <div style={{marginTop: 16, display: "flex", alignItems: "center", gap: 8}}>
                <div style={{position: "relative", width: 10, height: 10}}>
                  <div style={{width: 10, height: 10, borderRadius: "50%", background: "#10b981", position: "absolute"}} />
                  <div style={{width: 10, height: 10, borderRadius: "50%", background: "rgba(16,185,129,0.4)", position: "absolute", animation: "pulseRing 1.5s ease-out infinite"}} />
                </div>
                <span style={{fontSize: 11, color: "#10b981", fontWeight: 600}}>Пингую поисковики...</span>
              </div>
            </div>

            <div className="reveal" style={{transitionDelay: "0.1s", background: "linear-gradient(135deg,#faf5ff,#f3e8ff)", border: "1px solid #e9d5ff", borderRadius: 20, padding: "28px"}}>
              <div style={{width: 44, height: 44, borderRadius: 12, marginBottom: 16, background: "linear-gradient(135deg,#8b5cf6,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22}}>🤖</div>
              <h3 style={{fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px"}}>Автопубликация</h3>
              <p style={{fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.6}}>Новый пост → статья через 10 минут. Без ручного труда.</p>
            </div>

            <div className="reveal-right" style={{gridColumn: "2 / 4", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 20, padding: "28px 32px", display: "flex", alignItems: "center", gap: 32}}>
              <div style={{flex: 1}}>
                <div style={{width: 44, height: 44, borderRadius: 12, marginBottom: 16, background: "linear-gradient(135deg,#eff6ff,#dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22}}>📊</div>
                <h3 style={{fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px"}}>Аналитика трафика</h3>
                <p style={{fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.6}}>Видите просмотры из Google и Яндекса по каждой статье.</p>
              </div>
              <div style={{width: 120, flexShrink: 0}}>
                <svg width="120" height="50" viewBox="0 0 120 50">
                  <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.25"/><stop offset="100%" stopColor="#6366f1" stopOpacity="0"/></linearGradient></defs>
                  <path d="M0,45 L20,38 L40,30 L60,22 L80,12 L100,8 L120,4" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M0,45 L20,38 L40,30 L60,22 L80,12 L100,8 L120,4 L120,50 L0,50 Z" fill="url(#sg)"/>
                </svg>
                <div style={{fontSize: 11, color: "#6366f1", fontWeight: 700, textAlign: "right"}}>↑ +340%</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section style={{background: "#f8fafc", padding: "72px 0 80px"}}>
        <div style={{maxWidth: 960, margin: "0 auto", padding: "0 24px"}}>
          <div className="reveal" style={{textAlign: "center", marginBottom: 48}}>
            <h2 style={{fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "#0f172a", margin: "0 0 12px"}}>Простые тарифы</h2>
            <p style={{fontSize: 15, color: "#64748b", margin: 0}}>Начните бесплатно — переходите на платный когда будете готовы</p>
          </div>
          <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 16, alignItems: "center"}}>
            {PLANS.map((plan, i) => (
              <div key={plan.name} className="reveal" style={{
                transitionDelay: `${i * 0.1}s`,
                borderRadius: 20, padding: plan.featured ? "32px 28px" : "28px 24px",
                background: plan.featured ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "white",
                border: plan.featured ? "none" : "1px solid #e2e8f0",
                boxShadow: plan.featured ? "0 16px 48px rgba(99,102,241,0.3)" : "0 2px 8px rgba(0,0,0,0.04)",
                transform: plan.featured ? "scale(1.04)" : "scale(1)",
              }}>
                <div style={{fontSize: 11, fontWeight: 700, color: plan.featured ? "rgba(255,255,255,0.6)" : "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em"}}>{plan.name}</div>
                <div style={{display: "flex", alignItems: "baseline", gap: 4, marginBottom: 20}}>
                  <span style={{fontSize: 32, fontWeight: 800, color: plan.featured ? "white" : "#0f172a"}}>{plan.price}</span>
                  <span style={{fontSize: 13, color: plan.featured ? "rgba(255,255,255,0.5)" : "#94a3b8"}}>{plan.sub}</span>
                </div>
                <ul style={{listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10}}>
                  {plan.features.map(f => (
                    <li key={f} style={{display: "flex", alignItems: "center", gap: 8, fontSize: 13}}>
                      <CheckCircle size={14} style={{color: plan.featured ? "rgba(255,255,255,0.6)" : "#10b981", flexShrink: 0}} />
                      <span style={{color: plan.featured ? "rgba(255,255,255,0.85)" : "#475569"}}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/auth/sign-up" style={{
                  display: "block", textAlign: "center", padding: "10px 0", borderRadius: 10,
                  background: plan.featured ? "white" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color: plan.featured ? "#6366f1" : "white",
                  fontSize: 13, fontWeight: 700, textDecoration: "none",
                }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{
        background: "#0f172a",
        clipPath: "polygon(0 8%, 100% 0, 100% 100%, 0 100%)",
        padding: "120px 24px 80px",
        textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.15) 0%, transparent 65%)", pointerEvents: "none"}} />
        <div className="reveal" style={{position: "relative", maxWidth: 560, margin: "0 auto"}}>
          <h2 style={{fontSize: "clamp(1.75rem,4.5vw,2.75rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "white", margin: "0 0 16px", lineHeight: 1.15}}>
            Начните получать трафик сегодня
          </h2>
          <p style={{fontSize: 15, color: "rgba(255,255,255,0.45)", margin: "0 0 36px", lineHeight: 1.65}}>
            Подключите канал за 2 минуты. Бесплатно, без карты.
          </p>
          <Link href="/auth/sign-up" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "14px 32px", borderRadius: 12,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            fontSize: 16, fontWeight: 700, color: "white", textDecoration: "none",
            boxShadow: "0 10px 36px rgba(99,102,241,0.5)",
          }}>
            Подключить канал бесплатно <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{background: "#0f172a", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "28px 24px"}}>
        <div style={{maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16}}>
          <div style={{display: "flex", alignItems: "center", gap: 8}}>
            <div style={{width: 20, height: 20, borderRadius: 5, background: "linear-gradient(135deg,#6366f1,#8b5cf6)"}} />
            <span style={{fontSize: 13, color: "rgba(255,255,255,0.3)"}}>© 2026 Post SEO</span>
          </div>
          <div style={{display: "flex", gap: 24}}>
            {[["Поддержка","https://t.me/tg_buster_bot"],["Политика","/docs/privacy"],["Условия","/docs/terms"]].map(([label, href]) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{fontSize: 13, color: "rgba(255,255,255,0.3)", textDecoration: "none"}}>{label}</a>
            ))}
          </div>
        </div>
      </footer>

    </main>
  )
}
