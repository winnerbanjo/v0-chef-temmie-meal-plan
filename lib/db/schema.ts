import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
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
