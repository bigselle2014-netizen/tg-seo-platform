import { pgTable, text, integer, boolean, timestamp, pgEnum, unique, bigint, jsonb } from "drizzle-orm/pg-core"

export const planEnum = pgEnum("plan", ["free", "hobby", "pro", "business"])
export const messengerEnum = pgEnum("messenger_type", ["telegram", "max"])

// Better Auth tables
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  plan: planEnum("plan").default("free"),
  postsLimit: integer("posts_limit").notNull().default(10),
  telegramId: text("telegram_id"),
  telegramUsername: text("telegram_username"),
  telegramPhoneNumber: text("telegram_phone_number"),
})

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
})

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  telegramId: text("telegram_id"),
  telegramUsername: text("telegram_username"),
})

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// SaaS-specific tables
export const channelOwners = pgTable("channel_owners", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channelUsername: text("channel_username").notNull(),
  messengerType: messengerEnum("messenger_type").notNull().default("telegram"),
  channelTgId: text("channel_tg_id"),
  channelTitle: text("channel_title"),
  botIsAdmin: boolean("bot_is_admin").notNull().default(false),
  inviteLink: text("invite_link"),
  status: text("status").notNull().default("pending"),
  postsIndexed: integer("posts_indexed").notNull().default(0),
  isArchived: boolean("is_archived").notNull().default(false),
  autoPublish: boolean("auto_publish").notNull().default(true),
  autoPublishDelay: integer("auto_publish_delay").notNull().default(30),
  seoAuditText: text("seo_audit_text"),
  seoAuditedAt: timestamp("seo_audited_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  usernameMessengerUnique: unique("channel_owners_username_messenger_unique")
    .on(table.channelUsername, table.messengerType),
}))

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: planEnum("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const tgAuthRequests = pgTable("tg_auth_requests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending | complete | expired
  telegramId: text("telegram_id"),
  telegramName: text("telegram_name"),
  telegramUsername: text("telegram_username"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
})

export const botSessions = pgTable("bot_sessions", {
  telegramId: bigint("telegram_id", { mode: "number" }).primaryKey(),
  state: text("state").notNull().default("idle"),
  data: jsonb("data").$type<Record<string, string>>().default({}),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const blogPosts = pgTable("blog_posts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  h1: text("h1").notNull(),
  description: text("description").notNull(),
  contentHtml: text("content_html").notNull(),
  category: text("category").notNull().default("SEO"),
  imageUrl: text("image_url"),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const analyticsEvents = pgTable("analytics_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  channelUsername: text("channel_username").notNull(),
  eventType: text("event_type").notNull(), // "page_view" | "tg_click"
  pageSlug: text("page_slug"),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})
