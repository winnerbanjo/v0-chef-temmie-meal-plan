import { NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@/lib/db"
import { appUsers, subscribers, purchases, products } from "@/lib/db/schema"
import { checkoutSchema } from "@/lib/validation"
import { sendEmail, purchaseConfirmationEmail } from "@/lib/email"

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    )
  }

  const { fullName, email, sourcePlatform, productId } = parsed.data

  try {
    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1)
    if (!product || !product.isActive) {
      return NextResponse.json({ error: "Product not available" }, { status: 404 })
    }

    // Upsert user
    let [user] = await db.select().from(appUsers).where(eq(appUsers.email, email)).limit(1)
    if (!user) {
      ;[user] = await db.insert(appUsers).values({ fullName, email }).returning()
    } else {
      ;[user] = await db
        .update(appUsers)
        .set({ fullName, updatedAt: new Date() })
        .where(eq(appUsers.id, user.id))
        .returning()
    }

    // Upsert subscriber
    const [existingSub] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, email))
      .limit(1)
    if (!existingSub) {
      await db.insert(subscribers).values({ userId: user.id, email, sourcePlatform, status: "active" })
    } else {
      await db
        .update(subscribers)
        .set({ sourcePlatform, status: "active", userId: user.id, updatedAt: new Date() })
        .where(eq(subscribers.id, existingSub.id))
    }

    // Create purchase (completed if free)
    const isFree = product.price === 0
    const [existingPurchase] = await db
      .select()
      .from(purchases)
      .where(and(eq(purchases.email, email), eq(purchases.productId, product.id)))
      .limit(1)

    if (!existingPurchase) {
      await db.insert(purchases).values({
        userId: user.id,
        productId: product.id,
        email,
        amount: product.price,
        currency: product.currency,
        status: isFree ? "completed" : "pending",
      })
    } else if (isFree && existingPurchase.status !== "completed") {
      await db
        .update(purchases)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(purchases.id, existingPurchase.id))
    }

    // Send confirmation email
    const origin = new URL(req.url).origin
    const purchaseLink = `${origin}/purchases`
    const tpl = purchaseConfirmationEmail(fullName, purchaseLink)
    await sendEmail({ to: email, subject: tpl.subject, html: tpl.html, type: "purchase_confirmation" })

    return NextResponse.json({ success: true, free: isFree })
  } catch (err) {
    console.log("[v0] checkout error:", err)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
