import { NextResponse } from "next/server"
import { suppressEmail, verifyUnsubscribeToken } from "@/lib/email-campaigns"

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")
  if (!token) {
    return new NextResponse("Invalid unsubscribe link.", { status: 400 })
  }

  try {
    const email = await verifyUnsubscribeToken(token)
    await suppressEmail(email, "unsubscribe")
    return new NextResponse("You have been unsubscribed from meal plan emails.", { status: 200 })
  } catch {
    return new NextResponse("Invalid or expired unsubscribe link.", { status: 400 })
  }
}
