export type MailtrapBulkEmailArgs = {
  to: string
  name?: string | null
  subject: string
  html: string
  unsubscribeUrl: string
}

export class MailtrapBulkError extends Error {
  status?: number
  responseBody?: string

  constructor(message: string, status?: number, responseBody?: string) {
    super(message)
    this.name = "MailtrapBulkError"
    this.status = status
    this.responseBody = responseBody
  }
}

function getMailtrapApiUrl() {
  // Mailtrap Bulk Stream endpoints can differ by account/dashboard setup.
  // Keep this overrideable so production can point at the exact Bulk Stream URL.
  return process.env.MAILTRAP_API_URL || "https://send.api.mailtrap.io/api/send"
}

export async function sendMailtrapBulkEmail({
  to,
  name,
  subject,
  html,
  unsubscribeUrl,
}: MailtrapBulkEmailArgs) {
  const token = process.env.MAILTRAP_API_TOKEN
  const fromEmail = process.env.MAILTRAP_FROM_EMAIL
  const fromName = process.env.MAILTRAP_FROM_NAME || "Chef Temmie"

  if (!token) {
    throw new MailtrapBulkError("MAILTRAP_API_TOKEN is not set.")
  }
  if (!fromEmail) {
    throw new MailtrapBulkError("MAILTRAP_FROM_EMAIL is not set.")
  }

  const res = await fetch(getMailtrapApiUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: fromEmail, name: fromName },
      to: [{ email: to, name: name || undefined }],
      subject,
      html,
      category: "meal_plan",
      custom_variables: {
        campaign_type: "meal_plan",
      },
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
      },
    }),
  })

  const responseBody = await res.text().catch(() => "")
  if (!res.ok) {
    throw new MailtrapBulkError(
      `Mailtrap bulk send failed with status ${res.status}.`,
      res.status,
      responseBody,
    )
  }

  return {
    status: res.status,
    body: responseBody,
  }
}
