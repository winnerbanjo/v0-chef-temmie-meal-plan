import { NextResponse } from "next/server"
import { clearAccessSession } from "@/lib/session"

export async function POST() {
  await clearAccessSession()
  return NextResponse.json({ success: true })
}
