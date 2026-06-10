import Link from "next/link"
import { ChefHat } from "lucide-react"

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ChefHat className="h-4 w-4" />
          </span>
          <span className="font-heading text-base font-semibold text-foreground">Chef Temmie</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Digital meal plans by Temitayo Oyebanjo. Made for students.
        </p>
        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <Link href="/purchases" className="transition-colors hover:text-foreground">
            My Purchases
          </Link>
          <Link href="/admin" className="transition-colors hover:text-foreground">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  )
}
