import { NextResponse } from "next/server"
import { EmailCampaignError, createEmailCampaign, listRecentEmailCampaigns } from "@/lib/email-campaigns"
import { getAdminEmail } from "@/lib/session"
import { emailCampaignSchema } from "@/lib/validation"

export async function GET() {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const campaigns = await listRecentEmailCampaigns()
  return NextResponse.json({ campaigns })
}

export async function POST(req: Request) {
  const adminEmail = await getAdminEmail()
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const parsed = emailCampaignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid campaign." }, { status: 400 })
  }

  try {
    const result = await createEmailCampaign({
      subject: parsed.data.subject,
      body: parsed.data.body,
      createdBy: adminEmail,
    })

    return NextResponse.json({
      message: "Campaign queued successfully.",
      ...result,
    })
  } catch (err) {
    if (err instanceof EmailCampaignError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.log("[email-campaign:create-error]", err)
    return NextResponse.json({ error: "Could not queue campaign." }, { status: 500 })
  }
}
