import { NextResponse } from "next/server"
import { sql, eq, isNotNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { appUsers, subscribers, purchases, emailLogs, otps } from "@/lib/db/schema"
import { getAdminEmail } from "@/lib/session"

export async function GET() {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [users] = await db.select({ c: sql<number>`count(*)::int` }).from(appUsers)
    const [subs] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(subscribers)
      .where(eq(subscribers.status, "active"))
    const [purch] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(purchases)
      .where(eq(purchases.status, "completed"))
    const [emails] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(emailLogs)
      .where(eq(emailLogs.status, "sent"))
    const [otpVerifs] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(otps)
      .where(isNotNull(otps.usedAt))

    return NextResponse.json({
      totalUsers: users?.c ?? 0,
      totalSubscribers: subs?.c ?? 0,
      totalPurchases: purch?.c ?? 0,
      totalEmailsSent: emails?.c ?? 0,
      totalOtpVerifications: otpVerifs?.c ?? 0,
    })
  } catch (err) {
    console.log("[v0] admin/stats error:", err)
    return NextResponse.json({ error: "Could not load stats." }, { status: 500 })
  }
}
