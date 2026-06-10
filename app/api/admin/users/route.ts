import { NextResponse } from "next/server"
import { eq, desc, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { appUsers, subscribers } from "@/lib/db/schema"
import { getAdminEmail } from "@/lib/session"

export async function GET() {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const rows = await db
      .select({
        id: appUsers.id,
        fullName: appUsers.fullName,
        email: appUsers.email,
        createdAt: appUsers.createdAt,
        platform: sql<string | null>`max(${subscribers.sourcePlatform})`,
        subscriberStatus: sql<string | null>`max(${subscribers.status})`,
      })
      .from(appUsers)
      .leftJoin(subscribers, eq(subscribers.email, appUsers.email))
      .groupBy(appUsers.id, appUsers.fullName, appUsers.email, appUsers.createdAt)
      .orderBy(desc(appUsers.createdAt))

    return NextResponse.json({ users: rows })
  } catch (err) {
    console.log("[v0] admin/users error:", err)
    return NextResponse.json({ error: "Could not load users." }, { status: 500 })
  }
}
