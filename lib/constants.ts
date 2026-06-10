export const CREATOR_NAME = "Temitayo Oyebanjo"
export const PRODUCT_TITLE = "Chef Temmie Student Meal Plan"
export const PRODUCT_ID = 1

export const PLATFORM_OPTIONS = [
  "Instagram",
  "Facebook",
  "TikTok",
  "Snapchat",
  "YouTube",
  "All",
] as const

// Display-only currency conversion (USD base). The product is free for now,
// but the structure supports paid products with multi-currency display.
export const CURRENCIES = [
  { code: "USD", symbol: "$", rate: 1 },
  { code: "EUR", symbol: "€", rate: 0.92 },
  { code: "GBP", symbol: "£", rate: 0.79 },
  { code: "NGN", symbol: "₦", rate: 1550 },
  { code: "CAD", symbol: "C$", rate: 1.36 },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]["code"]

export function formatDisplayPrice(amountCents: number, code: CurrencyCode): string {
  if (amountCents === 0) return "Free"
  const currency = CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]
  const converted = (amountCents / 100) * currency.rate
  return `${currency.symbol}${converted.toFixed(2)}`
}
