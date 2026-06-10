import Link from "next/link"
import { CheckCircle2, ArrowRight, Mail } from "lucide-react"
import { SiteNavbar } from "@/components/site-navbar"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNavbar />

      <main className="flex flex-1 items-center justify-center bg-secondary/30 px-4 py-16 sm:px-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="h-9 w-9 text-success" />
          </div>
          <h1 className="mt-6 font-heading text-3xl font-semibold tracking-tight text-foreground">
            Access confirmed
          </h1>
          <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
            Your meal plan access has been created. We&apos;ve sent the details to your email.
          </p>

          {email ? (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground">
              <Mail className="h-4 w-4 text-primary" />
              {email}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3">
            <Button asChild size="lg" className="h-12 gap-2 rounded-xl text-base">
              <Link href="/purchases">
                View my purchases
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-xl text-base">
              <Link href="/">Back to home</Link>
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Didn&apos;t get the email? Check your spam folder, then head to My Purchases to request an access code.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
