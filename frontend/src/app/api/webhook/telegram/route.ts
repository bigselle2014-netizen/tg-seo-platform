import { NextRequest, NextResponse } from "next/server"
import { Bot, BotError, GrammyError, InlineKeyboard, webhookCallback } from "grammy"
import { db } from "@/db"
import { channelOwners, tgAuthRequests, users, analyticsEvents } from "@/db/schema"
import { eq, and, count, sql } from "drizzle-orm"
import { getSession, setSession, clearSession } from "@/lib/bot-sessions"
import { auth } from "@/lib/auth"
import { signCookieValue } from "@/lib/cookie-sign"

export const dynamic = "force-dynamic"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://post-seo.seo-rezult.ru"
const WORKER_URL = process.env.WORKER_API_URL || "http://worker:8000"
const WORKER_SECRET = process.env.WORKER_SECRET || ""

async function createAutoLoginToken(telegramId: string, telegramUsername: string | null, telegramName: string) {
  const ctx = await auth.$context
  const adapter = ctx.internalAdapter

  let [existing] = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1)

  let userId: string
  if (existing) {
    userId = existing.id
  } else {
    const newUser = await adapter.createUser({
      name: telegramName,
      email: `tg_${telegramId}@telegram.invalid`,
      emailVerified: false,
    }) as { id: string }
    userId = newUser.id
    await db.update(users).set({
      telegramId,
      telegramUsername: telegramUsername ?? null,
    }).where(eq(users.id, userId))
  }

  const token = crypto.randomUUID().replace(/-/g, "")
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
  await db.insert(tgAuthRequests).values({
    token,
    status: "complete",
    telegramId,
    telegramName,
    telegramUsername: telegramUsername ?? null,
    expiresAt,
  })

  return token
}

// ── UI helpers ───────────────────────────────────────────────────────────────

function kb(...rows: [string, string][][]) {
  const keyboard = new InlineKeyboard()
  for (const row of rows) {
    for (const [text, data] of row) keyboard.text(text, data)
    keyboard.row()
  }
  return keyboard
}

async function getChannelsList(userId: string) {
  return db.select().from(channelOwners)
    .where(and(eq(channelOwners.userId, userId), eq(channelOwners.isArchived, false)))
    .orderBy(channelOwners.createdAt)
}

async function workerGet(path: string) {
  try {
    const r = await fetch(`${WORKER_URL}${path}`, {
      headers: { "X-Worker-Secret": WORKER_SECRET }
    })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

function statusEmoji(ch: { status: string; botIsAdmin: boolean }) {
  if (ch.botIsAdmin && ch.status === "active") return "✅"
  if (ch.status === "pending") return "⏳"
  return "❌"
}

function paginationRow(prefix: string, page: number, totalPages: number, filter = "all"): [string, string][] {
  const row: [string, string][] = []
  if (page > 1) row.push(["«", `${prefix}:p:1:${filter}`], ["‹", `${prefix}:p:${page - 1}:${filter}`])
  row.push([`·${page}·`, `noop`])
  if (page < totalPages) row.push(["›", `${prefix}:p:${page + 1}:${filter}`], ["»", `${prefix}:p:${totalPages}:${filter}`])
  return row
}

// ── Screen renderers ─────────────────────────────────────────────────────────

async function screenMain(userId: string) {
  const channels = await getChannelsList(userId)
  const text = channels.length === 0
    ? "👋 Добро пожаловать в Post SEO!\n\nДобавьте Telegram-канал и ваши посты начнут появляться в Google и Яндексе автоматически."
    : `🏠 *Главное меню*\n\nВаших каналов: ${channels.length}`
  const keyboard = channels.length === 0
    ? kb(
        [["➕ Добавить канал", "ch:add:type"]],
        [["❓ Как это работает", "menu:help"]]
      )
    : kb(
        [["📢 Мои каналы", "menu:channels"]],
        [["📊 Аналитика", "menu:analytics"], ["💳 Тарифы", "menu:billing"]],
        [["❓ Помощь", "menu:help"]]
      )
  return { text, keyboard }
}

async function screenChannels(userId: string) {
  const channels = await getChannelsList(userId)
  const keyboard = new InlineKeyboard()
  for (const ch of channels) {
    const emoji = statusEmoji(ch)
    keyboard.text(`${emoji} @${ch.channelUsername}${ch.channelTitle ? " · " + ch.channelTitle : ""}`, `ch:view:${ch.id}`).row()
  }
  keyboard.text("➕ Добавить канал", "ch:add:type").row()
  keyboard.text("🏠 Главное меню", "menu:main")
  return {
    text: channels.length === 0
      ? "📢 *Мои каналы*\n\nУ вас пока нет каналов."
      : `📢 *Мои каналы*\n\nВыберите канал:`,
    keyboard
  }
}

async function screenChannel(channelId: string, userId: string) {
  const [ch] = await db.select().from(channelOwners)
    .where(and(eq(channelOwners.id, channelId), eq(channelOwners.userId, userId))).limit(1)
  if (!ch) return null

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const [indexedData, viewsRow, clicksRow, uRow] = await Promise.all([
    workerGet(`/api/channels/${ch.channelUsername}/posts?page=1&per_page=1&indexed_only=true`),
    db.select({ cnt: count() }).from(analyticsEvents).where(and(
      eq(analyticsEvents.channelUsername, ch.channelUsername),
      eq(analyticsEvents.eventType, "page_view"),
      sql`${analyticsEvents.createdAt} >= ${thirtyDaysAgo}`
    )).then(r => r[0]),
    db.select({ cnt: count() }).from(analyticsEvents).where(and(
      eq(analyticsEvents.channelUsername, ch.channelUsername),
      eq(analyticsEvents.eventType, "tg_click"),
      sql`${analyticsEvents.createdAt} >= ${thirtyDaysAgo}`
    )).then(r => r[0]),
    db.select({ telegramId: users.telegramId, telegramUsername: users.telegramUsername, name: users.name })
      .from(users).where(eq(users.id, userId)).limit(1).then(r => r[0]),
  ])

  const inSearch = indexedData?.total || 0
  const v = viewsRow?.cnt || 0
  const c = clicksRow?.cnt || 0

  let loginUrl = SITE_URL
  if (uRow?.telegramId) {
    try {
      const token = await createAutoLoginToken(uRow.telegramId, uRow.telegramUsername ?? null, uRow.name || "User")
      loginUrl = `${SITE_URL}/auth/sign-in?token=${token}&redirect=/dashboard/channels/${channelId}/posts`
    } catch {}
  }

  const rawTitle = (ch.channelTitle || "")
    .replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu, "")
    .split("|")[0]
    .trim()
    .slice(0, 28)
  const displayTitle = rawTitle ? ` · ${rawTitle}` : ""

  const apStatus = ch.autoPublish ? "🟢 ВКЛ" : "🔴 ВЫКЛ"
  const text = `📢 @${ch.channelUsername}${displayTitle}\n\n` +
    `📊 Отправлено в индекс: ${inSearch} постов\n` +
    `👁 Просмотров за 30 дней: ${v}\n` +
    `👆 Переходов в Telegram: ${c}\n\n` +
    `Автопубликация: ${apStatus}`

  const miniUrl = `${SITE_URL}/mini`

  const keyboard = new InlineKeyboard()
  keyboard.text("📄 Публикации", `ch:posts:${channelId}:p:1:all`).row()
  keyboard.text(ch.autoPublish ? "🟢 Автопубликация: ВКЛ" : "🔴 Автопубликация: ВЫКЛ", `ch:toggle_ap_ch:${channelId}`).row()
  keyboard.webApp("🚀 Открыть панель", miniUrl).row()
  keyboard.text("📊 Аналитика", `ch:analytics:${channelId}`)
  keyboard.text("⚙️ Настройки", `ch:settings:${channelId}`).row()
  if (!ch.botIsAdmin) {
    keyboard.text("🔄 Проверить — бот добавлен", `ch:activate:${channelId}`).row()
  }
  keyboard.text("‹ К каналам", "menu:channels")
  return { text, keyboard }
}

function cleanPostTitle(text: string, maxLen = 35): string {
  return (text || "")
    .replace(/\n+/g, " ")
    .replace(/#\w+/g, "")
    .replace(/[*_`[\]()]/g, "")
    .replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxLen) || "Медиа-пост"
}

async function screenPosts(channelId: string, userId: string, selectedIds: number[] = []) {
  const [ch] = await db.select().from(channelOwners)
    .where(and(eq(channelOwners.id, channelId), eq(channelOwners.userId, userId))).limit(1)
  if (!ch) return null

  const [allData, indexedData, pendingData, uRow] = await Promise.all([
    workerGet(`/api/channels/${ch.channelUsername}/posts?page=1&per_page=1`),
    workerGet(`/api/channels/${ch.channelUsername}/posts?page=1&per_page=1&indexed_only=true`),
    workerGet(`/api/channels/${ch.channelUsername}/posts?page=1&per_page=5&pending_only=true`),
    db.select({ telegramId: users.telegramId, telegramUsername: users.telegramUsername, name: users.name })
      .from(users).where(eq(users.id, userId)).limit(1).then(r => r[0]),
  ])

  const totalAll = allData?.total || 0
  const inSearch = indexedData?.total || 0
  const pendingTotal = pendingData?.total || 0
  const shortCount = Math.max(0, totalAll - inSearch - pendingTotal)
  const posts: Array<{ id: number; text?: string; seo_title?: string }> = pendingData?.posts || []

  const selectedCount = selectedIds.length
  let text = `📄 *Публикации @${ch.channelUsername}*\n\n` +
    `📤 В индексе: ${inSearch}\n` +
    `⚡ Ждут продвижения: ${pendingTotal}\n` +
    `⚫ Короткие (не подходят): ${shortCount}`

  if (selectedCount > 0) {
    text += `\n\n_Выбрано: ${selectedCount}_`
  }
  text += "\n\n— Последние 5 новых постов —"

  let loginUrl = SITE_URL
  if (uRow?.telegramId) {
    try {
      const token = await createAutoLoginToken(uRow.telegramId, uRow.telegramUsername ?? null, uRow.name || "User")
      loginUrl = `${SITE_URL}/auth/sign-in?token=${token}&redirect=/dashboard/channels/${channelId}/posts`
    } catch {}
  }

  const keyboard = new InlineKeyboard()

  if (posts.length === 0) {
    text += "\n\n_Нет постов для продвижения._\nНажмите «Импорт истории» чтобы загрузить посты."
    keyboard.text("📥 Импорт истории", `ch:scrape:${channelId}`).row()
  } else {
    for (const p of posts) {
      const title = cleanPostTitle(p.seo_title || p.text || "")
      const isSelected = selectedIds.includes(p.id)
      keyboard.text(`${isSelected ? "✅" : "☐"} ${title}`, `ch:sel:${channelId}:${p.id}`).row()
    }
    if (selectedCount > 0) {
      keyboard.text(`⚡ Продвинуть выбранные (${selectedCount})`, `ch:promote_selected:${channelId}`).row()
    }
    if (pendingTotal > 0) {
      keyboard.text(`⚡ Продвинуть все ${pendingTotal}`, `ch:promote_all:${channelId}`).row()
    }
    keyboard.text("📥 Импорт истории", `ch:scrape:${channelId}`).row()
  }

  keyboard.webApp("🚀 Открыть панель", `${SITE_URL}/mini`).row()
  keyboard.text("‹ К каналу", `ch:view:${channelId}`)
  return { text, keyboard }
}

async function screenSettings(channelId: string, userId: string) {
  const [ch] = await db.select().from(channelOwners)
    .where(and(eq(channelOwners.id, channelId), eq(channelOwners.userId, userId))).limit(1)
  if (!ch) return null

  const text = `⚙️ *Настройки @${ch.channelUsername}*\n\n` +
    `Автопубликация: ${ch.autoPublish ? "🟢 ВКЛ" : "🔴 ВЫКЛ"}\n` +
    `Задержка: ${ch.autoPublishDelay === 0 ? "без задержки" : ch.autoPublishDelay + " мин"}`

  const keyboard = new InlineKeyboard()
  keyboard.text(ch.autoPublish ? "🟢 Автопубликация: ВКЛ" : "🔴 Автопубликация: ВЫКЛ", `ch:toggle_ap:${channelId}`).row()
  keyboard.text("⏱ Изменить задержку", `ch:delay_menu:${channelId}`).row()
  keyboard.text("🗑 Удалить канал", `ch:del_confirm:${channelId}`).row()
  keyboard.text("‹ К каналу", `ch:view:${channelId}`)
  return { text, keyboard }
}

async function screenAnalytics(channelId: string, userId: string) {
  const [ch] = await db.select().from(channelOwners)
    .where(and(eq(channelOwners.id, channelId), eq(channelOwners.userId, userId))).limit(1)
  if (!ch) return null

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const [views] = await db.select({ cnt: count() }).from(analyticsEvents)
    .where(and(eq(analyticsEvents.channelUsername, ch.channelUsername), eq(analyticsEvents.eventType, "page_view"), sql`${analyticsEvents.createdAt} >= ${thirtyDaysAgo}`))
  const [clicks] = await db.select({ cnt: count() }).from(analyticsEvents)
    .where(and(eq(analyticsEvents.channelUsername, ch.channelUsername), eq(analyticsEvents.eventType, "tg_click"), sql`${analyticsEvents.createdAt} >= ${thirtyDaysAgo}`))

  const v = views?.cnt || 0
  const c = clicks?.cnt || 0
  const conv = v > 0 ? ((c / v) * 100).toFixed(1) : "0.0"

  const text = v === 0
    ? `📢 *Каналы › @${ch.channelUsername} › 📊 Аналитика*\n\nДанных пока нет.\n\nПервые результаты появятся через 4–6 месяцев после индексации.`
    : `📢 *Каналы › @${ch.channelUsername} › 📊 Аналитика*\n\nПоследние 30 дней:\n\n` +
      `👁 Просмотры: *${v}*\n` +
      `👆 Переходы в Telegram: *${c}*\n` +
      `📈 Конверсия: *${conv}%*`

  const keyboard = kb([["‹ К каналу", `ch:view:${channelId}`]])
  return { text, keyboard }
}

// ── Check & activate channel via Telegram API ────────────────────────────────

function tgFetch(url: string, opts?: RequestInit) {
  return fetch(url, { ...opts, signal: AbortSignal.timeout(8000) })
}

async function checkAndActivateChannel(
  channelUsername: string,
  from: { id: number; first_name?: string; last_name?: string; username?: string | null },
  ctx: unknown,
): Promise<boolean> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return false

    // Get bot ID
    const meRes = await tgFetch(`https://api.telegram.org/bot${token}/getMe`).then(r => r.json())
    const botId = meRes.result?.id
    if (!botId) return false

    // Check if bot is admin in the channel
    const memberCheck = await tgFetch(
      `https://api.telegram.org/bot${token}/getChatMember?chat_id=@${channelUsername}&user_id=${botId}`
    ).then(r => r.json())

    if (!memberCheck.ok) return false
    const status = memberCheck.result?.status
    if (status !== "administrator" && status !== "creator") return false

    // Bot IS admin — get chat info
    const chatRes = await tgFetch(
      `https://api.telegram.org/bot${token}/getChat?chat_id=@${channelUsername}`
    ).then(r => r.json())
    const chatId = chatRes.result?.id ? String(chatRes.result.id) : null
    const chatTitle = chatRes.result?.title || null

    let inviteLink: string | null = null
    if (chatId) {
      try {
        const linkRes = await tgFetch(
          `https://api.telegram.org/bot${token}/createChatInviteLink`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: Number(chatId), name: "TG Index Tracking" }),
          }
        ).then(r => r.json())
        inviteLink = linkRes.result?.invite_link || null
      } catch {}
    }

    await db.update(channelOwners)
      .set({ botIsAdmin: true, status: "active", channelTgId: chatId, channelTitle: chatTitle, inviteLink })
      .where(and(eq(channelOwners.channelUsername, channelUsername), eq(channelOwners.messengerType, "telegram")))

    // Scrape channel posts + run audit (by username — worker resolves to integer id internally)
    fetch(`${WORKER_URL}/api/channels/${channelUsername}/scrape-web?limit=500`, {
      method: "POST",
      headers: { "X-Worker-Secret": WORKER_SECRET },
    }).catch(() => {})

    fetch(`${WORKER_URL}/analyze-channel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Worker-Secret": WORKER_SECRET },
      body: JSON.stringify({ channel_username: channelUsername }),
    }).catch(() => {})

    const loginToken = await createAutoLoginToken(
      String(from.id),
      from.username ?? null,
      [from.first_name, from.last_name].filter(Boolean).join(" ") || from.username || "User",
    )
    const loginUrl = `${SITE_URL}/auth/sign-in?token=${loginToken}`

    // Clear session
    await clearSession(from.id)

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: from.id,
        text: `✅ Бот добавлен в @${channelUsername}!\n\n📊 Запускаю SEO-аудит — результат пришлю через минуту.\n\nЧто дальше:\n• Импортируйте историю постов\n• Включите автопубликацию\n• Первые результаты в поиске — через 2–7 дней`,
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Открыть панель", web_app: { url: `${SITE_URL}/mini` } }],
            [{ text: "🏠 Главное меню", callback_data: "menu:main" }],
          ]
        }
      }),
    })

    return true
  } catch {
    return false
  }
}

// ── Bot factory ──────────────────────────────────────────────────────────────

let _bot: Bot | null = null

function getBot(): Bot {
  if (_bot) return _bot
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set")
  const bot = new Bot(token)

  // ── Channel admin events ─────────────────────────────────────────────────────
  bot.on("my_chat_member", async (ctx) => {
    const update = ctx.myChatMember
    if (!update) return
    const chat = update.chat
    const newMember = update.new_chat_member

    if (chat.type === "channel" && newMember.status === "administrator" && chat.username) {
      const username = chat.username.toLowerCase()
      const existing = await db
        .select()
        .from(channelOwners)
        .where(and(eq(channelOwners.channelUsername, username), eq(channelOwners.messengerType, "telegram")))
        .limit(1)

      if (existing.length > 0) {
        let inviteLink: string | null = null
        try {
          const link = await ctx.api.createChatInviteLink(chat.id, { name: "TG Index Tracking", creates_join_request: false })
          inviteLink = link.invite_link
        } catch {}

        // DB update always succeeds independently of messaging
        await db
          .update(channelOwners)
          .set({ botIsAdmin: true, status: "active", channelTgId: String(chat.id), channelTitle: chat.title || null, inviteLink })
          .where(eq(channelOwners.id, existing[0].id))

        fetch(`${WORKER_URL}/api/channels/${username}/scrape-web?limit=500`, {
          method: "POST",
          headers: { "X-Worker-Secret": WORKER_SECRET },
        }).catch(() => {})

        fetch(`${WORKER_URL}/analyze-channel`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Worker-Secret": WORKER_SECRET },
          body: JSON.stringify({ channel_username: username }),
        }).catch(() => {})

        const from = update.from
        if (from) {
          try {
            const sess = await getSession(from.id)
            if (sess.state === "awaiting_confirmation" && sess.data.channelUsername === username) {
              const loginToken = await createAutoLoginToken(
                String(from.id),
                from.username ?? null,
                [from.first_name, from.last_name].filter(Boolean).join(" ") || from.username || "User",
              )
              const loginUrl = `${SITE_URL}/auth/sign-in?token=${loginToken}`
              await clearSession(from.id)
              await ctx.api.sendMessage(from.id,
                `✅ Бот добавлен в @${username}!\n\n📊 Запускаю SEO-аудит — результат пришлю через минуту.\n\nЧто дальше:\n• Импортируйте историю постов\n• Включите автопубликацию\n• Первые результаты в поиске — через 2–7 дней`,
                {
                  reply_markup: new InlineKeyboard()
                    .webApp("🚀 Открыть панель", `${SITE_URL}/mini`).row()
                    .text("🏠 Главное меню", "menu:main"),
                }
              )
            }
          } catch (e) {
            console.error("[bot] my_chat_member notification error:", e)
          }
        }
      }
    }

    if (chat.type === "channel" && (newMember.status === "left" || newMember.status === "kicked") && chat.username) {
      await db
        .update(channelOwners)
        .set({ botIsAdmin: false, status: "pending" })
        .where(eq(channelOwners.channelUsername, chat.username.toLowerCase()))
    }
  })

  // ── New channel posts ────────────────────────────────────────────────────────
  bot.on("channel_post", async (ctx) => {
    const post = ctx.channelPost
    if (!post.chat.username) return
    const username = post.chat.username.toLowerCase()

    const [channel] = await db
      .select()
      .from(channelOwners)
      .where(eq(channelOwners.channelUsername, username))
      .limit(1)

    if (!channel?.botIsAdmin || !channel.autoPublish) return

    try {
      await fetch(`${WORKER_URL}/api/channels/${username}/new-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Worker-Secret": WORKER_SECRET },
        body: JSON.stringify({
          message_id: post.message_id,
          text: post.text || post.caption || "",
          date: post.date,
          has_media: !!(post.photo || post.video || post.document),
        }),
      })
    } catch (e) {
      console.error("[bot] Failed to notify worker:", e)
    }
  })

  // ── Private messages (state machine) ────────────────────────────────────────
  bot.on("message:text", async (ctx) => {
    const from = ctx.from
    if (!from || ctx.chat.type !== "private") return

    const text = ctx.message.text.trim()

    // Auth flow: /start auth_TOKEN
    const authMatch = text.match(/^\/start auth_([a-f0-9]+)$/)
    if (authMatch) {
      const token = authMatch[1]
      try {
        await db
          .update(tgAuthRequests)
          .set({
            status: "complete",
            telegramId: String(from.id),
            telegramName: [from.first_name, from.last_name].filter(Boolean).join(" "),
            telegramUsername: from.username ?? null,
          })
          .where(eq(tgAuthRequests.token, token))
        await ctx.reply("✅ Авторизация прошла успешно! Вернитесь на сайт.")
      } catch (e) {
        console.error("[bot] Auth token update failed:", e)
      }
      return
    }

    // Onboarding start: /start or /start add_channel
    if (text === "/start" || text === "/start add_channel") {
      await clearSession(from.id)

      // Если пользователь уже авторизован — показать главное меню
      const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.telegramId, String(from.id))).limit(1)
      if (existingUser && text === "/start") {
        const mainScreen = await screenMain(existingUser.id)
        await ctx.reply(mainScreen.text, { reply_markup: mainScreen.keyboard, parse_mode: "Markdown" })
        return
      }

      const name = from.first_name || from.username || "Друг"
      await ctx.reply(
        `👋 Привет, ${name}!\n\nЯ помогу добавить ваш Telegram-канал на SEO-платформу и запустить автоматическую индексацию постов.\n\n📋 Для начала пришлите мне username вашего канала (например: @myseoChannel)`,
        { reply_markup: { remove_keyboard: true } }
      )
      await setSession(from.id, "awaiting_channel")
      return
    }

    // /cancel
    if (text === "/cancel") {
      await clearSession(from.id)
      await ctx.reply("Операция отменена. Напишите /start чтобы начать заново.")
      return
    }

    // /menu
    if (text === "/menu") {
      const [u] = await db.select({ id: users.id }).from(users).where(eq(users.telegramId, String(from.id))).limit(1)
      if (u) {
        const s = await screenMain(u.id)
        await ctx.reply(s.text, { reply_markup: s.keyboard, parse_mode: "Markdown" })
      } else {
        await ctx.reply("Напишите /start чтобы начать.")
      }
      return
    }

    const sess = await getSession(from.id)

    // ── State: awaiting_channel ──────────────────────────────────────────────
    if (sess.state === "awaiting_channel") {
      const rawUsername = text.replace(/^@/, "").toLowerCase().trim()

      if (!/^[a-zA-Z0-9_]{5,}$/.test(rawUsername)) {
        await ctx.reply("❌ Некорректный username. Попробуйте ещё раз (например: @myseoChannel)")
        return
      }

      const messengerTypeVal = (sess.data?.messengerType === "max" ? "max" : "telegram") as "telegram" | "max"
      const existingByUser = await db
        .select()
        .from(channelOwners)
        .where(and(
          eq(channelOwners.channelUsername, rawUsername),
          eq(channelOwners.messengerType, messengerTypeVal),
        ))
        .limit(1)

      let [userRow] = await db
        .select()
        .from(users)
        .where(eq(users.telegramId, String(from.id)))
        .limit(1)

      if (!userRow) {
        const ctx2 = await auth.$context
        const adapter = ctx2.internalAdapter
        const newUser = await adapter.createUser({
          name: [from.first_name, from.last_name].filter(Boolean).join(" ") || from.username || "Telegram User",
          email: `tg_${from.id}@telegram.invalid`,
          emailVerified: false,
        }) as { id: string }
        await db.update(users).set({
          telegramId: String(from.id),
          telegramUsername: from.username ?? null,
        }).where(eq(users.id, newUser.id))
        userRow = (await db.select().from(users).where(eq(users.id, newUser.id)).limit(1))[0]
      }

      if (existingByUser.length > 0 && existingByUser[0].userId !== userRow.id) {
        const existing = existingByUser[0]
        // Allow claim if channel is pending (bot not added) — previous owner abandoned it
        if (!existing.botIsAdmin && existing.status === "pending") {
          await db.update(channelOwners)
            .set({ userId: userRow.id })
            .where(eq(channelOwners.id, existing.id))
        } else {
          await ctx.reply(`⚠️ Канал @${rawUsername} уже зарегистрирован другим пользователем.`)
          return
        }
      }

      if (existingByUser.length === 0) {
        await db.insert(channelOwners).values({
          userId: userRow.id,
          channelUsername: rawUsername,
          messengerType: messengerTypeVal,
          status: "pending",
        })
      }

      const [channelRow] = await db
        .select()
        .from(channelOwners)
        .where(and(eq(channelOwners.channelUsername, rawUsername), eq(channelOwners.messengerType, messengerTypeVal)))
        .limit(1)

      if (channelRow?.botIsAdmin) {
        const loginToken = await createAutoLoginToken(
          String(from.id),
          from.username ?? null,
          [from.first_name, from.last_name].filter(Boolean).join(" ") || from.username || "User",
        )
        const loginUrl = `${SITE_URL}/auth/sign-in?token=${loginToken}`
        await ctx.reply(
          `✅ Канал @${rawUsername} уже подключён!\n\nОткройте панель управления:`,
          {
            reply_markup: new InlineKeyboard()
              .webApp("🚀 Открыть панель", `${SITE_URL}/mini`).row()
              .text("🏠 Главное меню", "menu:main"),
          }
        )
        return
      }

      await setSession(from.id, "awaiting_confirmation", { channelUsername: rawUsername, messengerType: messengerTypeVal })

      const botUsername = process.env.TELEGRAM_BOT_USERNAME || "tg_buster_bot"
      await ctx.reply(
        `✅ Канал @${rawUsername} зарегистрирован!\n\nТеперь добавьте @${botUsername} как администратора канала.\nНужно только одно право — публикация сообщений.\n\nКак только добавите — я сразу пришлю доступ в панель.`,
        {
          reply_markup: new InlineKeyboard()
            .url("📖 Пошаговая инструкция", `${SITE_URL}/how-to-add-bot`).row()
            .text("✅ Уже добавил — проверить", `ch:check_activation:${rawUsername}`),
        }
      )
      return
    }

    // ── State: awaiting_confirmation ─────────────────────────────────────────
    if (sess.state === "awaiting_confirmation") {
      const channelUsername = sess.data.channelUsername
      // Check if bot is already admin (in case my_chat_member event was missed)
      const activated = await checkAndActivateChannel(channelUsername, from, ctx)
      if (activated) return
      await ctx.reply(
        `⏳ Ожидаю добавления бота в канал @${channelUsername}.\n\n` +
        `Если уже добавили — нажмите кнопку ниже.\n` +
        `Если хотите сменить канал — напишите /cancel.`,
        {
          reply_markup: new InlineKeyboard()
            .text("✅ Я добавил бота — проверить", `ch:check_activation:${channelUsername}`)
        }
      )
      return
    }

    // Default: show main menu
    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.telegramId, String(from.id))).limit(1)
    if (existingUser) {
      const mainScreen = await screenMain(existingUser.id)
      await ctx.reply(mainScreen.text, { reply_markup: mainScreen.keyboard, parse_mode: "Markdown" })
    } else {
      await ctx.reply(
        "Добавьте свой Telegram-канал на SEO-платформу и получайте органический трафик из Яндекса и Google.",
        {
          reply_markup: new InlineKeyboard().text("🚀 Начать", "do_start"),
        }
      )
    }
  })

  // ── Non-text messages (sticker, photo, voice, etc.) ─────────────────────────
  bot.on("message", async (ctx) => {
    if (ctx.message.text !== undefined) return
    if (!ctx.from || ctx.chat.type !== "private") return
    const sess = await getSession(ctx.from.id)
    if (sess.state === "awaiting_channel") {
      await ctx.reply("Пришлите username канала текстом (например: @myseoChannel)")
    }
  })

  // ── Callback queries ─────────────────────────────────────────────────────────
  bot.on("callback_query:data", async (ctx) => {
    try { await ctx.answerCallbackQuery() } catch {}
    const from = ctx.from
    if (!from) return
    const data = ctx.callbackQuery.data

    if (data === "noop") return

    const [userRow] = await db.select({ id: users.id })
      .from(users).where(eq(users.telegramId, String(from.id))).limit(1)

    if (!userRow && data !== "do_start") {
      await ctx.editMessageText("Сначала войдите через /start")
      return
    }
    const userId = userRow?.id || ""

    async function render(screen: { text: string; keyboard: InlineKeyboard } | null) {
      if (!screen) { await ctx.editMessageText("❌ Не найдено"); return }
      await ctx.editMessageText(screen.text, { reply_markup: screen.keyboard, parse_mode: "Markdown" })
    }

    if (data === "do_start") {
      await clearSession(from.id)
      const name = from.first_name || "Друг"
      await ctx.editMessageText(
        `👋 Привет, ${name}!\n\nПришлите username вашего канала (например: @myseoChannel)`,
        { reply_markup: new InlineKeyboard().text("Отмена", "menu:main") }
      )
      await setSession(from.id, "awaiting_channel")
      return
    }

    if (data === "menu:main") return render(await screenMain(userId))
    if (data === "menu:channels") return render(await screenChannels(userId))

    if (data === "menu:analytics") {
      const channels = await getChannelsList(userId)
      if (channels.length === 0) return render({
        text: "📊 *Аналитика*\n\nДобавьте канал для просмотра аналитики.",
        keyboard: kb([["➕ Добавить", "ch:add:type"]], [["🏠 Меню", "menu:main"]])
      })
      let total_v = 0, total_c = 0
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      for (const ch of channels) {
        const [v] = await db.select({ cnt: count() }).from(analyticsEvents).where(and(eq(analyticsEvents.channelUsername, ch.channelUsername), eq(analyticsEvents.eventType, "page_view"), sql`${analyticsEvents.createdAt} >= ${thirtyDaysAgo}`))
        const [c] = await db.select({ cnt: count() }).from(analyticsEvents).where(and(eq(analyticsEvents.channelUsername, ch.channelUsername), eq(analyticsEvents.eventType, "tg_click"), sql`${analyticsEvents.createdAt} >= ${thirtyDaysAgo}`))
        total_v += v?.cnt || 0; total_c += c?.cnt || 0
      }
      const conv = total_v > 0 ? ((total_c / total_v) * 100).toFixed(1) : "0.0"
      const text = total_v === 0
        ? "📊 *Аналитика*\n\nДанных пока нет. Первые результаты через 4–6 месяцев."
        : `📊 *Аналитика · 30 дней*\n\n👁 Просмотры: *${total_v}*\n👆 Переходы: *${total_c}*\n📈 Конверсия: *${conv}%*`
      return render({ text, keyboard: kb([["🏠 Меню", "menu:main"]]) })
    }

    if (data === "menu:billing") return render({
      text: "💳 *Тарифы*\n\nFree — 0₽ · до 20 публикаций\nHobby — 350₽/мес · до 150 публикаций · AI + SERP\nPro — 1050₽/мес · до 1000 публикаций · приоритет\n\nОплата будет доступна в следующей версии.",
      keyboard: kb([["🏠 Меню", "menu:main"]])
    })

    if (data === "menu:help") return render({
      text: "❓ *Как работает сервис*\n\n1. Подключаете канал\n2. Бот читает ваши посты\n3. AI анализирует Яндекс SERP и создаёт FAQ вокруг вашего поста\n4. Страница индексируется в поиске\n5. Читатель переходит в Telegram\n\n*Статусы постов:*\n✅ Опубликовано\n🔵 SEO готово\n🟡 В обработке\n⚫ Не подходит",
      keyboard: kb([["➕ Добавить канал", "ch:add:type"], ["🏠 Меню", "menu:main"]])
    })

    if (data === "ch:add:type") return render({
      text: "➕ *Добавить канал*\n\nВыберите тип мессенджера:",
      keyboard: kb([["Telegram", "ch:add:telegram"], ["MAX", "ch:add:max"]], [["‹ Назад", "menu:channels"]])
    })

    if (data === "ch:add:max") {
      return render({
        text: "📱 *Добавить MAX канал*\n\nПоддержка MAX появится в следующей версии.\nПока доступны только Telegram-каналы.",
        keyboard: kb([["Добавить Telegram канал", "ch:add:telegram"]], [["‹ Назад", "menu:channels"]])
      })
    }

    if (data === "ch:add:telegram") {
      await clearSession(from.id)
      await setSession(from.id, "awaiting_channel", { messengerType: "telegram" })
      await ctx.editMessageText(
        `➕ *Добавить Telegram канал*\n\nПришлите username канала (без @):`,
        { reply_markup: new InlineKeyboard().text("Отмена", "menu:channels"), parse_mode: "Markdown" }
      )
      return
    }

    const chViewMatch = data.match(/^ch:view:(.+)$/)
    if (chViewMatch) return render(await screenChannel(chViewMatch[1], userId))

    const chPostsMatch = data.match(/^ch:posts:([^:]+):p:(\d+):(\w+)$/)
    if (chPostsMatch) {
      const sess = await getSession(from.id)
      const selStr = sess.data.selected_posts || ""
      const selIds = selStr ? selStr.split(",").map(Number).filter(Boolean) : []
      return render(await screenPosts(chPostsMatch[1], userId, selIds))
    }

    const chAnalyticsMatch = data.match(/^ch:analytics:(.+)$/)
    if (chAnalyticsMatch) return render(await screenAnalytics(chAnalyticsMatch[1], userId))

    const chSettingsMatch = data.match(/^ch:settings:(.+)$/)
    if (chSettingsMatch) return render(await screenSettings(chSettingsMatch[1], userId))

    const chBillingMatch = data.match(/^ch:billing:(.+)$/)
    if (chBillingMatch) {
      const [ch] = await db.select().from(channelOwners).where(and(eq(channelOwners.id, chBillingMatch[1]), eq(channelOwners.userId, userId))).limit(1)
      if (!ch) return
      return render({
        text: `💳 *Тариф канала @${ch.channelUsername}*\n\nFree — 0₽ · до 20 публикаций\nHobby — 350₽/мес · до 150 публикаций\nPro — 1050₽/мес · до 1000 публикаций\n\nОплата будет доступна в следующей версии.`,
        keyboard: kb([["‹ К каналу", `ch:view:${chBillingMatch[1]}`]])
      })
    }

    const chTeamMatch = data.match(/^ch:team:(.+)$/)
    if (chTeamMatch) {
      const [ch] = await db.select().from(channelOwners).where(and(eq(channelOwners.id, chTeamMatch[1]), eq(channelOwners.userId, userId))).limit(1)
      if (!ch) return
      const [user] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
      return render({
        text: `👥 *Каналы › @${ch.channelUsername} › Команда*\n\nУчастники (1/10):\n— ${user?.name || "Вы"} · Владелец\n\nПриглашение участников будет доступно в следующей версии.`,
        keyboard: kb([["‹ К каналу", `ch:view:${chTeamMatch[1]}`]])
      })
    }

    const chDelConfirmMatch = data.match(/^ch:del_confirm:(.+)$/)
    if (chDelConfirmMatch) {
      const [ch] = await db.select().from(channelOwners).where(and(eq(channelOwners.id, chDelConfirmMatch[1]), eq(channelOwners.userId, userId))).limit(1)
      if (!ch) return
      return render({
        text: `⚠️ Удалить канал @${ch.channelUsername}?\n\nВсе данные будут удалены навсегда.`,
        keyboard: kb([["Отмена", `ch:settings:${chDelConfirmMatch[1]}`], ["Удалить навсегда", `ch:del_exec:${chDelConfirmMatch[1]}`]])
      })
    }

    const chDelExecMatch = data.match(/^ch:del_exec:(.+)$/)
    if (chDelExecMatch) {
      const [ch] = await db.select({ username: channelOwners.channelUsername }).from(channelOwners).where(and(eq(channelOwners.id, chDelExecMatch[1]), eq(channelOwners.userId, userId))).limit(1)
      if (!ch) return
      await db.delete(channelOwners).where(eq(channelOwners.id, chDelExecMatch[1]))
      return render({ text: `✅ Канал @${ch.username} удалён.`, keyboard: kb([["‹ К каналам", "menu:channels"]]) })
    }

    const chScrapeMatch = data.match(/^ch:scrape:(.+)$/)
    if (chScrapeMatch) {
      const [ch] = await db.select().from(channelOwners).where(and(eq(channelOwners.id, chScrapeMatch[1]), eq(channelOwners.userId, userId))).limit(1)
      if (!ch || ch.messengerType !== "telegram") return
      await fetch(`${WORKER_URL}/api/channels/${ch.channelUsername}/scrape-web?limit=500`, {
        method: "POST",
        headers: { "X-Worker-Secret": WORKER_SECRET }
      }).catch(() => {})
      await ctx.editMessageText(
        `📢 *Каналы › @${ch.channelUsername} › Публикации*\n\n⏳ *Импорт запущен!*\n\nПосты из канала загружаются — обычно занимает 1–2 минуты.\nНажмите «Обновить» чтобы проверить.`,
        {
          parse_mode: "Markdown",
          reply_markup: kb(
            [["🔄 Обновить", `ch:posts:${chScrapeMatch[1]}:p:1:all`]],
            [["‹ К каналу", `ch:view:${chScrapeMatch[1]}`]]
          )
        }
      )
      return
    }

    const chToggleApMatch = data.match(/^ch:toggle_ap:(.+)$/)
    if (chToggleApMatch) {
      const [ch] = await db.select().from(channelOwners).where(and(eq(channelOwners.id, chToggleApMatch[1]), eq(channelOwners.userId, userId))).limit(1)
      if (!ch) return
      await db.update(channelOwners).set({ autoPublish: !ch.autoPublish }).where(eq(channelOwners.id, chToggleApMatch[1]))
      return render(await screenSettings(chToggleApMatch[1], userId))
    }

    const chToggleApPostsMatch = data.match(/^ch:tap:([^:]+):(\d+):(\w+)$/)
    if (chToggleApPostsMatch) {
      const [ch] = await db.select().from(channelOwners).where(and(eq(channelOwners.id, chToggleApPostsMatch[1]), eq(channelOwners.userId, userId))).limit(1)
      if (!ch) return
      await db.update(channelOwners).set({ autoPublish: !ch.autoPublish }).where(eq(channelOwners.id, chToggleApPostsMatch[1]))
      const sess2 = await getSession(from.id)
      const selStr2 = sess2.data.selected_posts || ""
      const selIds2 = selStr2 ? selStr2.split(",").map(Number).filter(Boolean) : []
      return render(await screenPosts(chToggleApPostsMatch[1], userId, selIds2))
    }

    const chPromoteMatch = data.match(/^ch:promote:([^:]+):(\d+)$/)
    if (chPromoteMatch) {
      const [ch] = await db.select().from(channelOwners).where(and(eq(channelOwners.id, chPromoteMatch[1]), eq(channelOwners.userId, userId))).limit(1)
      if (!ch) return
      try {
        await fetch(`${WORKER_URL}/api/posts/${chPromoteMatch[2]}/promote`, {
          method: "POST",
          headers: { "X-Worker-Secret": WORKER_SECRET },
        })
        await ctx.editMessageText(
          `⚡ *Запущено!*\n\nSEO-статья для поста будет готова через 1–2 минуты.\nСтатус обновится при следующем открытии списка публикаций.`,
          {
            parse_mode: "Markdown",
            reply_markup: kb([["‹ К публикациям", `ch:posts:${chPromoteMatch[1]}:p:1:all`]])
          }
        )
      } catch {
        await ctx.editMessageText("❌ Ошибка запуска. Попробуйте ещё раз.")
      }
      return
    }

    const chCheckActivationMatch = data.match(/^ch:check_activation:(.+)$/)
    if (chCheckActivationMatch) {
      const channelUsername = chCheckActivationMatch[1]
      const activated = await checkAndActivateChannel(channelUsername, from, ctx as never)
      if (!activated) {
        await ctx.editMessageText(
          `❌ Бот ещё не добавлен в @${channelUsername} или не имеет прав администратора.\n\n` +
          `Убедитесь что добавили @${process.env.TELEGRAM_BOT_USERNAME || "tg_buster_bot"} как администратора с правами публикации сообщений.`,
          {
            reply_markup: new InlineKeyboard()
              .text("🔄 Проверить ещё раз", `ch:check_activation:${channelUsername}`)
          }
        )
      }
      return
    }

    const chActivateMatch = data.match(/^ch:activate:(.+)$/)
    if (chActivateMatch) {
      const [ch] = await db.select().from(channelOwners).where(and(eq(channelOwners.id, chActivateMatch[1]), eq(channelOwners.userId, userId))).limit(1)
      if (!ch) return
      if (ch.botIsAdmin) {
        return render(await screenChannel(chActivateMatch[1], userId))
      }
      const activated = await checkAndActivateChannel(ch.channelUsername, from, ctx as never)
      if (activated) {
        return render(await screenChannel(chActivateMatch[1], userId))
      }
      const botUsername = process.env.TELEGRAM_BOT_USERNAME || "tg_buster_bot"
      await ctx.editMessageText(
        `❌ Бот ещё не добавлен в @${ch.channelUsername} или не имеет прав администратора.\n\n` +
        `Добавьте @${botUsername} как администратора с правами публикации сообщений.`,
        {
          reply_markup: new InlineKeyboard()
            .text("🔄 Проверить ещё раз", `ch:activate:${chActivateMatch[1]}`).row()
            .text("‹ К каналу", `ch:view:${chActivateMatch[1]}`),
        }
      )
      return
    }

    const chPromoteAllMatch = data.match(/^ch:promote_all:(.+)$/)
    if (chPromoteAllMatch) {
      const [ch] = await db.select().from(channelOwners).where(and(eq(channelOwners.id, chPromoteAllMatch[1]), eq(channelOwners.userId, userId))).limit(1)
      if (!ch) return
      const data2 = await workerGet(`/api/channels/${ch.channelUsername}/posts?page=1&per_page=100`)
      const allPosts = (data2?.posts || []) as { id: number; seo_slug: string | null; text?: string }[]
      const promotable = allPosts.filter((p) => !p.seo_slug && p.text && p.text.length >= 100)
      let started = 0
      for (const p of promotable) {
        try {
          await fetch(`${WORKER_URL}/api/posts/${p.id}/promote`, {
            method: "POST",
            headers: { "X-Worker-Secret": WORKER_SECRET },
          })
          started++
        } catch { /* skip */ }
      }
      await ctx.editMessageText(
        `⚡ *Запущено ${started} постов!*\n\nSEO-статьи появятся через несколько минут.`,
        {
          parse_mode: "Markdown",
          reply_markup: kb([["‹ К публикациям", `ch:posts:${chPromoteAllMatch[1]}:p:1:all`]])
        }
      )
      return
    }

    const chToggleApChMatch = data.match(/^ch:toggle_ap_ch:(.+)$/)
    if (chToggleApChMatch) {
      const [ch] = await db.select().from(channelOwners).where(and(eq(channelOwners.id, chToggleApChMatch[1]), eq(channelOwners.userId, userId))).limit(1)
      if (!ch) return
      await db.update(channelOwners).set({ autoPublish: !ch.autoPublish }).where(eq(channelOwners.id, chToggleApChMatch[1]))
      return render(await screenChannel(chToggleApChMatch[1], userId))
    }

    const chSelMatch = data.match(/^ch:sel:([^:]+):(\d+)$/)
    if (chSelMatch) {
      const chId = chSelMatch[1]
      const postId = parseInt(chSelMatch[2])
      const sess = await getSession(from.id)
      const selStr = sess.data.selected_posts || ""
      let selIds = selStr ? selStr.split(",").map(Number).filter(Boolean) : []
      if (selIds.includes(postId)) {
        selIds = selIds.filter(id => id !== postId)
      } else {
        selIds.push(postId)
      }
      await setSession(from.id, sess.state, { ...sess.data, selected_posts: selIds.join(",") })
      return render(await screenPosts(chId, userId, selIds))
    }

    const chPromoteSelectedMatch = data.match(/^ch:promote_selected:(.+)$/)
    if (chPromoteSelectedMatch) {
      const chId = chPromoteSelectedMatch[1]
      const [ch] = await db.select().from(channelOwners).where(and(eq(channelOwners.id, chId), eq(channelOwners.userId, userId))).limit(1)
      if (!ch) return
      const sess = await getSession(from.id)
      const selStr = sess.data.selected_posts || ""
      const selIds = selStr ? selStr.split(",").map(Number).filter(Boolean) : []
      let started = 0
      for (const postId of selIds) {
        try {
          await fetch(`${WORKER_URL}/api/posts/${postId}/promote`, {
            method: "POST",
            headers: { "X-Worker-Secret": WORKER_SECRET },
          })
          started++
        } catch {}
      }
      await setSession(from.id, sess.state, { ...sess.data, selected_posts: "" })
      await ctx.editMessageText(
        `⚡ *Запущено ${started} постов!*\n\nSEO-статьи появятся через несколько минут.`,
        { parse_mode: "Markdown", reply_markup: kb([["‹ К публикациям", `ch:posts:${chId}:p:1:all`]]) }
      )
      return
    }

    const chDelayMenuMatch = data.match(/^ch:delay_menu:(.+)$/)
    if (chDelayMenuMatch) {
      const [ch] = await db.select().from(channelOwners).where(and(eq(channelOwners.id, chDelayMenuMatch[1]), eq(channelOwners.userId, userId))).limit(1)
      if (!ch) return
      const delays = [0, 10, 30, 60, 120]
      const delayLabels = ["Без задержки", "10 мин", "30 мин", "1 час", "2 часа"]
      const keyboard = new InlineKeyboard()
      for (let i = 0; i < delays.length; i++) {
        const active = ch.autoPublishDelay === delays[i]
        keyboard.text(active ? `✅ ${delayLabels[i]}` : delayLabels[i], `ch:delay:${chDelayMenuMatch[1]}:${delays[i]}`).row()
      }
      keyboard.text("‹ К настройкам", `ch:settings:${chDelayMenuMatch[1]}`)
      return render({
        text: `⏱ *Задержка публикации*\n\nТекущая: ${ch.autoPublishDelay === 0 ? "без задержки" : ch.autoPublishDelay + " мин"}`,
        keyboard
      })
    }

    const chDelayMatch = data.match(/^ch:delay:([^:]+):(\d+)$/)
    if (chDelayMatch) {
      await db.update(channelOwners).set({ autoPublishDelay: parseInt(chDelayMatch[2]) }).where(and(eq(channelOwners.id, chDelayMatch[1]), eq(channelOwners.userId, userId)))
      return render(await screenSettings(chDelayMatch[1], userId))
    }

  })

  bot.api.setMyCommands([
    { command: "start", description: "Добавить канал и войти в панель" },
    { command: "menu", description: "Главное меню" },
    { command: "cancel", description: "Отменить текущую операцию" },
  ]).catch(() => {})

  bot.api.setChatMenuButton({
    menu_button: { type: "web_app", text: "Открыть панель", web_app: { url: `${SITE_URL}/mini` } },
  }).catch(() => {})

  bot.catch((err: BotError) => {
    if (err.error instanceof GrammyError && err.error.message.includes("message is not modified")) return
    console.error("[bot] Webhook error:", err)
  })

  _bot = bot
  return _bot
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (secret) {
      const headerToken = req.headers.get("x-telegram-bot-api-secret-token")
      if (headerToken !== secret) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const bot = getBot()
    const handleUpdate = webhookCallback(bot, "std/http")
    return await handleUpdate(req)
  } catch (err) {
    if (err instanceof Error && err.message.includes("message is not modified")) {
      return NextResponse.json({ ok: true })
    }
    console.error("[bot] Webhook error:", err)
    return NextResponse.json({ error: "Webhook error" }, { status: 500 })
  }
}
