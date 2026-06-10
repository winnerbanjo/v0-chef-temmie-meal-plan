"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Lock } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { PLATFORM_OPTIONS } from "@/lib/constants"

export function CheckoutForm({ productId, isFree }: { productId: number; isFree: boolean }) {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [platform, setPlatform] = useState("")
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const ready = fullName.trim().length >= 2 && emailValid && platform !== "" && accepted

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || loading) return
    setLoading(true)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          sourcePlatform: platform,
          productId,
          acceptedTerms: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong. Please try again.")
        return
      }
      router.push(`/success?email=${encodeURIComponent(email.trim())}`)
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          autoComplete="name"
          placeholder="Jane Student"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
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
        <p className="text-xs text-muted-foreground">
          We&apos;ll link your access to this email and send your confirmation here.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">
          Which platform do you follow me on? <span className="text-destructive">*</span>
        </legend>
        <RadioGroup value={platform} onValueChange={setPlatform} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PLATFORM_OPTIONS.map((option) => (
            <Label
              key={option}
              htmlFor={`platform-${option}`}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-card p-3 text-sm font-medium transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <RadioGroupItem id={`platform-${option}`} value={option} />
              {option}
            </Label>
          ))}
        </RadioGroup>
      </fieldset>

      <Label
        htmlFor="terms"
        className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground"
      >
        <Checkbox
          id="terms"
          checked={accepted}
          onCheckedChange={(v) => setAccepted(v === true)}
          className="mt-0.5"
        />
        <span>
          I agree to the terms and conditions and consent to receiving emails related to my purchase.
        </span>
      </Label>

      <Button type="submit" size="lg" disabled={!ready || loading} className="h-12 w-full gap-2 rounded-xl text-base">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            {isFree ? "Get instant access" : "Proceed to payment"}
          </>
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Secure checkout. Your details are encrypted and never shared.
      </p>
    </form>
  )
}
