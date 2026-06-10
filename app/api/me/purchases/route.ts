import { NextResponse } from "next/server"
import { eq, and, desc } from "drizzle-orm"
import { db } from "@/lib/db"
import { purchases, products } from "@/lib/db/schema"
import { getAccessEmail } from "@/lib/session"

export async function GET() {
  const email = await getAccessEmail()
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const rows = await db
      .select({
        id: purchases.id,
        status: purchases.status,
        amount: purchases.amount,
        currency: purchases.currency,
        createdAt: purchases.createdAt,
        productTitle: products.title,
        productImage: products.imageUrl,
        productFile: products.fileUrl,
        productDescription: products.description,
      })
      .from(purchases)
      .leftJoin(products, eq(purchases.productId, products.id))
      .where(and(eq(purchases.email, email), eq(purchases.status, "completed")))
      .orderBy(desc(purchases.createdAt))

    return NextResponse.json({ email, purchases: rows })
  } catch (err) {
    console.log("[v0] me/purchases error:", err)
    return NextResponse.json({ error: "Could not load purchases." }, { status: 500 })
  }
}
