import Link from "next/link"
import Image from "next/image"
import { Check, ShieldCheck, Sparkles, Clock, BadgeCheck, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SiteNavbar } from "@/components/site-navbar"
import { SiteFooter } from "@/components/site-footer"
import { StarRating } from "@/components/star-rating"
import { getActiveProduct } from "@/lib/products"
import { formatPrice } from "@/lib/validation"

export const dynamic = "force-dynamic"

const INCLUDES = [
  "Affordable meal ideas",
  "Weekly student-friendly meal structure",
  "Budget-conscious recipes",
  "Easy-to-follow cooking guide",
  "Access after email verification",
]

const REVIEWS = [
  {
    name: "Amara O.",
    text: "I genuinely stopped wasting money on random takeout. The weekly structure makes grocery shopping so simple.",
    rating: 5,
  },
  {
    name: "Daniel K.",
    text: "As a first-year student this was a lifesaver. The recipes are cheap but actually taste good.",
    rating: 5,
  },
  {
    name: "Priya S.",
    text: "Clear, no fluff, and easy to follow. I cook more at home now and feel way better.",
    rating: 4,
  },
]

const FAQ = [
  {
    q: "How do I get access after buying?",
    a: "After checkout we send an email with a link. Visit My Purchases, enter your email, and we'll send a one-time code to unlock your meal plan instantly.",
  },
  {
    q: "Is this really free?",
    a: "Yes, the Student Meal Plan is free right now. You only need to verify your email so we can link your access to you.",
  },
  {
    q: "What format is the meal plan in?",
    a: "It's a downloadable, easy-to-follow guide you can open on your phone or laptop and reference any time you cook.",
  },
  {
    q: "Can I access it on multiple devices?",
    a: "Absolutely. Your access is linked to your email, so you can verify and view it from any device.",
  },
]

export default async function LandingPage() {
  const product = await getActiveProduct()
  const title = product?.title ?? "Chef Temmie Student Meal Plan"
  const price = formatPrice(product?.price ?? 0, product?.currency ?? "USD")
  const image = product?.imageUrl ?? "/meal-plan-cover.png"

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNavbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/40 via-background to-background" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
            <div className="order-2 lg:order-1">
              <Badge variant="secondary" className="mb-4 gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Digital meal plan
              </Badge>
              <h1 className="font-heading text-pretty text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
                {title}
              </h1>
              <div className="mt-4 flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                    TO
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">Temitayo Oyebanjo</p>
                  <p className="text-xs text-muted-foreground">Creator &amp; home-cook coach</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <StarRating rating={4.7} />
                  <span className="text-sm font-medium text-foreground">4.7</span>
                  <span className="text-sm text-muted-foreground">(34 reviews)</span>
                </div>
                <span className="h-4 w-px bg-border" />
                <span className="text-2xl font-semibold text-foreground">{price}</span>
              </div>

              <p className="mt-5 max-w-md text-pretty leading-relaxed text-muted-foreground">
                Tired of guessing what to eat every day? This simple, student-friendly meal plan
                shows you exactly what to cook, how to stretch your budget, and still enjoy every
                bite.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 gap-2 rounded-xl px-7 text-base shadow-lg shadow-primary/20">
                  <Link href="/checkout">
                    Buy Access
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-7 text-base">
                  <Link href="#what-you-get">See what&apos;s inside</Link>
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  Email-verified access
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  Instant delivery
                </span>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="relative mx-auto max-w-md">
                <div className="absolute -inset-3 rounded-[2rem] bg-primary/10 blur-2xl" />
                <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-primary/10">
                  <Image
                    src={image || "/placeholder.svg"}
                    alt={`${title} cover`}
                    width={640}
                    height={640}
                    priority
                    className="aspect-square w-full object-cover"
                  />
                  <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-5 py-4">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-foreground">Verified creator product</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{price}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Description */}
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="rounded-3xl border border-border bg-card p-8 sm:p-10">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              Stop guessing. Start cooking.
            </h2>
            <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
              This plan removes the daily &quot;what should I eat?&quot; stress. You get a clear weekly
              structure, affordable recipes, and a simple cooking guide designed around a real student
              budget &mdash; so you eat better without overspending.
            </p>
          </div>
        </section>

        {/* What you get */}
        <section id="what-you-get" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid items-start gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                What you get
              </h2>
              <p className="mt-2 text-muted-foreground">Everything you need to eat well this semester.</p>
              <ul className="mt-6 space-y-3">
                {INCLUDES.map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-medium text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-lg">
              <Image
                src="/meal-plan-preview.png"
                alt="Preview of the weekly meal plan layout"
                width={720}
                height={540}
                className="w-full object-cover"
              />
              <div className="border-t border-border p-5">
                <p className="text-sm font-medium text-foreground">A clean weekly layout</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Know exactly what to cook each day, with budget-friendly ingredients.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Loved by students
            </h2>
            <div className="flex items-center gap-2">
              <StarRating rating={4.7} />
              <span className="text-sm text-muted-foreground">4.7 / 5</span>
            </div>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {REVIEWS.map((r) => (
              <figure key={r.name} className="flex flex-col rounded-2xl border border-border bg-card p-6">
                <StarRating rating={r.rating} />
                <blockquote className="mt-3 flex-1 text-pretty leading-relaxed text-foreground">
                  &ldquo;{r.text}&rdquo;
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {r.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">{r.name}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <h2 className="text-center font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible className="mt-6 w-full">
            {FAQ.map((item, i) => (
              <AccordionItem key={item.q} value={`item-${i}`} className="border-border">
                <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-center sm:px-10">
            <div className="pointer-events-none absolute inset-0 opacity-20 [background:radial-gradient(circle_at_30%_20%,white,transparent_45%)]" />
            <div className="relative">
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-primary-foreground sm:text-3xl text-balance">
                Ready to eat better on a student budget?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-pretty leading-relaxed text-primary-foreground/80">
                Get instant access to the Chef Temmie Student Meal Plan today.
              </p>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="mt-7 h-12 gap-2 rounded-xl px-8 text-base font-semibold"
              >
                <Link href="/checkout">
                  Buy Access &middot; {price}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

      {/* Sticky mobile CTA */}
      <div className="sticky bottom-0 z-30 border-t border-border bg-background/90 p-3 backdrop-blur-xl lg:hidden">
        <Button asChild size="lg" className="h-12 w-full gap-2 rounded-xl text-base">
          <Link href="/checkout">
            Buy Access &middot; {price}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
