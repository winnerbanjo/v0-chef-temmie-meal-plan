import fs from "node:fs"
import path from "node:path"
import { pool } from "@/lib/db"

const PRODUCT_SLUG = "chef-temmie-student-meal-plan"
const DEFAULT_JSON_PATH = path.join(process.cwd(), "data", "import-users.json")
const DEFAULT_BATCH_SIZE = 1000

export type ImportUserJsonRow = {
  email: string
  fullName: string
  sourcePlatform: string
  status?: string
}

export type ImportUsersJsonResult = {
  productSlug: string
  rawRows: number
  validRows: number
  imported: number
  skipped: number
  failed: number
  dryRun: boolean
  batches: number
  errors: Array<{ batch: number; message: string }>
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function normalizeRows(rows: ImportUserJsonRow[]) {
  const uniqueRows = new Map<string, ImportUserJsonRow>()
  let skipped = 0

  for (const row of rows) {
    const email = String(row.email || "").trim().toLowerCase()
    const status = String(row.status || "active").trim().toLowerCase()

    if (!email || !isValidEmail(email) || status !== "active") {
      skipped += 1
      continue
    }

    uniqueRows.set(email, {
      email,
      fullName: String(row.fullName || email.split("@")[0] || "User").trim(),
      sourcePlatform: String(row.sourcePlatform || "imported").trim(),
      status: "active",
    })
  }

  return {
    rows: Array.from(uniqueRows.values()),
    skipped,
  }
}

export function readImportUsersJson(filePath = DEFAULT_JSON_PATH) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Import JSON file not found: ${filePath}`)
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"))
  if (!Array.isArray(parsed)) {
    throw new Error("Import JSON must be an array of user rows.")
  }

  return parsed as ImportUserJsonRow[]
}

async function importBatch(rows: ImportUserJsonRow[], batchIndex: number) {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    const product = await client.query<{
      id: number
      price: number
      currency: string
    }>(
      `SELECT id, price, currency
       FROM products
       WHERE slug = $1 AND is_active = true
       LIMIT 1`,
      [PRODUCT_SLUG],
    )

    const productRow = product.rows[0]
    if (!productRow) {
      throw new Error(`Active product not found for slug: ${PRODUCT_SLUG}`)
    }

    await client.query(
      `WITH input AS (
         SELECT *
         FROM jsonb_to_recordset($1::jsonb)
           AS r(email text, "fullName" text, "sourcePlatform" text)
       )
       INSERT INTO app_users (full_name, email)
       SELECT COALESCE(NULLIF("fullName", ''), split_part(email, '@', 1)), email
       FROM input
       ON CONFLICT (email) DO UPDATE
       SET full_name = COALESCE(NULLIF(app_users.full_name, ''), EXCLUDED.full_name),
         updated_at = now()`,
      [JSON.stringify(rows)],
    )

    await client.query(
      `WITH input AS (
         SELECT *
         FROM jsonb_to_recordset($1::jsonb)
           AS r(email text, "sourcePlatform" text)
       )
       INSERT INTO subscribers (user_id, email, source_platform, status)
       SELECT u.id, input.email, COALESCE(NULLIF(input."sourcePlatform", ''), 'imported'), 'active'
       FROM input
       INNER JOIN app_users u ON u.email = input.email
       ON CONFLICT (email) DO UPDATE
       SET user_id = COALESCE(subscribers.user_id, EXCLUDED.user_id),
         source_platform = COALESCE(NULLIF(subscribers.source_platform, ''), EXCLUDED.source_platform),
         status = 'active',
         updated_at = now()`,
      [JSON.stringify(rows)],
    )

    await client.query(
      `WITH input AS (
         SELECT *
         FROM jsonb_to_recordset($1::jsonb)
           AS r(email text)
       )
       INSERT INTO purchases (user_id, product_id, email, amount, currency, status)
       SELECT u.id, $2, input.email, $3, $4, 'completed'
       FROM input
       INNER JOIN app_users u ON u.email = input.email
       ON CONFLICT (email, product_id) DO UPDATE
       SET user_id = COALESCE(purchases.user_id, EXCLUDED.user_id),
         amount = EXCLUDED.amount,
         currency = EXCLUDED.currency,
         status = 'completed',
         updated_at = now()`,
      [JSON.stringify(rows), productRow.id, productRow.price, productRow.currency],
    )

    await client.query("COMMIT")
    return { imported: rows.length, failed: 0 }
  } catch (err) {
    await client.query("ROLLBACK")
    const message = err instanceof Error ? err.message : "Unknown import error"
    console.error("[import-users-json:batch-failed]", { batch: batchIndex + 1, message })
    return { imported: 0, failed: rows.length, error: message }
  } finally {
    client.release()
  }
}

export async function importUsersFromJson({
  filePath = DEFAULT_JSON_PATH,
  batchSize = DEFAULT_BATCH_SIZE,
  dryRun = false,
}: {
  filePath?: string
  batchSize?: number
  dryRun?: boolean
} = {}): Promise<ImportUsersJsonResult> {
  const rawRows = readImportUsersJson(filePath)
  const normalized = normalizeRows(rawRows)
  const batches = chunkArray(normalized.rows, Math.max(1, batchSize))
  const result: ImportUsersJsonResult = {
    productSlug: PRODUCT_SLUG,
    rawRows: rawRows.length,
    validRows: normalized.rows.length,
    imported: 0,
    skipped: normalized.skipped,
    failed: 0,
    dryRun,
    batches: batches.length,
    errors: [],
  }

  if (dryRun) {
    result.imported = normalized.rows.length
    return result
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    const batchResult = await importBatch(batch, batchIndex)
    result.imported += batchResult.imported
    result.failed += batchResult.failed
    if (batchResult.error) {
      result.errors.push({ batch: batchIndex + 1, message: batchResult.error })
    }
  }

  return result
}
