import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { ArrowLeft, ShieldCheck, Tag, BadgeCheck } from "lucide-react"
import { SiteNavbar } from "@/components/site-navbar"
import { SiteFooter } from "@/components/site-footer"
import { CheckoutForm } from "@/components/checkout-form"
import { getActiveProduct } from "@/lib/products"
import { formatPrice } from "@/lib/validation"

export const dynamic = "force-dynamic"

export default async function CheckoutPage() {
  const product = await getActiveProduct()
  if (!product) notFound()

  const price = formatPrice(product.price, product.currency)
  const image = product.imageUrl ?? "/meal-plan-cover.png"
  const isFree = product.price === 0

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNavbar />

      <main className="flex-1 bg-secondary/30">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to product
          </Link>

          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">Checkout</h1>
          <p className="mt-1 text-muted-foreground">Complete the steps below to unlock your meal plan.</p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-8">
            {/* Summary */}
            <aside className="lg:order-1">
              <div className="sticky top-24 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                <div className="flex items-center gap-4 p-5">
                  <Image
                    src={image || "/placeholder.svg"}
                    alt={product.title}
                    width={88}
                    height={88}
                    className="h-20 w-20 shrink-0 rounded-2xl border border-border object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{product.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                      Digital meal plan
                    </p>
                  </div>
                </div>

                <div className="border-t border-border px-5 py-4">
                  <label htmlFor="coupon" className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Tag className="h-3.5 w-3.5" />
                    Coupon code
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="coupon"
                      placeholder="Enter code"
                      className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <button
                      type="button"
                      className="h-10 rounded-lg border border-border bg-secondary px-4 text-sm font-medium text-secondary-foreground"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 border-t border-border px-5 py-4 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Quantity</span>
                    <span className="text-foreground">1</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="text-foreground">{price}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2.5 text-base font-semibold text-foreground">
                    <span>Total</span>
                    <span>{price}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-border bg-secondary/40 px-5 py-3 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  Email-verified access. Cancel anytime.
                </div>
              </div>
            </aside>

            {/* Form */}
            <section className="lg:order-2">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
                <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">Your details</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isFree
                    ? "This product is free. Fill in your details to unlock access instantly."
                    : "Fill in your details to continue to payment."}
                </p>
                <div className="mt-6">
                  <CheckoutForm productId={product.id} isFree={isFree} />
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
