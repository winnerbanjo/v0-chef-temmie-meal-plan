import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"

export const appUsers = pgTable("app_users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})


export const subscribers = pgTable(
  "subscribers",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id"),
    email: text("email").notNull(),
    sourcePlatform: text("source_platform"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUniqueIdx: uniqueIndex("subscribers_email_unique_idx").on(table.email),
  })
)

export const purchases = pgTable(
  "purchases",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id"),
    productId: integer("product_id"),
    email: text("email").notNull(),
    amount: integer("amount").notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailProductUniqueIdx: uniqueIndex("purchases_email_product_unique_idx").on(
      table.email,
      table.productId
    ),
  })
)
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  price: integer("price").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  imageUrl: text("image_url"),
  fileUrl: text("file_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const otps = pgTable("otps", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  otpHash: text("otp_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const emailBroadcasts = pgTable("email_broadcasts", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  audience: text("audience").notNull().default("all"),
  status: text("status").notNull().default("pending"),
  recipientCount: integer("recipient_count").notNull().default(0),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("sent"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const emailCampaigns = pgTable(
  "email_campaigns",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull().default("meal_plan"),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    audience: text("audience").notNull().default("subscribers"),
    status: text("status").notNull().default("queued"),
    recipientCount: integer("recipient_count").notNull().default(0),
    sentCount: integer("sent_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    skippedCount: integer("skipped_count").notNull().default(0),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    statusIdx: index("email_campaigns_status_idx").on(table.status),
    createdAtIdx: index("email_campaigns_created_at_idx").on(table.createdAt),
  }),
)

export const emailCampaignRecipients = pgTable(
  "email_campaign_recipients",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id").notNull(),
    email: text("email").notNull(),
    name: text("name"),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    campaignStatusIdx: index("email_campaign_recipients_campaign_status_idx").on(table.campaignId, table.status),
    scheduledIdx: index("email_campaign_recipients_scheduled_idx").on(table.scheduledAt),
    emailIdx: index("email_campaign_recipients_email_idx").on(table.email),
  }),
)

export const emailUsage = pgTable(
  "email_usage",
  {
    id: serial("id").primaryKey(),
    month: text("month").notNull(),
    provider: text("provider").notNull().default("mailtrap"),
    sentCount: integer("sent_count").notNull().default(0),
    monthlyLimit: integer("monthly_limit").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    monthProviderUniqueIdx: uniqueIndex("email_usage_month_provider_unique_idx").on(table.month, table.provider),
  }),
)

export const emailSuppressions = pgTable(
  "email_suppressions",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    reason: text("reason").notNull().default("unsubscribe"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUniqueIdx: uniqueIndex("email_suppressions_email_unique_idx").on(table.email),
  }),
)
