import { config } from "dotenv"

config({ path: ".env" })

const MOCK_RECIPIENTS = [
  { email: "mock-user-1@example.com", name: "Mock User One" },
  { email: "mock-user-2@example.com", name: "Mock User Two" },
]

async function main() {
  const { pool } = await import("../lib/db")
  const { createEmailCampaign, processEmailCampaignBatch } = await import("../lib/email-campaigns")
  const { sendMailtrapBulkEmail } = await import("../lib/email/mailtrap-bulk")

  async function ensureMockSubscribers() {
  for (const recipient of MOCK_RECIPIENTS) {
    const user = await pool.query<{ id: number }>(
      `INSERT INTO app_users (full_name, email)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = now()
       RETURNING id`,
      [recipient.name, recipient.email],
    )

    await pool.query(
      `INSERT INTO subscribers (user_id, email, source_platform, status)
       VALUES ($1, $2, 'test', 'active')
       ON CONFLICT (email) DO UPDATE
       SET status = 'active', user_id = EXCLUDED.user_id, updated_at = now()`,
      [user.rows[0].id, recipient.email],
    )

    await pool.query(`DELETE FROM email_suppressions WHERE lower(email) = lower($1)`, [recipient.email])
  }
  }

  async function getCampaignCounts(campaignId: number) {
  const result = await pool.query<{
    id: number
    recipient_count: number
    sent_count: number
    failed_count: number
    skipped_count: number
    status: string
  }>(
    `SELECT id, recipient_count, sent_count, failed_count, skipped_count, status
     FROM email_campaigns
     WHERE id = $1`,
    [campaignId],
  )
  return result.rows[0]
  }

  async function cancelPreviousTestCampaigns() {
    const previous = await pool.query<{ id: number }>(
      `UPDATE email_campaigns
       SET status = 'cancelled', completed_at = now()
       WHERE subject = 'Test Meal Plan Campaign'
         AND created_by = 'test-script'
         AND status IN ('queued', 'sending', 'paused')
       RETURNING id`,
    )

    for (const row of previous.rows) {
      await pool.query(
        `UPDATE email_campaign_recipients
         SET status = 'skipped', locked_at = NULL, last_error = 'Previous test campaign cancelled before rerun.'
         WHERE campaign_id = $1 AND status IN ('pending', 'sending')`,
        [row.id],
      )
    }
  }

  await ensureMockSubscribers()
  await cancelPreviousTestCampaigns()

  const useRealMailtrap = process.env.TEST_SEND_REAL_EMAILS === "true"
  const sender = useRealMailtrap
    ? sendMailtrapBulkEmail
    : async ({ to, subject }: { to: string; subject: string; html: string; unsubscribeUrl: string }) => {
        console.log(`[email-campaign:test-mock] accepted to=${to} subject="${subject}"`)
        return { status: 202, mocked: true }
      }

  const queued = await createEmailCampaign({
    subject: "Test Meal Plan Campaign",
    body: "<h1>Test Meal Plan</h1><p>This is a safe two-recipient campaign test.</p>",
    createdBy: "test-script",
    recipientEmails: MOCK_RECIPIENTS.map((recipient) => recipient.email),
  })

  const result = await processEmailCampaignBatch({
    sender,
    batchSize: 2,
    origin: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  })
  const campaign = await getCampaignCounts(queued.campaignId)

  if (!campaign) {
    throw new Error("Test campaign was not found after processing.")
  }
  if (campaign.recipient_count !== 2) {
    throw new Error(`Expected exactly 2 recipients, found ${campaign.recipient_count}.`)
  }
  if (campaign.sent_count !== 2) {
    throw new Error(`Expected both mock recipients to be sent, found sent_count=${campaign.sent_count}.`)
  }
  if (campaign.status !== "sent") {
    throw new Error(`Expected campaign to complete with status sent, found ${campaign.status}.`)
  }

  console.log("Email campaign test result")
  console.log({
    campaignId: campaign.id,
    recipientCount: campaign.recipient_count,
    sentCount: campaign.sent_count,
    failedCount: campaign.failed_count,
    skippedCount: campaign.skipped_count,
    status: campaign.status,
    cronResult: result,
    realMailtrapSend: useRealMailtrap,
  })
}

main()
  .then(async () => {
    const { pool } = await import("../lib/db")
    await pool.end()
  })
  .catch(async (err) => {
    console.error("[email-campaign:test-error]", err)
    const { pool } = await import("../lib/db")
    await pool.end()
    process.exit(1)
  })
