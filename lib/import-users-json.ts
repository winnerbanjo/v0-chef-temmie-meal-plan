import fs from "node:fs"
import path from "node:path"
import { pool } from "@/lib/db"

const PRODUCT_SLUG = "chef-temmie-student-meal-plan"
const DEFAULT_JSON_PATH = path.join(process.cwd(), "data", "import-users.json")
const DEFAULT_CHECKPOINT_PATH = path.join(process.cwd(), "data", "import-users-checkpoint.json")
const DEFAULT_BATCH_SIZE = 250
const IMPORT_LOCK_ID = 903_110_144
const CHECKPOINT_KEY = "import-users-json"

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
  startBatchIndex: number
  lastCompletedBatchIndex: number
  alreadyRunning: boolean
  message: string
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

function readBundledCheckpoint(checkpointPath = DEFAULT_CHECKPOINT_PATH, resetCheckpoint = false) {
  if (resetCheckpoint || !fs.existsSync(checkpointPath)) {
    return { lastCompletedBatchIndex: -1 }
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(checkpointPath, "utf8"))
    return {
      lastCompletedBatchIndex:
        typeof parsed.lastCompletedBatchIndex === "number" ? parsed.lastCompletedBatchIndex : -1,
    }
  } catch {
    return { lastCompletedBatchIndex: -1 }
  }
}

async function ensureCheckpointTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS import_checkpoints (
      key text PRIMARY KEY,
      last_completed_batch_index integer NOT NULL DEFAULT -1,
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    )`,
  )
}

async function readCheckpoint(checkpointPath = DEFAULT_CHECKPOINT_PATH, resetCheckpoint = false) {
  await ensureCheckpointTable()

  if (resetCheckpoint) {
    await pool.query(
      `INSERT INTO import_checkpoints (key, last_completed_batch_index)
       VALUES ($1, -1)
       ON CONFLICT (key) DO UPDATE
       SET last_completed_batch_index = -1, updated_at = now()`,
      [CHECKPOINT_KEY],
    )
    return { lastCompletedBatchIndex: -1 }
  }

  const existing = await pool.query<{ last_completed_batch_index: number }>(
    `SELECT last_completed_batch_index
     FROM import_checkpoints
     WHERE key = $1`,
    [CHECKPOINT_KEY],
  )
  if (existing.rows[0]) {
    return { lastCompletedBatchIndex: existing.rows[0].last_completed_batch_index }
  }

  const bundledCheckpoint = readBundledCheckpoint(checkpointPath)
  await pool.query(
    `INSERT INTO import_checkpoints (key, last_completed_batch_index)
     VALUES ($1, $2)
     ON CONFLICT (key) DO NOTHING`,
    [CHECKPOINT_KEY, bundledCheckpoint.lastCompletedBatchIndex],
  )
  return bundledCheckpoint
}

async function writeCheckpoint(batchIndex: number) {
  await ensureCheckpointTable()
  await pool.query(
    `INSERT INTO import_checkpoints (key, last_completed_batch_index)
     VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE
     SET last_completed_batch_index = EXCLUDED.last_completed_batch_index,
       updated_at = now()`,
    [CHECKPOINT_KEY, batchIndex],
  )
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
  checkpointPath = DEFAULT_CHECKPOINT_PATH,
  batchSize = DEFAULT_BATCH_SIZE,
  dryRun = false,
  resetCheckpoint = false,
}: {
  filePath?: string
  checkpointPath?: string
  batchSize?: number
  dryRun?: boolean
  resetCheckpoint?: boolean
} = {}): Promise<ImportUsersJsonResult> {
  const rawRows = readImportUsersJson(filePath)
  const normalized = normalizeRows(rawRows)
  const effectiveBatchSize = Math.max(1, batchSize)
  const batches = chunkArray(normalized.rows, effectiveBatchSize)
  const checkpoint = await readCheckpoint(checkpointPath, resetCheckpoint)
  const startBatchIndex = checkpoint.lastCompletedBatchIndex + 1
  const result: ImportUsersJsonResult = {
    productSlug: PRODUCT_SLUG,
    rawRows: rawRows.length,
    validRows: normalized.rows.length,
    imported: 0,
    skipped: normalized.skipped,
    failed: 0,
    dryRun,
    batches: batches.length,
    startBatchIndex,
    lastCompletedBatchIndex: checkpoint.lastCompletedBatchIndex,
    alreadyRunning: false,
    message: dryRun ? "Dry run complete." : "Import complete.",
    errors: [],
  }

  if (dryRun) {
    result.imported = startBatchIndex >= batches.length ? 0 : normalized.rows.slice(startBatchIndex * effectiveBatchSize).length
    result.message =
      startBatchIndex >= batches.length
        ? "All batches have already been completed based on the checkpoint file."
        : "Dry run complete."
    return result
  }

  if (startBatchIndex >= batches.length) {
    return {
      ...result,
      message: "All batches have already been completed based on the checkpoint file.",
    }
  }

  const lockClient = await pool.connect()
  let lockAcquired = false

  try {
    const lock = await lockClient.query<{ locked: boolean }>("SELECT pg_try_advisory_lock($1) AS locked", [
      IMPORT_LOCK_ID,
    ])
    lockAcquired = Boolean(lock.rows[0]?.locked)

    if (!lockAcquired) {
      return {
        ...result,
        alreadyRunning: true,
        message: "Import already running. This tick backed off.",
      }
    }

    for (let batchIndex = startBatchIndex; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      const batchResult = await importBatch(batch, batchIndex)
      result.imported += batchResult.imported
      result.failed += batchResult.failed
      if (batchResult.error) {
        result.errors.push({ batch: batchIndex + 1, message: batchResult.error })
      } else {
        await writeCheckpoint(batchIndex)
        result.lastCompletedBatchIndex = batchIndex
      }
    }
  } finally {
    if (lockAcquired) {
      await lockClient.query("SELECT pg_advisory_unlock($1)", [IMPORT_LOCK_ID]).catch(() => null)
    }
    lockClient.release()
  }

  return result
}
