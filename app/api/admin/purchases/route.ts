import { NextResponse } from "next/server"
import { eq, desc } from "drizzle-orm"
import { db } from "@/lib/db"
import { purchases, products } from "@/lib/db/schema"
import { getAdminEmail } from "@/lib/session"

export async function GET() {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const rows = await db
      .select({
        id: purchases.id,
        email: purchases.email,
        product: products.title,
        status: purchases.status,
        amount: purchases.amount,
        currency: purchases.currency,
        createdAt: purchases.createdAt,
      })
      .from(purchases)
      .leftJoin(products, eq(purchases.productId, products.id))
      .orderBy(desc(purchases.createdAt))

    return NextResponse.json({ purchases: rows })
  } catch (err) {
    console.log("[v0] admin/purchases error:", err)
    return NextResponse.json({ error: "Could not load purchases." }, { status: 500 })
  }
}
