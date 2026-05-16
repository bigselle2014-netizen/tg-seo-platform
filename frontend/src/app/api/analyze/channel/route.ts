import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

const WORKER_URL = process.env.WORKER_API_URL || "http://worker:8000"
const WORKER_SECRET = process.env.WORKER_SECRET || ""

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-worker-secret")
  if (!WORKER_SECRET || secret !== WORKER_SECRET) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  let channel_id: string | undefined
  try {
    const body = await req.json() as { channel_id?: string }
    channel_id = body.channel_id
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  if (!channel_id) {
    return Response.json({ ok: false, error: "channel_id is required" }, { status: 400 })
  }

  try {
    const res = await fetch(`${WORKER_URL}/analyze-channel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": WORKER_SECRET,
      },
      body: JSON.stringify({ channel_id: Number(channel_id) }),
    })

    if (!res.ok) {
      const text = await res.text()
      return Response.json({ ok: false, error: text }, { status: res.status })
    }

    const data = await res.json() as {
      topics: string[]
      keywords: string[]
      indexable_count: number
      focus_score: number
    }
    return Response.json(data)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal error"
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
