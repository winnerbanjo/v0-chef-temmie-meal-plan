"use client"

import Link from "next/link"
import { ChefHat, ChevronDown, User } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

const CURRENCIES = ["USD", "EUR", "GBP", "NGN"]

export function SiteNavbar() {
  const [currency, setCurrency] = useState("USD")

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ChefHat className="h-5 w-5" />
          </span>
          <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
            Chef Temmie
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="relative hidden sm:block">
            <select
              aria-label="Select currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-8 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          <Button asChild variant="ghost" className="font-medium">
            <Link href="/purchases">My Purchases</Link>
          </Button>

          <Button asChild variant="outline" size="icon" className="rounded-full" aria-label="Account">
            <Link href="/purchases">
              <User className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
