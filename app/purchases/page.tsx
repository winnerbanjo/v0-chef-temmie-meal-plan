"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, KeyRound, Loader2, ArrowLeft, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { SiteNavbar } from "@/components/site-navbar"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

export default function PurchasesPage() {
  const router = useRouter()
  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault()
    if (!emailValid || loading) return
    setLoading(true)
    try {
      const res = await fetch("/api/purchases/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Could not send code. Try again.")
        return
      }
      setStep("otp")
      if (data.devOtp) {
        toast.info(`Preview mode: your code is ${data.devOtp}`, { duration: 10000 })
      } else {
        toast.success("We sent a 6-digit code to your email.")
      }
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp(e?: React.FormEvent) {
    e?.preventDefault()
    if (otp.length !== 6 || loading) return
    setLoading(true)
    try {
      const res = await fetch("/api/purchases/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Could not verify code. Try again.")
        return
      }
      toast.success("Verified! Opening your meal plan…")
      router.push("/meal-plan")
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNavbar />

      <main className="flex flex-1 items-center justify-center bg-secondary/30 px-4 py-16 sm:px-6">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              {step === "email" ? (
                <Mail className="h-6 w-6 text-primary" />
              ) : (
                <KeyRound className="h-6 w-6 text-primary" />
              )}
            </div>

            {step === "email" ? (
              <form onSubmit={sendOtp} className="mt-5">
                <h1 className="text-center font-heading text-2xl font-semibold tracking-tight text-foreground">
                  Access your purchases
                </h1>
                <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
                  Enter the email you used at checkout and we&apos;ll send you a one-time code.
                </p>

                <div className="mt-6 space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={!emailValid || loading}
                  className="mt-5 h-12 w-full gap-2 rounded-xl text-base"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Send OTP
                </Button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="mt-5">
                <h1 className="text-center font-heading text-2xl font-semibold tracking-tight text-foreground">
                  Enter your code
                </h1>
                <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
                  We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>. It expires in
                  10 minutes.
                </p>

                <div className="mt-6 flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={otp.length !== 6 || loading}
                  className="mt-6 h-12 w-full gap-2 rounded-xl text-base"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Verify &amp; continue
                </Button>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email")
                      setOtp("")
                    }}
                    className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Change email
                  </button>
                  <button
                    type="button"
                    onClick={() => sendOtp()}
                    disabled={loading}
                    className="font-medium text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            Your access is securely linked to your email.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
