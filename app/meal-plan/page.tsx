import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { eq, and, desc } from "drizzle-orm"
import { Download, FileText, Mail, Sparkles, ExternalLink } from "lucide-react"
import { SiteNavbar } from "@/components/site-navbar"
import { SiteFooter } from "@/components/site-footer"
import { LogoutButton } from "@/components/logout-button"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/db"
import { purchases, products } from "@/lib/db/schema"
import { getAccessEmail } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function MealPlanPage() {
  const email = await getAccessEmail()
  if (!email) redirect("/purchases")

  const rows = await db
    .select({
      id: purchases.id,
      createdAt: purchases.createdAt,
      title: products.title,
      description: products.description,
      imageUrl: products.imageUrl,
      fileUrl: products.fileUrl,
    })
    .from(purchases)
    .leftJoin(products, eq(purchases.productId, products.id))
    .where(and(eq(purchases.email, email), eq(purchases.status, "completed")))
    .orderBy(desc(purchases.createdAt))

  if (rows.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteNavbar />
        <main className="flex flex-1 items-center justify-center bg-secondary/30 px-4 py-16">
          <div className="max-w-md text-center">
            <h1 className="font-heading text-2xl font-semibold text-foreground">No purchases yet</h1>
            <p className="mt-2 text-muted-foreground">
              We couldn&apos;t find a completed purchase for {email}.
            </p>
            <Button asChild className="mt-6 rounded-xl">
              <Link href="/">Browse the meal plan</Link>
            </Button>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNavbar />

      <main className="flex-1 bg-secondary/30">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Your library
              </span>
              <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground">
                Welcome back
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {email}
              </p>
            </div>
            <LogoutButton />
          </div>

          <div className="mt-8 space-y-6">
            {rows.map((p) => (
              <article key={p.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                <div className="grid gap-6 p-6 sm:grid-cols-[180px_minmax(0,1fr)] sm:p-8">
                  <Image
                    src={p.imageUrl ?? "/meal-plan-cover.png"}
                    alt={p.title ?? "Meal plan"}
                    width={360}
                    height={360}
                    className="aspect-square w-full rounded-2xl border border-border object-cover sm:w-[180px]"
                  />
                  <div className="flex flex-col">
                    <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                      {p.title}
                    </h2>
                    {p.description ? (
                      <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">{p.description}</p>
                    ) : null}

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      {p.fileUrl ? (
                        <Button asChild size="lg" className="h-12 gap-2 rounded-xl text-base">
                          <a href={p.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                            Download meal plan
                          </a>
                        </Button>
                      ) : (
                        <Button size="lg" disabled className="h-12 gap-2 rounded-xl text-base">
                          <FileText className="h-4 w-4" />
                          File coming soon
                        </Button>
                      )}
                      {p.fileUrl ? (
                        <Button asChild size="lg" variant="outline" className="h-12 gap-2 rounded-xl bg-transparent text-base">
                          <a href={p.fileUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            View online
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {p.fileUrl ? (
                  <div className="border-t border-border bg-background">
                    <iframe
                      src={p.fileUrl}
                      title={`${p.title} preview`}
                      className="h-[480px] w-full"
                    />
                  </div>
                ) : null}

                <p className="border-t border-border bg-secondary/40 px-6 py-3 text-xs text-muted-foreground sm:px-8">
                  This access is linked to your email.
                </p>
              </article>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
