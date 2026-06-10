import "dotenv/config"
import fs from "node:fs"
import path from "node:path"
import { parse } from "csv-parse/sync"
import { and, eq } from "drizzle-orm"
import { db, pool } from "../lib/db"
import { appUsers, subscribers, purchases, products } from "../lib/db/schema"

type ImportRow = Record<string, string | undefined>

const PRODUCT_SLUG = "chef-temmie-student-meal-plan"
const CSV_PATH = path.join(process.cwd(), "data", "import-users.csv")
const BATCH_SIZE = 250
const DRY_RUN = process.argv.includes("--dry-run")

function getValue(row: ImportRow, keys: string[]) {
    for (const key of keys) {
        const value = row[key]
        if (value && value.trim()) return value.trim()
    }

    return ""
}

function normalizeEmail(row: ImportRow) {
    return getValue(row, ["email", "Email", "EMAIL"])
        .trim()
        .toLowerCase()
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

    if (joinedName) return joinedName

    return guessNameFromEmail(email)
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

function chunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = []

    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size))
    }

    return chunks
}

async function getProduct() {
    const [product] = await db
        .select()
        .from(products)
        .where(and(eq(products.slug, PRODUCT_SLUG), eq(products.isActive, true)))
        .limit(1)

    if (!product) {
        throw new Error(`Active product not found for slug: ${PRODUCT_SLUG}`)
    }

    return product
}

async function importSingleUser(row: ImportRow, product: typeof products.$inferSelect) {
    const email = normalizeEmail(row)

    if (!email || !email.includes("@")) {
        return {
            status: "skipped",
            reason: "Invalid email",
            email,
            row,
        }
    }

    const fullName = normalizeName(row, email)
    const sourcePlatform = normalizeSource(row)
    const csvStatus = normalizeStatus(row)

    if (csvStatus.toLowerCase() !== "active") {
        return {
            status: "skipped",
            reason: "User is not active",
            email,
            csvStatus,
        }
    }

    if (DRY_RUN) {
        return {
            status: "dry-run",
            email,
            fullName,
            sourcePlatform,
        }
    }

    return await db.transaction(async (tx) => {
        const [existingUser] = await tx
            .select()
            .from(appUsers)
            .where(eq(appUsers.email, email))
            .limit(1)

        let user = existingUser

        if (!user) {
            const [createdUser] = await tx
                .insert(appUsers)
                .values({
                    fullName,
                    email,
                })
                .returning()

            user = createdUser
        } else {
            await tx
                .update(appUsers)
                .set({
                    fullName: existingUser.fullName || fullName,
                    updatedAt: new Date(),
                })
                .where(eq(appUsers.id, existingUser.id))
        }

        if (!user) {
            throw new Error(`Could not create or find user for ${email}`)
        }

        const [existingSubscriber] = await tx
            .select()
            .from(subscribers)
            .where(eq(subscribers.email, email))
            .limit(1)

        if (!existingSubscriber) {
            await tx.insert(subscribers).values({
                userId: user.id,
                email,
                sourcePlatform,
                status: "active",
            })
        } else {
            await tx
                .update(subscribers)
                .set({
                    userId: existingSubscriber.userId || user.id,
                    status: "active",
                    sourcePlatform: existingSubscriber.sourcePlatform || sourcePlatform,
                    updatedAt: new Date(),
                })
                .where(eq(subscribers.id, existingSubscriber.id))
        }

        const [existingPurchase] = await tx
            .select()
            .from(purchases)
            .where(and(eq(purchases.email, email), eq(purchases.productId, product.id)))
            .limit(1)

        if (!existingPurchase) {
            await tx.insert(purchases).values({
                userId: user.id,
                productId: product.id,
                email,
                amount: product.price,
                currency: product.currency,
                status: "completed",
            })
        } else {
            await tx
                .update(purchases)
                .set({
                    userId: existingPurchase.userId || user.id,
                    amount: product.price,
                    currency: product.currency,
                    status: "completed",
                    updatedAt: new Date(),
                })
                .where(eq(purchases.id, existingPurchase.id))
        }

        return {
            status: "imported",
            email,
            fullName,
            userId: user.id,
            productId: product.id,
        }
    })
}

async function main() {
    console.log("[IMPORT_START]", {
        csvPath: CSV_PATH,
        dryRun: DRY_RUN,
        batchSize: BATCH_SIZE,
    })

    if (!fs.existsSync(CSV_PATH)) {
        throw new Error(`CSV file not found: ${CSV_PATH}`)
    }

    const csvContent = fs.readFileSync(CSV_PATH, "utf8")

    const rawRows = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
    }) as ImportRow[]

    console.log("[CSV_HEADERS]", Object.keys(rawRows[0] || {}))

    const rows = rawRows
        .map((row) => ({
            ...row,
            __normalizedEmail: normalizeEmail(row),
        }))
        .filter((row) => row.__normalizedEmail)

    const uniqueRowsMap = new Map<string, ImportRow>()

    for (const row of rows) {
        uniqueRowsMap.set(row.__normalizedEmail as string, row)
    }

    const uniqueRows = Array.from(uniqueRowsMap.values())
    const batches = chunkArray(uniqueRows, BATCH_SIZE)
    const product = await getProduct()

    console.log("[IMPORT_PRODUCT]", {
        id: product.id,
        title: product.title,
        slug: product.slug,
        price: product.price,
        currency: product.currency,
    })

    console.log("[IMPORT_ROWS]", {
        rawRows: rawRows.length,
        validRows: rows.length,
        uniqueRows: uniqueRows.length,
        batches: batches.length,
    })

    console.log("[IMPORT_SAMPLE]", uniqueRows.slice(0, 3).map((row) => ({
        email: normalizeEmail(row),
        fullName: normalizeName(row, normalizeEmail(row)),
        sourcePlatform: normalizeSource(row),
        status: normalizeStatus(row),
    })))

    let imported = 0
    let skipped = 0
    let failed = 0

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]

        console.log("[IMPORT_BATCH_START]", {
            batch: batchIndex + 1,
            totalBatches: batches.length,
            size: batch.length,
        })

        for (const row of batch) {
            try {
                const result = await importSingleUser(row, product)

                if (result.status === "imported" || result.status === "dry-run") {
                    imported++
                } else {
                    skipped++
                    console.log("[IMPORT_SKIPPED]", result)
                }
            } catch (error: any) {
                failed++
                console.error("[IMPORT_FAILED]", {
                    email: normalizeEmail(row),
                    message: error.message,
                    code: error.code,
                })
            }
        }

        console.log("[IMPORT_BATCH_DONE]", {
            batch: batchIndex + 1,
            imported,
            skipped,
            failed,
        })

        await new Promise((resolve) => setTimeout(resolve, 300))
    }

    console.log("[IMPORT_DONE]", {
        imported,
        skipped,
        failed,
        dryRun: DRY_RUN,
    })
}

main()
    .catch((error) => {
        console.error("[IMPORT_FATAL]", error)
        process.exit(1)
    })
    .finally(async () => {
        await pool.end()
    })