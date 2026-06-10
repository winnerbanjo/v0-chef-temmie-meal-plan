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
    <div className="flex min-h-screen flex-col bg-[#FAFAF8]">
      <SiteNavbar />

      <main className="flex-1">

        <section className="relative overflow-hidden bg-[#FAFAF8]">
          {/* Warm ambient blobs */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 -right-32 h-[540px] w-[540px] rounded-full opacity-30"
            style={{
              background:
                "radial-gradient(circle, #F4A05A 0%, #F4A05A00 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-20 -left-20 h-[360px] w-[360px] rounded-full opacity-20"
            style={{
              background:
                "radial-gradient(circle, #EFD9AE 0%, #EFD9AE00 70%)",
              filter: "blur(60px)",
            }}
          />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:py-24">
            {/* Left */}
            <div className="order-2 lg:order-1">
              {/* Eyebrow badge */}
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#F0D9B5] bg-[#FEF9F0] px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[#C17B2F] shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Digital meal plan
              </div>

              <h1
                className="font-heading text-pretty text-[2.6rem] font-bold leading-[1.1] tracking-tight text-[#1A1510] sm:text-5xl lg:text-[3.2rem]"
                style={{ letterSpacing: "-0.03em" }}
              >
                {title}
              </h1>

              {/* Author */}
              <div className="mt-5 flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-[#F0D9B5] ring-offset-1 ring-offset-[#FAFAF8]">
                  <AvatarFallback className="bg-[#F4A05A]/20 text-sm font-bold text-[#C17B2F]">
                    TO
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-[#1A1510]">Temitayo Oyebanjo</p>
                  <p className="text-xs text-[#7A6A55]">Creator &amp; home-cook coach</p>
                </div>
              </div>

              {/* Stars + price */}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                <div className="flex items-center gap-2">
                  <StarRating rating={4.7} />
                  <span className="text-sm font-semibold text-[#1A1510]">4.7</span>
                  <span className="text-sm text-[#9A8A76]">(34 reviews)</span>
                </div>
                <span className="h-4 w-px bg-[#E2D5C3]" />
                <span className="text-2xl font-bold tracking-tight text-[#1A1510]">{price}</span>
              </div>

              {/* Body copy */}
              <p className="mt-5 max-w-md text-pretty text-[1.05rem] leading-[1.75] text-[#5C5043]">
                Tired of guessing what to eat every day? This simple, student-friendly meal plan
                shows you exactly what to cook, how to stretch your budget, and still enjoy every
                bite.
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button

                  size="lg"
                  className="h-13 gap-2 rounded-2xl px-8 text-[0.95rem] font-semibold shadow-[0_8px_28px_rgba(196,120,40,0.28)] transition-all duration-200 hover:shadow-[0_12px_36px_rgba(196,120,40,0.38)] hover:-translate-y-0.5"
                  style={{
                    background: "linear-gradient(135deg,#E8922A 0%,#C97120 100%)",
                    color: "#fff",
                    border: "none",
                  }}
                >
                  <Link className="flex items-center gap-2" href="/checkout">
                    Buy Access
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button

                  size="lg"
                  variant="outline"
                  className="h-13 rounded-2xl border-[#E2D5C3] bg-white px-8 text-[0.95rem] font-semibold text-[#5C5043] hover:bg-[#FEF9F0] hover:border-[#D4B896]"
                >
                  <Link href="#what-you-get">See what&apos;s inside</Link>
                </Button>
              </div>

              {/* Trust pills */}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm text-[#7A6A55]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Email-verified access
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#C17B2F]" />
                  Instant delivery
                </span>
              </div>
            </div>

            {/* Right — product image */}
            <div className="order-1 lg:order-2">
              <div className="relative mx-auto max-w-md">
                {/* Glow ring */}
                <div
                  aria-hidden
                  className="absolute -inset-4 rounded-[2.5rem] opacity-60"
                  style={{
                    background:
                      "radial-gradient(circle, #F4A05A55 0%, transparent 70%)",
                    filter: "blur(24px)",
                  }}
                />
                <div className="relative overflow-hidden rounded-[2rem] border border-[#EAD9C4] bg-white shadow-[0_24px_60px_rgba(90,55,20,0.14)]">
                  <Image
                    src={image || "/placeholder.svg"}
                    alt={`${title} cover`}
                    width={640}
                    height={640}
                    priority
                    className="aspect-square w-full object-cover"
                  />
                  {/* Card footer */}
                  <div className="flex items-center justify-between gap-3 border-t border-[#EAD9C4] bg-white px-5 py-4">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-5 w-5 text-[#C17B2F]" />
                      <span className="text-sm font-semibold text-[#1A1510]">Verified creator product</span>
                    </div>
                    <span className="rounded-full bg-[#FEF3E2] px-3 py-0.5 text-sm font-bold text-[#C17B2F]">
                      {price}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          <div className="rounded-[1.75rem] border border-[#EAD9C4] bg-white px-8 py-9 shadow-sm sm:px-10">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[#C17B2F]">
              Why it works
            </p>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-[#1A1510]">
              Stop guessing. Start cooking.
            </h2>
            <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-[#5C5043]">
              This plan removes the daily &quot;what should I eat?&quot; stress. You get a clear weekly
              structure, affordable recipes, and a simple cooking guide designed around a real student
              budget &mdash; so you eat better without overspending.
            </p>
          </div>
        </section>


        <section id="what-you-get" className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[#C17B2F]">
                Included
              </p>
              <h2 className="font-heading text-2xl font-bold tracking-tight text-[#1A1510] sm:text-3xl">
                What you get
              </h2>
              <p className="mt-2 text-[#7A6A55]">Everything you need to eat well this semester.</p>
              <ul className="mt-6 space-y-3">
                {INCLUDES.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3.5 rounded-2xl border border-[#EAD9C4] bg-white px-5 py-4 shadow-[0_1px_4px_rgba(90,55,20,0.06)] transition-shadow hover:shadow-[0_4px_16px_rgba(90,55,20,0.09)]"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-medium text-[#1A1510]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-[#EAD9C4] bg-white shadow-[0_8px_32px_rgba(90,55,20,0.10)]">
              <Image
                src="/meal-plan-preview.png"
                alt="Preview of the weekly meal plan layout"
                width={720}
                height={540}
                className="w-full object-cover"
              />
              <div className="border-t border-[#EAD9C4] px-6 py-5">
                <p className="text-sm font-semibold text-[#1A1510]">A clean weekly layout</p>
                <p className="mt-1 text-sm text-[#7A6A55]">
                  Know exactly what to cook each day, with budget-friendly ingredients.
                </p>
              </div>
            </div>
          </div>
        </section>


        <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[#C17B2F]">
                Reviews
              </p>
              <h2 className="font-heading text-2xl font-bold tracking-tight text-[#1A1510] sm:text-3xl">
                Loved by students
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <StarRating rating={4.7} />
              <span className="text-sm text-[#9A8A76]">4.7 / 5</span>
            </div>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {REVIEWS.map((r) => (
              <figure
                key={r.name}
                className="flex flex-col rounded-2xl border border-[#EAD9C4] bg-white p-6 shadow-[0_2px_12px_rgba(90,55,20,0.07)]"
              >
                <StarRating rating={r.rating} />
                <blockquote className="mt-3 flex-1 text-pretty text-[0.95rem] leading-relaxed text-[#2E2518]">
                  &ldquo;{r.text}&rdquo;
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-2.5 border-t border-[#F0E6D3] pt-4">
                  <Avatar className="h-8 w-8 ring-1 ring-[#F0D9B5]">
                    <AvatarFallback className="bg-[#FEF3E2] text-xs font-bold text-[#C17B2F]">
                      {r.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold text-[#1A1510]">{r.name}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>


        <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
          <p className="mb-1 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#C17B2F]">
            FAQ
          </p>
          <h2 className="text-center font-heading text-2xl font-bold tracking-tight text-[#1A1510] sm:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-[#EAD9C4] bg-white shadow-sm">
            {/*@ts-expect-error asChild prop is not recognized by the Accordion component */}
            <Accordion type="single" collapsible className="w-full divide-y divide-[#EAD9C4]">
              {FAQ.map((item, i) => (
                <AccordionItem key={item.q} value={`item-${i}`} className="border-none px-6">
                  <AccordionTrigger className="py-5 text-left text-[0.95rem] font-semibold text-[#1A1510] hover:no-underline hover:text-[#C17B2F]">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-[0.9rem] leading-relaxed text-[#5C5043]">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>


        <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div
            className="relative overflow-hidden rounded-[2rem] px-7 py-14 text-center sm:px-12"
            style={{
              background: "linear-gradient(145deg, #C97120 0%, #E8922A 45%, #D4832A 100%)",
            }}
          >
            {/* Subtle inner highlight */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.18) 0%, transparent 55%)",
              }}
            />
            {/* Decorative grain texture overlay */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                backgroundSize: "200px 200px",
              }}
            />

            <div className="relative">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/70">
                Get started today
              </p>
              <h2 className="font-heading text-balance text-2xl font-bold tracking-tight text-white sm:text-[2rem]">
                Ready to eat better on a student budget?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-pretty leading-relaxed text-white/80">
                Get instant access to the Chef Temmie Student Meal Plan.
              </p>
              <Button

                size="lg"
                className="mt-8 h-13 gap-2 rounded-2xl bg-white px-9 text-[0.95rem] font-bold text-[#C17B2F] shadow-[0_8px_28px_rgba(0,0,0,0.18)] transition-all duration-200 hover:bg-[#FEF9F0] hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(0,0,0,0.22)]"
              >
                <Link href="/checkout" className="flex items-center gap-2" >
                  Buy Access &middot; {price}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />


      <div className="sticky bottom-0 z-30 border-t border-[#EAD9C4] bg-white/95 p-3 backdrop-blur-xl lg:hidden">
        <Button

          size="lg"
          className="h-12 w-full gap-2 rounded-xl text-[0.95rem] font-bold shadow-[0_4px_16px_rgba(196,120,40,0.24)]"
          style={{
            background: "linear-gradient(135deg,#E8922A 0%,#C97120 100%)",
            color: "#fff",
            border: "none",
          }}
        >
          <Link href="/checkout" className="flex items-center gap-2" >
            Buy Access &middot; {price}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}