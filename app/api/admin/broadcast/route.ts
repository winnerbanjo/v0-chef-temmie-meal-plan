import { NextResponse } from "next/server"
import { eq, desc, gte, and, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { appUsers, subscribers, purchases, emailBroadcasts } from "@/lib/db/schema"
import { broadcastSchema } from "@/lib/validation"
import { getAdminEmail } from "@/lib/session"
import { sendEmail, broadcastEmail } from "@/lib/email"

function getPagination(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1)
  const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("pageSize") ?? 10) || 10))

  return { page, pageSize, offset: (page - 1) * pageSize }
}

export async function GET(req: Request) {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { page, pageSize, offset } = getPagination(req)
  const [totalRow] = await db.select({ c: sql<number>`count(*)::int` }).from(emailBroadcasts)
  const total = totalRow?.c ?? 0
  const rows = await db
    .select()
    .from(emailBroadcasts)
    .orderBy(desc(emailBroadcasts.createdAt))
    .limit(pageSize)
    .offset(offset)

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const [todays] = await db
    .select()
    .from(emailBroadcasts)
    .where(and(gte(emailBroadcasts.createdAt, startOfDay), eq(emailBroadcasts.status, "sent")))
    .limit(1)

  return NextResponse.json({
    broadcasts: rows,
    sentToday: Boolean(todays),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  })
}

export async function POST(req: Request) {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const parsed = broadcastSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }
  const { subject, body: messageBody, audience } = parsed.data

  // Safeguard: only one successful broadcast per calendar day.
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const [todays] = await db
    .select()
    .from(emailBroadcasts)
    .where(and(gte(emailBroadcasts.createdAt, startOfDay), eq(emailBroadcasts.status, "sent")))
    .limit(1)

  if (todays) {
    return NextResponse.json(
      { error: "A broadcast has already been sent today. Only one broadcast is allowed per day." },
      { status: 429 },
    )
  }

  // Resolve recipient list by audience.
  let recipients: string[] = []
  try {
    if (audience === "subscribers") {
      const rows = await db
        .select({ email: subscribers.email })
        .from(subscribers)
        .where(eq(subscribers.status, "active"))
      recipients = rows.map((r) => r.email)
    } else if (audience === "purchasers") {
      const rows = await db
        .select({ email: purchases.email })
        .from(purchases)
        .where(eq(purchases.status, "completed"))
      recipients = rows.map((r) => r.email)
    } else {
      const rows = await db.select({ email: appUsers.email }).from(appUsers)
      recipients = rows.map((r) => r.email)
    }
  } catch (err) {
    console.log("[v0] broadcast recipients error:", err)
    return NextResponse.json({ error: "Could not resolve recipients." }, { status: 500 })
  }

  recipients = Array.from(new Set(recipients.filter(Boolean)))

  const [record] = await db
    .insert(emailBroadcasts)
    .values({ subject, body: messageBody, audience, status: "pending", recipientCount: recipients.length })
    .returning()

  try {
    const tpl = broadcastEmail(subject, messageBody)
    for (const to of recipients) {
      await sendEmail({ to, subject: tpl.subject, html: tpl.html, type: "broadcast" })
    }
    const [updated] = await db
      .update(emailBroadcasts)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(emailBroadcasts.id, record.id))
      .returning()
    return NextResponse.json({ success: true, broadcast: updated, recipientCount: recipients.length })
  } catch (err) {
    console.log("[v0] broadcast send error:", err)
    await db.update(emailBroadcasts).set({ status: "failed" }).where(eq(emailBroadcasts.id, record.id))
    return NextResponse.json({ error: "Failed to send broadcast." }, { status: 500 })
  }
}
