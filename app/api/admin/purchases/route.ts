import { NextResponse } from "next/server"
import { eq, desc, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { purchases, products } from "@/lib/db/schema"
import { getAdminEmail } from "@/lib/session"

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

  try {
    const { page, pageSize, offset } = getPagination(req)
    const [totalRow] = await db.select({ c: sql<number>`count(*)::int` }).from(purchases)
    const total = totalRow?.c ?? 0
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
      .limit(pageSize)
      .offset(offset)

    return NextResponse.json({
      purchases: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    })
  } catch (err) {
    console.log("[v0] admin/purchases error:", err)
    return NextResponse.json({ error: "Could not load purchases." }, { status: 500 })
  }
}
