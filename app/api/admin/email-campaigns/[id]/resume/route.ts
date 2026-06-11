import { NextResponse } from "next/server"
import { EmailCampaignError, resumeEmailCampaign } from "@/lib/email-campaigns"
import { getAdminEmail } from "@/lib/session"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const campaignId = Number(id)
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return NextResponse.json({ error: "Invalid campaign id." }, { status: 400 })
  }

  try {
    await resumeEmailCampaign(campaignId)
    return NextResponse.json({ message: "Campaign resumed." })
  } catch (err) {
    if (err instanceof EmailCampaignError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.log("[email-campaign:resume-error]", err)
    return NextResponse.json({ error: "Could not resume campaign." }, { status: 500 })
  }
}
