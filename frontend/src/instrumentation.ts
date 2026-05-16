export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    setTimeout(async () => {
      try {
        await fetch("http://localhost:3000/mini")
        console.log("[warm-up] /mini pre-warmed")
      } catch {}
    }, 5000)
  }
}
