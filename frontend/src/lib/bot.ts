import { Bot } from "grammy"

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set")
}

const globalForBot = globalThis as unknown as { bot: Bot | undefined }

export const bot = globalForBot.bot ?? new Bot(process.env.TELEGRAM_BOT_TOKEN)

if (process.env.NODE_ENV !== "production") {
  globalForBot.bot = bot
}
