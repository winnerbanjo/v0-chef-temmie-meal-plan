import { NextResponse } from "next/server"
import { eq, and, isNull, desc, gt } from "drizzle-orm"
import { db } from "@/lib/db"
import { otps } from "@/lib/db/schema"
import { verifyOtpSchema } from "@/lib/validation"
import { verifyOtp } from "@/lib/otp"
import { createAccessSession } from "@/lib/session"

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const parsed = verifyOtpSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }
  const { email, otp } = parsed.data

  try {
    const [record] = await db
      .select()
      .from(otps)
      .where(and(eq(otps.email, email), isNull(otps.usedAt), gt(otps.expiresAt, new Date())))
      .orderBy(desc(otps.createdAt))
      .limit(1)

    if (!record) {
      return NextResponse.json({ error: "Code expired or not found. Request a new one." }, { status: 400 })
    }

    const ok = await verifyOtp(otp, record.otpHash)
    if (!ok) {
      return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 400 })
    }

    await db.update(otps).set({ usedAt: new Date() }).where(eq(otps.id, record.id))
    await createAccessSession(email)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.log("[v0] verify-otp error:", err)
    return NextResponse.json({ error: "Could not verify code. Try again." }, { status: 500 })
  }
}
