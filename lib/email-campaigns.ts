import { SignJWT, jwtVerify } from "jose"
import type { Pool, PoolClient } from "pg"
import { pool } from "@/lib/db"
import { sendMailtrapBulkEmail, type MailtrapBulkEmailArgs, MailtrapBulkError } from "@/lib/email/mailtrap-bulk"

const PROVIDER = "mailtrap"
const MAX_ATTEMPTS = 3
const CRON_LOCK_ID = 428_014_920

type DbClient = PoolClient
type Queryable = Pick<Pool | PoolClient, "query">

export type CampaignStatus = "queued" | "sending" | "sent" | "paused" | "failed" | "cancelled"
export type RecipientStatus = "pending" | "sending" | "sent" | "failed" | "skipped"

export type CampaignRow = {
  id: number
  subject: string
  body: string
  audience: string
  status: CampaignStatus
  recipient_count: number
  sent_count: number
  failed_count: number
  skipped_count: number
  created_by: string
  created_at: Date
  started_at: Date | null
  completed_at: Date | null
}

export type CampaignRecipientRow = {
  id: number
  campaign_id: number
  email: string
  name: string | null
  status: RecipientStatus
  attempts: number
  last_error: string | null
  scheduled_at: Date
  locked_at: Date | null
  sent_at: Date | null
  created_at: Date
}

export class EmailCampaignError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "EmailCampaignError"
    this.status = status
  }
}

export type EmailUsageSummary = {
  month: string
  monthlyLimit: number
  used: number
  safetyBuffer: number
  available: number
  eligibleSubscriberCount: number
}

type Sender = (args: MailtrapBulkEmailArgs) => Promise<unknown>

async function mockEmailCampaignSender({ to, subject, deliveryReference }: MailtrapBulkEmailArgs) {
  console.log(`[email-campaign:mock-send] accepted to=${to} subject="${subject}" ref=${deliveryReference}`)
  return { status: 202, mocked: true }
}

function getDefaultCampaignSender(): Sender {
  return process.env.EMAIL_CAMPAIGN_MOCK_SENDS === "true" ? mockEmailCampaignSender : sendMailtrapBulkEmail
}

function envInt(name: string, fallback: number) {
  const parsed = Number(process.env[name])
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export function getEmailCampaignConfig() {
  return {
    monthlyLimit: envInt("MONTHLY_EMAIL_LIMIT", 100_000),
    safetyBuffer: envInt("MONTHLY_EMAIL_SAFETY_BUFFER", 5_000),
    batchSize: Math.max(1, Math.min(500, envInt("EMAIL_BATCH_SIZE_PER_CRON", 20))),
  }
}

export function getCurrentEmailUsageMonth(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

function emailTokenSecret() {
  return new TextEncoder().encode(
    process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET || "dev-insecure-secret-change-me-please-32",
  )
}

function appBaseUrl(origin?: string) {
  if (origin) return origin
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.APP_URL) return process.env.APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}

export async function createUnsubscribeToken(email: string) {
  return new SignJWT({ email: email.toLowerCase(), kind: "unsubscribe" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(emailTokenSecret())
}

export async function verifyUnsubscribeToken(token: string) {
  const { payload } = await jwtVerify(token, emailTokenSecret())
  if (payload.kind !== "unsubscribe" || typeof payload.email !== "string") {
    throw new Error("Invalid unsubscribe token.")
  }
  return payload.email.toLowerCase()
}

export async function createUnsubscribeUrl(email: string, origin?: string) {
  const token = await createUnsubscribeToken(email)
  return `${appBaseUrl(origin)}/api/unsubscribe?token=${encodeURIComponent(token)}`
}

function appendCampaignFooter(html: string, unsubscribeUrl: string) {
  return `${html}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px" />
<p style="color:#6b7280;font-size:13px;line-height:1.5">
  You are receiving this because you subscribed to receive meal plans.<br />
  Unsubscribe: <a href="${unsubscribeUrl}" style="color:#4338ca">${unsubscribeUrl}</a>
</p>`
}

async function ensureUsageRow(client: Queryable, month: string, monthlyLimit: number) {
  const result = await client.query<{
    sent_count: number
    monthly_limit: number
  }>(
    `INSERT INTO email_usage (month, provider, sent_count, monthly_limit)
     VALUES ($1, $2, 0, $3)
     ON CONFLICT (month, provider)
     DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit, updated_at = now()
     RETURNING sent_count, monthly_limit`,
    [month, PROVIDER, monthlyLimit],
  )
  return result.rows[0]
}

async function getUsageRow(client: Queryable, forUpdate = false) {
  const { monthlyLimit, safetyBuffer } = getEmailCampaignConfig()
  const month = getCurrentEmailUsageMonth()
  const usage = await ensureUsageRow(client, month, monthlyLimit)

  if (forUpdate) {
    const locked = await client.query<{ sent_count: number; monthly_limit: number }>(
      `SELECT sent_count, monthly_limit
       FROM email_usage
       WHERE month = $1 AND provider = $2
       FOR UPDATE`,
      [month, PROVIDER],
    )
    return {
      month,
      monthlyLimit: locked.rows[0]?.monthly_limit ?? monthlyLimit,
      used: locked.rows[0]?.sent_count ?? usage.sent_count,
      safetyBuffer,
      available: Math.max(0, (locked.rows[0]?.monthly_limit ?? monthlyLimit) - safetyBuffer - (locked.rows[0]?.sent_count ?? usage.sent_count)),
    }
  }

  return {
    month,
    monthlyLimit: usage.monthly_limit,
    used: usage.sent_count,
    safetyBuffer,
    available: Math.max(0, usage.monthly_limit - safetyBuffer - usage.sent_count),
  }
}

export async function countEligibleSubscribers(client: Queryable = pool) {
  const result = await client.query<{ count: string }>(
    `SELECT count(*)::int AS count
     FROM subscribers s
     WHERE s.status = 'active'
       AND s.email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$'
       AND NOT EXISTS (
         SELECT 1 FROM email_suppressions es WHERE lower(es.email) = lower(s.email)
       )`,
  )
  return Number(result.rows[0]?.count ?? 0)
}

async function getEligibleSubscriberRows(client: Queryable, emails?: string[]) {
  if (emails?.length) {
    const normalized = Array.from(new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)))
    const result = await client.query<{ email: string; name: string | null }>(
      `SELECT DISTINCT ON (lower(s.email))
        lower(s.email) AS email,
        au.full_name AS name
       FROM subscribers s
       LEFT JOIN app_users au ON lower(au.email) = lower(s.email)
       WHERE s.status = 'active'
         AND lower(s.email) = ANY($1)
         AND s.email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$'
         AND NOT EXISTS (
           SELECT 1 FROM email_suppressions es WHERE lower(es.email) = lower(s.email)
         )
       ORDER BY lower(s.email), s.created_at DESC`,
      [normalized],
    )
    return result.rows
  }

  const result = await client.query<{ email: string; name: string | null }>(
    `SELECT DISTINCT ON (lower(s.email))
      lower(s.email) AS email,
      au.full_name AS name
     FROM subscribers s
     LEFT JOIN app_users au ON lower(au.email) = lower(s.email)
     WHERE s.status = 'active'
       AND s.email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$'
       AND NOT EXISTS (
         SELECT 1 FROM email_suppressions es WHERE lower(es.email) = lower(s.email)
       )
     ORDER BY lower(s.email), s.created_at DESC`,
  )
  return result.rows
}

export async function getEmailUsageSummary(): Promise<EmailUsageSummary> {
  const usage = await getUsageRow(pool)
  const eligibleSubscriberCount = await countEligibleSubscribers(pool)

  return {
    ...usage,
    eligibleSubscriberCount,
  }
}

export async function createEmailCampaign({
  subject,
  body,
  createdBy,
  recipientEmails,
}: {
  subject: string
  body: string
  createdBy: string
  recipientEmails?: string[]
}) {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query("SELECT pg_advisory_xact_lock($1)", [CRON_LOCK_ID])

    const active = await client.query<{ id: number }>(
      `SELECT id FROM email_campaigns
       WHERE status IN ('queued', 'sending')
       LIMIT 1`,
    )
    if (active.rows[0]) {
      throw new EmailCampaignError("Another email campaign is already queued or sending.", 409)
    }

    const recipients = await getEligibleSubscriberRows(client, recipientEmails)
    if (recipients.length === 0) {
      throw new EmailCampaignError("No eligible active subscribers were found.", 400)
    }

    const usage = await getUsageRow(client, true)
    if (recipients.length > usage.available) {
      throw new EmailCampaignError(
        "Not enough monthly email allowance. Reduce audience or upgrade Mailtrap plan.",
        409,
      )
    }

    const campaign = await client.query<{ id: number }>(
      `INSERT INTO email_campaigns (subject, body, audience, status, recipient_count, created_by)
       VALUES ($1, $2, 'subscribers', 'queued', $3, $4)
       RETURNING id`,
      [subject, body, recipients.length, createdBy],
    )
    const campaignId = campaign.rows[0].id

    for (let i = 0; i < recipients.length; i += 1000) {
      const chunk = recipients.slice(i, i + 1000)
      const values: unknown[] = []
      const placeholders = chunk
        .map((recipient, index) => {
          const base = index * 3
          values.push(campaignId, recipient.email, recipient.name)
          return `($${base + 1}, $${base + 2}, $${base + 3})`
        })
        .join(",")

      await client.query(
        `INSERT INTO email_campaign_recipients (campaign_id, email, name)
         VALUES ${placeholders}`,
        values,
      )
    }

    await client.query("COMMIT")

    return {
      campaignId,
      recipientCount: recipients.length,
      remainingMonthlyAllowanceAfterQueue: usage.available - recipients.length,
    }
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

export async function listRecentEmailCampaigns(limit = 20) {
  const result = await pool.query<CampaignRow>(
    `SELECT *
     FROM email_campaigns
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  )
  return result.rows
}

async function recomputeCampaignCounts(client: Queryable, campaignId: number) {
  await client.query(
    `UPDATE email_campaigns c
     SET
       sent_count = counts.sent_count,
       failed_count = counts.failed_count,
       skipped_count = counts.skipped_count
     FROM (
       SELECT
         count(*) FILTER (WHERE status = 'sent')::int AS sent_count,
         count(*) FILTER (WHERE status = 'failed')::int AS failed_count,
         count(*) FILTER (WHERE status = 'skipped')::int AS skipped_count
       FROM email_campaign_recipients
       WHERE campaign_id = $1
     ) counts
     WHERE c.id = $1`,
    [campaignId],
  )
}

async function completeCampaignIfDone(client: Queryable, campaignId: number) {
  const remaining = await client.query<{ count: string }>(
    `SELECT count(*)::int AS count
     FROM email_campaign_recipients
     WHERE campaign_id = $1 AND status IN ('pending', 'sending')`,
    [campaignId],
  )
  if (Number(remaining.rows[0]?.count ?? 0) > 0) return false

  await recomputeCampaignCounts(client, campaignId)
  const counts = await client.query<{ failed_count: number }>(
    `SELECT failed_count FROM email_campaigns WHERE id = $1`,
    [campaignId],
  )
  await client.query(
    `UPDATE email_campaigns
     SET status = $2, completed_at = now()
     WHERE id = $1 AND status IN ('queued', 'sending')`,
    [campaignId, counts.rows[0]?.failed_count ? "failed" : "sent"],
  )
  return true
}

async function markRecipientSkipped(client: Queryable, recipientId: number, reason: string) {
  await client.query(
    `UPDATE email_campaign_recipients
     SET status = 'skipped', locked_at = NULL, last_error = $2
     WHERE id = $1`,
    [recipientId, reason],
  )
}

async function markRecipientSent(client: Queryable, recipientId: number) {
  await client.query(
    `UPDATE email_campaign_recipients
     SET status = 'sent', sent_at = now(), locked_at = NULL, last_error = NULL
     WHERE id = $1`,
    [recipientId],
  )
}

async function markRecipientFailure(client: Queryable, recipient: CampaignRecipientRow, message: string) {
  const nextAttempts = recipient.attempts + 1
  const finalStatus = nextAttempts >= MAX_ATTEMPTS ? "failed" : "pending"
  await client.query(
    `UPDATE email_campaign_recipients
     SET status = $2,
       attempts = $3,
       last_error = $4,
       locked_at = NULL,
       scheduled_at = CASE WHEN $2 = 'pending' THEN now() + interval '5 minutes' ELSE scheduled_at END
     WHERE id = $1`,
    [recipient.id, finalStatus, nextAttempts, message.slice(0, 1000)],
  )
}

async function incrementUsageAfterAcceptedSend(client: Queryable) {
  const { monthlyLimit } = getEmailCampaignConfig()
  const month = getCurrentEmailUsageMonth()
  await ensureUsageRow(client, month, monthlyLimit)
  await client.query(
    `UPDATE email_usage
     SET sent_count = sent_count + 1, updated_at = now()
     WHERE month = $1 AND provider = $2`,
    [month, PROVIDER],
  )
}

async function isSuppressed(client: Queryable, email: string) {
  const result = await client.query(
    `SELECT 1 FROM email_suppressions WHERE lower(email) = lower($1) LIMIT 1`,
    [email],
  )
  return Boolean(result.rows[0])
}

async function pauseCampaign(client: Queryable, campaignId: number, reason: string) {
  await client.query(
    `UPDATE email_campaigns
     SET status = 'paused'
     WHERE id = $1 AND status IN ('queued', 'sending')`,
    [campaignId],
  )
  await client.query(
    `UPDATE email_campaign_recipients
     SET status = 'pending', locked_at = NULL, last_error = $2
     WHERE campaign_id = $1 AND status = 'sending'`,
    [campaignId, reason],
  )
}

async function pauseCampaignForRecipient(client: Queryable, campaignId: number, recipientId: number, reason: string) {
  await client.query(
    `UPDATE email_campaign_recipients
     SET status = 'pending', locked_at = NULL, last_error = $2
     WHERE id = $1`,
    [recipientId, reason],
  )
  await pauseCampaign(client, campaignId, reason)
}

function shouldPauseForProviderError(err: unknown, status?: number) {
  if (!(err instanceof MailtrapBulkError)) return false
  if (!status) return true
  return [400, 401, 403, 422, 429].includes(status)
}

async function resetStaleSendingRows(client: Queryable) {
  const result = await client.query(
    `UPDATE email_campaign_recipients
     SET status = 'pending',
       locked_at = NULL,
       last_error = 'Reset stale sending lock.'
     WHERE status = 'sending'
       AND locked_at < now() - interval '10 minutes'`,
  )
  return result.rowCount ?? 0
}

async function lockNextRecipients(client: DbClient, campaignId: number, limit: number) {
  await client.query("BEGIN")
  try {
    const result = await client.query<CampaignRecipientRow>(
      `UPDATE email_campaign_recipients
       SET status = 'sending', locked_at = now()
       WHERE id IN (
         SELECT id
         FROM email_campaign_recipients
         WHERE campaign_id = $1
           AND status = 'pending'
           AND attempts < $3
           AND scheduled_at <= now()
         ORDER BY id
         LIMIT $2
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`,
      [campaignId, limit, MAX_ATTEMPTS],
    )
    await client.query("COMMIT")
    return result.rows
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  }
}

export async function processEmailCampaignBatch({
  sender = getDefaultCampaignSender(),
  batchSize,
  origin,
}: {
  sender?: Sender
  batchSize?: number
  origin?: string
} = {}) {
  const client = await pool.connect()
  let advisoryLockAcquired = false
  const summary = {
    campaignId: null as number | null,
    attempted: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    paused: false,
    completed: false,
    staleReset: 0,
    message: "No active campaign.",
  }

  try {
    const lock = await client.query<{ locked: boolean }>("SELECT pg_try_advisory_lock($1) AS locked", [CRON_LOCK_ID])
    advisoryLockAcquired = Boolean(lock.rows[0]?.locked)
    if (!advisoryLockAcquired) {
      return { ...summary, message: "Another campaign worker is already running." }
    }

    summary.staleReset = await resetStaleSendingRows(client)

    const campaignResult = await client.query<CampaignRow>(
      `SELECT *
       FROM email_campaigns
       WHERE status IN ('queued', 'sending')
       ORDER BY created_at ASC
       LIMIT 1`,
    )
    const campaign = campaignResult.rows[0]
    if (!campaign) return summary
    summary.campaignId = campaign.id

    const usage = await getUsageRow(client)
    if (usage.available <= 0) {
      await pauseCampaign(client, campaign.id, "Monthly email allowance exhausted.")
      return {
        ...summary,
        paused: true,
        message: "Monthly email allowance exhausted. Campaign paused.",
      }
    }

    if (campaign.status === "queued") {
      await client.query(
        `UPDATE email_campaigns
         SET status = 'sending', started_at = COALESCE(started_at, now())
         WHERE id = $1 AND status = 'queued'`,
        [campaign.id],
      )
    }

    const limit = Math.min(batchSize ?? getEmailCampaignConfig().batchSize, usage.available)
    const recipients = await lockNextRecipients(client, campaign.id, limit)
    if (recipients.length === 0) {
      summary.completed = await completeCampaignIfDone(client, campaign.id)
      summary.message = summary.completed ? "Campaign completed." : "No recipients ready for this batch."
      return summary
    }

    for (const recipient of recipients) {
      summary.attempted += 1

      if (await isSuppressed(client, recipient.email)) {
        await markRecipientSkipped(client, recipient.id, "Recipient is suppressed or unsubscribed.")
        summary.skipped += 1
        continue
      }

      const currentUsage = await getUsageRow(client)
      if (currentUsage.available <= 0) {
        await pauseCampaign(client, campaign.id, "Monthly email allowance exhausted.")
        summary.paused = true
        summary.message = "Monthly email allowance exhausted. Campaign paused."
        break
      }

      try {
        const unsubscribeUrl = await createUnsubscribeUrl(recipient.email, origin)
        await sender({
          to: recipient.email,
          name: recipient.name,
          subject: campaign.subject,
          html: appendCampaignFooter(campaign.body, unsubscribeUrl),
          unsubscribeUrl,
          deliveryReference: `nile-marketing-c${campaign.id}-r${recipient.id}`,
        })
        await markRecipientSent(client, recipient.id)
        await incrementUsageAfterAcceptedSend(client)
        summary.sent += 1
      } catch (err) {
        const status = err instanceof MailtrapBulkError ? err.status : undefined
        const message = err instanceof Error ? err.message : "Unknown email send error."
        if (shouldPauseForProviderError(err, status)) {
          const reason =
            status === 429
              ? "Mailtrap rate limit hit. Campaign paused."
              : `Mailtrap provider/configuration error. Campaign paused: ${message}`
          await pauseCampaignForRecipient(client, campaign.id, recipient.id, reason.slice(0, 1000))
          summary.paused = true
          summary.message = reason
          break
        }

        await markRecipientFailure(client, recipient, message)
        if (recipient.attempts + 1 >= MAX_ATTEMPTS) {
          summary.failed += 1
        }
      }
    }

    await recomputeCampaignCounts(client, campaign.id)
    if (!summary.paused) {
      summary.completed = await completeCampaignIfDone(client, campaign.id)
      summary.message = summary.completed ? "Campaign completed." : "Batch processed."
    }

    return summary
  } finally {
    if (advisoryLockAcquired) {
      await client.query("SELECT pg_advisory_unlock($1)", [CRON_LOCK_ID]).catch(() => null)
    }
    client.release()
  }
}

export async function cancelEmailCampaign(campaignId: number) {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const result = await client.query(
      `UPDATE email_campaigns
       SET status = 'cancelled', completed_at = now()
       WHERE id = $1 AND status IN ('queued', 'paused', 'sending')`,
      [campaignId],
    )
    if (!result.rowCount) {
      throw new EmailCampaignError("Campaign cannot be cancelled.", 409)
    }
    await client.query(
      `UPDATE email_campaign_recipients
       SET status = 'skipped',
         locked_at = NULL,
         last_error = 'Campaign cancelled.'
       WHERE campaign_id = $1 AND status IN ('pending', 'sending')`,
      [campaignId],
    )
    await recomputeCampaignCounts(client, campaignId)
    await client.query("COMMIT")
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

export async function resumeEmailCampaign(campaignId: number) {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const usage = await getUsageRow(client, true)
    if (usage.available <= 0) {
      throw new EmailCampaignError(
        "Not enough monthly email allowance. Reduce audience or upgrade Mailtrap plan.",
        409,
      )
    }
    const active = await client.query<{ id: number }>(
      `SELECT id FROM email_campaigns
       WHERE status IN ('queued', 'sending') AND id <> $1
       LIMIT 1`,
      [campaignId],
    )
    if (active.rows[0]) {
      throw new EmailCampaignError("Another email campaign is already queued or sending.", 409)
    }
    const result = await client.query(
      `UPDATE email_campaigns
       SET status = 'queued'
       WHERE id = $1 AND status = 'paused'`,
      [campaignId],
    )
    if (!result.rowCount) {
      throw new EmailCampaignError("Campaign is not paused or cannot be resumed.", 409)
    }
    await client.query("COMMIT")
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

export async function suppressEmail(email: string, reason = "unsubscribe") {
  await pool.query(
    `INSERT INTO email_suppressions (email, reason)
     VALUES (lower($1), $2)
     ON CONFLICT (email) DO UPDATE SET reason = EXCLUDED.reason`,
    [email, reason],
  )
}
