import { NextResponse } from "next/server"
import { importUsersFromJson } from "@/lib/import-users-json"

export const runtime = "nodejs"
export const maxDuration = 60

function isAuthorized(req: Request) {
  const secret = process.env.IMPORT_USERS_SECRET || process.env.CRON_SECRET
  const header = req.headers.get("authorization")
  return Boolean(secret && header === `Bearer ${secret}`)
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const dryRun = url.searchParams.get("dryRun") === "true"
  const resetCheckpoint = url.searchParams.get("resetCheckpoint") === "true"
  const batchSize = Number(url.searchParams.get("batchSize") || "250")

  try {
    const result = await importUsersFromJson({
      dryRun,
      resetCheckpoint,
      batchSize: Number.isFinite(batchSize) ? batchSize : 250,
    })

    return NextResponse.json(result, { status: result.failed > 0 ? 207 : 200 })
  } catch (err) {
    console.log("[import-users:cron-error]", err)
    return NextResponse.json({ error: "Could not import users." }, { status: 500 })
  }
}

export async function POST(req: Request) {
  return GET(req)
}
