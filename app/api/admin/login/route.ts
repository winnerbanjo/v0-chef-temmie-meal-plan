import { NextResponse } from "next/server"
import { adminLoginSchema } from "@/lib/validation"
import { checkAdminCredentials, createAdminSession, clearAdminSession } from "@/lib/session"

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const parsed = adminLoginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your email and password" }, { status: 400 })
  }

  const { email, password } = parsed.data
  if (!checkAdminCredentials(email, password)) {
    return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 })
  }

  await createAdminSession(email)
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  await clearAdminSession()
  return NextResponse.json({ success: true })
}
