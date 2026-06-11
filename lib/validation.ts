import { z } from "zod"

export const PLATFORMS = ["Instagram", "Facebook", "TikTok", "Snapchat", "YouTube", "All"] as const

export const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  sourcePlatform: z.enum(PLATFORMS),
  productId: z.number().int().positive(),
  acceptedTerms: z.literal(true),
})

export const sendOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
})

export const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
})

export const broadcastSchema = z.object({
  subject: z.string().trim().min(3, "Subject is required"),
  body: z.string().trim().min(3, "Message body is required"),
  audience: z.enum(["all", "subscribers", "purchasers"]),
})

export const emailCampaignSchema = z.object({
  subject: z.string().trim().min(3, "Subject is required").max(160, "Subject is too long"),
  body: z.string().trim().min(10, "Campaign body is required"),
})

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

export function formatPrice(amountCents: number, currency = "USD") {
  if (amountCents === 0) return "Free"
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountCents / 100)
}
