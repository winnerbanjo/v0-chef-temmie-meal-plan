import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const secret = new TextEncoder().encode(
  process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET || "dev-insecure-secret-change-me-please-32",
)

export const ACCESS_COOKIE = "mealplan_access"
export const ADMIN_COOKIE = "admin_session"

async function sign(payload: Record<string, unknown>, expires: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(secret)
}

async function verify<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as T
  } catch {
    return null
  }
}

// ---- Meal plan email access ----
export async function createAccessSession(email: string) {
  const token = await sign({ email, kind: "access" }, "7d")
  const store = await cookies()
  store.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function getAccessEmail(): Promise<string | null> {
  const store = await cookies()
  const token = store.get(ACCESS_COOKIE)?.value
  if (!token) return null
  const payload = await verify<{ email: string; kind: string }>(token)
  return payload?.kind === "access" ? payload.email : null
}

export async function clearAccessSession() {
  const store = await cookies()
  store.delete(ACCESS_COOKIE)
}

// ---- Admin session ----
export async function createAdminSession(email: string) {
  const token = await sign({ email, kind: "admin" }, "1d")
  const store = await cookies()
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24,
  })
}

export async function getAdminEmail(): Promise<string | null> {
  const store = await cookies()
  const token = store.get(ADMIN_COOKIE)?.value
  if (!token) return null
  const payload = await verify<{ email: string; kind: string }>(token)
  return payload?.kind === "admin" ? payload.email : null
}

export async function clearAdminSession() {
  const store = await cookies()
  store.delete(ADMIN_COOKIE)
}

export function checkAdminCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@cheftemmie.com"
  const adminPassword = process.env.ADMIN_PASSWORD || "admin1234"
  return email.toLowerCase() === adminEmail.toLowerCase() && password === adminPassword
}
