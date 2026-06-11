import { NextResponse } from "next/server"
import { getEmailUsageSummary } from "@/lib/email-campaigns"
import { getAdminEmail } from "@/lib/session"

export async function GET() {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    return NextResponse.json(await getEmailUsageSummary())
  } catch (err) {
    console.log("[email-usage:error]", err)
    return NextResponse.json({ error: "Could not load email usage." }, { status: 500 })
  }
}
