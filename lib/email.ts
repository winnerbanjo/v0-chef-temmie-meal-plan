import { db } from "@/lib/db"
import { emailLogs } from "@/lib/db/schema"
import { transporter } from "./email/transporter";

// Parse "Name <email@domain>" or use env values as a fallback.
function parseSender(): string {
  const raw = process.env.EMAIL_FROM?.trim()

  if (raw) {
    return raw
  }

  const name = process.env.MAIL_FROM_NAME || "Chef Temmie"
  const email = process.env.MAIL_FROM_EMAIL || "hello@cheftemmie.com"

  return `"${name}" <${email}>`
}


type SendArgs = {
  to: string
  subject: string
  html: string
  type: string
  metadata?: Record<string, unknown>
}





export async function sendEmail({
  to,
  subject,
  html,
  type,
  metadata,
}: SendArgs) {
  let status: "sent" | "failed" = "sent";

  try {
    if (!transporter) {
      console.log(`[email:mock] to=${to} subject="${subject}"`);
    } else {
      await transporter.sendMail({
        from: parseSender(),
        to,
        subject,
        html,
      });

      console.log("[email:sent]", {
        to,
        subject,
        type,
      });
    }
  } catch (err: any) {
    status = "failed";

    console.log("[email:error]", {
      message: err?.message,
      code: err?.code,
      status: err?.response?.status,
      response: err?.response?.data,
    });
  }

  try {
    await db.insert(emailLogs).values({
      email: to,
      type,
      status,
      metadata: metadata ?? null,
    });
  } catch (err) {
    console.log("[email:log-error]", err);
  }

  return { status };
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
