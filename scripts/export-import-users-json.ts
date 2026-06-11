import fs from "node:fs"
import path from "node:path"
import { parse } from "csv-parse/sync"

type ImportRow = Record<string, string | undefined>

const CSV_PATH = path.join(process.cwd(), "data", "import-users.csv")
const JSON_PATH = path.join(process.cwd(), "data", "import-users.json")

function getValue(row: ImportRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (value && value.trim()) return value.trim()
  }
  return ""
}

function normalizeEmail(row: ImportRow) {
  return getValue(row, ["email", "Email", "EMAIL"]).trim().toLowerCase()
}

function guessNameFromEmail(email: string) {
  const beforeAt = email.split("@")[0] || "User"
  return beforeAt
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function normalizeName(row: ImportRow, email: string) {
  const fullName = getValue(row, ["fullName", "Full name", "Full Name", "name", "Name"])
  if (fullName) return fullName

  const firstName = getValue(row, ["First name", "First Name", "firstName", "firstname"])
  const lastName = getValue(row, ["Last name", "Last Name", "lastName", "lastname"])
  const joinedName = `${firstName} ${lastName}`.trim()

  return joinedName || guessNameFromEmail(email)
}

function normalizeSource(row: ImportRow) {
  return (
    getValue(row, [
      "sourcePlatform",
      "Source Platform",
      "source",
      "Source",
      "Which platform do you follow me on?",
    ]) || "imported"
  )
}

function normalizeStatus(row: ImportRow) {
  return getValue(row, ["Status", "status"]) || "Active"
}

if (!fs.existsSync(CSV_PATH)) {
  throw new Error(`CSV file not found: ${CSV_PATH}`)
}

const rawRows = parse(fs.readFileSync(CSV_PATH, "utf8"), {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  bom: true,
}) as ImportRow[]

const rowsByEmail = new Map<
  string,
  {
    email: string
    fullName: string
    sourcePlatform: string
    status: string
  }
>()

for (const row of rawRows) {
  const email = normalizeEmail(row)
  if (!email) continue

  rowsByEmail.set(email, {
    email,
    fullName: normalizeName(row, email),
    sourcePlatform: normalizeSource(row),
    status: normalizeStatus(row),
  })
}

const rows = Array.from(rowsByEmail.values())
fs.writeFileSync(JSON_PATH, `${JSON.stringify(rows, null, 2)}\n`)

console.log("[export-import-users-json:done]", {
  csvPath: CSV_PATH,
  jsonPath: JSON_PATH,
  rawRows: rawRows.length,
  uniqueRows: rows.length,
})
