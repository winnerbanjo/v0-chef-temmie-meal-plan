import "dotenv/config"
import { pool } from "../lib/db"
import { importUsersFromJson } from "../lib/import-users-json"

const DRY_RUN = process.argv.includes("--dry-run")
const batchSizeArg = process.argv.find((arg) => arg.startsWith("--batch-size="))
const batchSize = batchSizeArg ? Number(batchSizeArg.split("=")[1]) : undefined

async function main() {
  const result = await importUsersFromJson({
    dryRun: DRY_RUN,
    batchSize: Number.isFinite(batchSize) ? batchSize : undefined,
  })

  console.log("[import-users-json:done]", result)

  if (result.failed > 0) {
    process.exitCode = 1
  }
}

main()
  .catch((err) => {
    console.error("[import-users-json:fatal]", err)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
