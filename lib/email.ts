import { db } from "@/lib/db"
import { emailLogs } from "@/lib/db/schema"

const FROM = process.env.EMAIL_FROM || "Chef Temmie <onboarding@resend.dev>"

type SendArgs = {
  to: string
  subject: string
  html: string
  type: string
  metadata?: Record<string, unknown>
}

/**
 * Sends an email via Resend when RESEND_API_KEY is configured.
 * In preview / when no key is set, it logs the email instead so the
 * full flow still works end-to-end. Every send is recorded in email_logs.
 */
export async function sendEmail({ to, subject, html, type, metadata }: SendArgs) {
  let status: "sent" | "failed" = "sent"

  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend")
      const resend = new Resend(process.env.RESEND_API_KEY)
      const { error } = await resend.emails.send({ from: FROM, to, subject, html })
      if (error) {
        status = "failed"
        console.log("[v0] Resend error:", error)
      }
    } else {
      console.log(`[v0] [email:mock] to=${to} subject="${subject}"`)
    }
  } catch (err) {
    status = "failed"
    console.log("[v0] sendEmail error:", err)
  }

  try {
    await db.insert(emailLogs).values({ email: to, type, status, metadata: metadata ?? null })
  } catch (err) {
    console.log("[v0] email log insert error:", err)
  }

  return { status }
}

const baseStyle = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f6fb;padding:32px;color:#1e1b3a`
const card = `max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #ebe9f5`
const btn = `display:inline-block;background:#4338ca;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;margin-top:16px`

export function purchaseConfirmationEmail(fullName: string, purchaseLink: string) {
  return {
    subject: "Your Chef Temmie Student Meal Plan Access is Ready",
    html: `<div style="${baseStyle}"><div style="${card}">
      <h1 style="font-size:20px;margin:0 0 16px">Access confirmed</h1>
      <p style="line-height:1.6;margin:0 0 8px">Hi ${escapeHtml(fullName)},</p>
      <p style="line-height:1.6;margin:0 0 8px">Your access to <strong>Chef Temmie Student Meal Plan</strong> has been created successfully.</p>
      <p style="line-height:1.6;margin:0">Click below to view your purchase:</p>
      <a href="${purchaseLink}" style="${btn}">View my purchase</a>
    </div></div>`,
  }
}

export function otpEmail(otp: string) {
  return {
    subject: "Your purchase access code",
    html: `<div style="${baseStyle}"><div style="${card}">
      <h1 style="font-size:20px;margin:0 0 16px">Your access code</h1>
      <p style="line-height:1.6;margin:0 0 16px">Use the code below to access your meal plan.</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#eef2ff;color:#4338ca;text-align:center;padding:16px;border-radius:12px">${otp}</div>
      <p style="line-height:1.6;margin:16px 0 0;color:#6b7280;font-size:14px">This code expires in 10 minutes.</p>
    </div></div>`,
  }
}

export function broadcastEmail(subject: string, body: string) {
  return {
    subject,
    html: `<div style="${baseStyle}"><div style="${card}">
      <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(subject)}</h1>
      <div style="line-height:1.6;white-space:pre-wrap">${escapeHtml(body)}</div>
    </div></div>`,
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
