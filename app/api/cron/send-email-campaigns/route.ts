import { NextResponse } from "next/server"
import { processEmailCampaignBatch } from "@/lib/email-campaigns"

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET
  const header = req.headers.get("authorization")
  return Boolean(secret && header === `Bearer ${secret}`)
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await processEmailCampaignBatch({ origin: new URL(req.url).origin })
    return NextResponse.json(result)
  } catch (err) {
    console.log("[email-campaign:cron-error]", err)
    return NextResponse.json({ error: "Could not process email campaign batch." }, { status: 500 })
  }
}
