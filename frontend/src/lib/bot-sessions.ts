import { db } from "@/db"
import { botSessions } from "@/db/schema"
import { eq } from "drizzle-orm"

export type BotState = "idle" | "awaiting_channel" | "awaiting_confirmation"

export interface BotSession {
  telegramId: number
  state: BotState
  data: Record<string, string>
}

export async function getSession(telegramId: number): Promise<BotSession> {
  const [row] = await db
    .select()
    .from(botSessions)
    .where(eq(botSessions.telegramId, telegramId))
    .limit(1)

  return {
    telegramId,
    state: (row?.state as BotState) ?? "idle",
    data: (row?.data as Record<string, string>) ?? {},
  }
}

export async function setSession(
  telegramId: number,
  state: BotState,
  data: Record<string, string> = {},
) {
  await db
    .insert(botSessions)
    .values({ telegramId, state, data })
    .onConflictDoUpdate({
      target: botSessions.telegramId,
      set: { state, data, updatedAt: new Date() },
    })
}

export async function clearSession(telegramId: number) {
  await db.delete(botSessions).where(eq(botSessions.telegramId, telegramId))
}
