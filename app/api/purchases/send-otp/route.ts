import { NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@/lib/db"
import { purchases, otps } from "@/lib/db/schema"
import { sendOtpSchema } from "@/lib/validation"
import { generateOtp, hashOtp, OTP_TTL_MS } from "@/lib/otp"
import { sendEmail, otpEmail } from "@/lib/email"

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const parsed = sendOtpSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }
  const { email } = parsed.data

  try {
    const [purchase] = await db
      .select()
      .from(purchases)
      .where(and(eq(purchases.email, email), eq(purchases.status, "completed")))
      .limit(1)

    if (!purchase) {
      return NextResponse.json({ error: "No purchase found for this email." }, { status: 404 })
    }

    const otp = generateOtp()
    const otpHash = await hashOtp(otp)
    const expiresAt = new Date(Date.now() + OTP_TTL_MS)

    await db.insert(otps).values({ email, otpHash, expiresAt })

    const tpl = otpEmail(otp)
    await sendEmail({ to: email, subject: tpl.subject, html: tpl.html, type: "otp" })

    // In preview without a mail provider, surface the OTP so the flow is testable.
    const devOtp = process.env.RESEND_API_KEY ? undefined : otp

    return NextResponse.json({ success: true, devOtp })
  } catch (err) {
    console.log("[v0] send-otp error:", err)
    return NextResponse.json({ error: "Could not send code. Try again." }, { status: 500 })
  }
}
