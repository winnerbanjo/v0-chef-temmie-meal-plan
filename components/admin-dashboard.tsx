"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  ShoppingBag,
  UserCheck,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type UsersResponse = {
  users: Array<{
    id: number
    fullName: string
    email: string
    createdAt: string | null
    platform: string | null
    subscriberStatus: string | null
  }>
  pagination: Pagination
}

type PurchasesResponse = {
  purchases: Array<{
    id: number
    email: string
    product: string | null
    status: string
    amount: number
    currency: string
    createdAt: string | null
  }>
  pagination: Pagination
}

type EmailUsageResponse = {
  month: string
  monthlyLimit: number
  used: number
  safetyBuffer: number
  available: number
  eligibleSubscriberCount: number
}

type CampaignsResponse = {
  campaigns: Array<{
    id: number
    subject: string
    status: string
    recipient_count: number
    sent_count: number
    failed_count: number
    skipped_count: number
    created_by: string
    created_at: string | null
    started_at: string | null
    completed_at: string | null
  }>
}

function fmtDate(value: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function fmtMoney(amount: number, currency: string) {
  if (amount === 0) return "Free"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount / 100)
}

const STAT_CARDS = [
  { key: "totalUsers", label: "Total users", icon: Users },
  { key: "totalSubscribers", label: "Subscribers", icon: UserCheck },
  { key: "totalPurchases", label: "Purchases", icon: ShoppingBag },
  { key: "totalEmailsSent", label: "Emails sent", icon: Mail },
  { key: "totalOtpVerifications", label: "OTP verifications", icon: KeyRound },
] as const

const SECTIONS = [
  { key: "users", label: "Users", icon: Users },
  { key: "purchases", label: "Purchases", icon: ShoppingBag },
  { key: "campaigns", label: "Campaigns", icon: Mail },
] as const

type SectionKey = (typeof SECTIONS)[number]["key"]

function PaginationControls({
  pagination,
  onPageChange,
  isLoading,
}: {
  pagination?: Pagination
  onPageChange: (page: number) => void
  isLoading?: boolean
}) {
  const page = pagination?.page ?? 1
  const pageSize = pagination?.pageSize ?? PAGE_SIZE
  const total = pagination?.total ?? 0
  const totalPages = pagination?.totalPages ?? 1
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {start}-{end} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={isLoading || page <= 1}
          aria-label="Previous page"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="min-w-20 text-center text-xs">
          Page {page} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={isLoading || page >= totalPages}
          aria-label="Next page"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "active" || status === "completed" || status === "sent") {
    return <Badge className="bg-success/15 text-success hover:bg-success/15">{status}</Badge>
  }
  if (status === "queued" || status === "sending") {
    return <Badge className="bg-primary/10 text-primary hover:bg-primary/10">{status}</Badge>
  }
  if (status === "paused") {
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{status}</Badge>
  }

  return <Badge variant="secondary">{status ?? "None"}</Badge>
}

export function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<SectionKey>("users")
  const [usersPage, setUsersPage] = useState(1)
  const [purchasesPage, setPurchasesPage] = useState(1)
  const { data: stats } = useSWR<Record<string, number>>("/api/admin/stats", fetcher)
  const { data: usersData, isLoading: usersLoading } = useSWR<UsersResponse>(
    `/api/admin/users?page=${usersPage}&pageSize=${PAGE_SIZE}`,
    fetcher,
  )
  const { data: purchasesData, isLoading: purchasesLoading } = useSWR<PurchasesResponse>(
    `/api/admin/purchases?page=${purchasesPage}&pageSize=${PAGE_SIZE}`,
    fetcher,
  )
  const { data: emailUsage, mutate: mutateEmailUsage } = useSWR<EmailUsageResponse>("/api/admin/email-usage", fetcher)
  const {
    data: campaignsData,
    isLoading: campaignsLoading,
    mutate: mutateCampaigns,
  } = useSWR<CampaignsResponse>("/api/admin/email-campaigns", fetcher)

  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [queueing, setQueueing] = useState(false)
  const [campaignActionId, setCampaignActionId] = useState<number | null>(null)

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" })
    router.refresh()
  }

  async function queueCampaign(e: React.FormEvent) {
    e.preventDefault()
    if (queueing) return
    setQueueing(true)
    try {
      const res = await fetch("/api/admin/email-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to queue campaign.")
        return
      }
      toast.success(`Campaign queued for ${data.recipientCount} recipient(s).`)
      setSubject("")
      setBody("")
      mutateCampaigns()
      mutateEmailUsage()
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setQueueing(false)
    }
  }

  async function campaignAction(campaignId: number, action: "cancel" | "resume") {
    setCampaignActionId(campaignId)
    try {
      const res = await fetch(`/api/admin/email-campaigns/${campaignId}/${action}`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? `Could not ${action} campaign.`)
        return
      }
      toast.success(data.message ?? `Campaign ${action}ed.`)
      mutateCampaigns()
      mutateEmailUsage()
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setCampaignActionId(null)
    }
  }

  const currentSection = SECTIONS.find((section) => section.key === activeSection)
  const campaignRecipientCount = emailUsage?.eligibleSubscriberCount ?? 0
  const campaignAllowed = campaignRecipientCount > 0 && campaignRecipientCount <= (emailUsage?.available ?? 0)
  const campaignReady = subject.trim().length >= 3 && body.trim().length >= 10 && campaignAllowed
  const activeCampaign = campaignsData?.campaigns?.find((campaign) =>
    ["queued", "sending"].includes(campaign.status),
  )

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-border bg-card px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="flex items-start justify-between gap-4 lg:block">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-primary text-primary-foreground">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <h1 className="mt-3 font-heading text-xl font-semibold tracking-tight text-foreground">
                Admin dashboard
              </h1>
              <p className="mt-1 max-w-48 truncate text-xs text-muted-foreground">{adminEmail}</p>
            </div>
            <Button variant="outline" onClick={logout} className="gap-2 bg-transparent lg:hidden">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {SECTIONS.map((section) => {
              const Icon = section.icon
              const selected = activeSection === section.key
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  className={cn(
                    "flex min-w-fit items-center gap-3 rounded-[8px] px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  aria-current={selected ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              )
            })}
          </nav>

          <Button variant="outline" onClick={logout} className="mt-6 hidden w-full gap-2 bg-transparent lg:flex">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Chef Temmie</p>
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {currentSection?.label}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">Admin workspace</p>
          </div>

          <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-5">
            {STAT_CARDS.map((card) => {
              const Icon = card.icon
              const value = stats?.[card.key]
              return (
                <div key={card.key} className="rounded-[8px] border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                    <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-accent text-accent-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-foreground">
                    {value === undefined ? <span className="text-muted-foreground">-</span> : value.toLocaleString()}
                  </p>
                </div>
              )
            })}
          </section>

          {activeSection === "users" ? (
            <section className="mt-6 overflow-hidden rounded-[8px] border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-4 sm:px-5">
                <h3 className="font-heading text-lg font-semibold text-foreground">Users</h3>
                <p className="text-sm text-muted-foreground">Registered customers and subscriber status.</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Subscriber</TableHead>
                      <TableHead className="text-right">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : usersData?.users?.length ? (
                      usersData.users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium text-foreground">{u.fullName}</TableCell>
                          <TableCell className="text-muted-foreground">{u.email}</TableCell>
                          <TableCell className="text-muted-foreground">{u.platform ?? "-"}</TableCell>
                          <TableCell>
                            <StatusBadge status={u.subscriberStatus} />
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">{fmtDate(u.createdAt)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                          No users yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls
                pagination={usersData?.pagination}
                onPageChange={setUsersPage}
                isLoading={usersLoading}
              />
            </section>
          ) : null}

          {activeSection === "purchases" ? (
            <section className="mt-6 overflow-hidden rounded-[8px] border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-4 sm:px-5">
                <h3 className="font-heading text-lg font-semibold text-foreground">Purchases</h3>
                <p className="text-sm text-muted-foreground">Orders, access grants, and payment status.</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchasesLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : purchasesData?.purchases?.length ? (
                      purchasesData.purchases.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-muted-foreground">{p.email}</TableCell>
                          <TableCell className="font-medium text-foreground">{p.product ?? "-"}</TableCell>
                          <TableCell>
                            <StatusBadge status={p.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">{fmtMoney(p.amount, p.currency)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{fmtDate(p.createdAt)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                          No purchases yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls
                pagination={purchasesData?.pagination}
                onPageChange={setPurchasesPage}
                isLoading={purchasesLoading}
              />
            </section>
          ) : null}

          {activeSection === "campaigns" ? (
            <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
              <form onSubmit={queueCampaign} className="rounded-[8px] border border-border bg-card p-5 shadow-sm">
                <h3 className="font-heading text-lg font-semibold text-foreground">Queue meal plan campaign</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Campaigns are queued first. The cron worker sends a small Mailtrap batch each minute.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Monthly allowance", value: emailUsage?.monthlyLimit },
                    { label: "Used this month", value: emailUsage?.used },
                    { label: "Safety buffer", value: emailUsage?.safetyBuffer },
                    { label: "Available to send", value: emailUsage?.available },
                    { label: "Eligible subscribers", value: campaignRecipientCount },
                    { label: "This campaign uses", value: campaignRecipientCount },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[8px] border border-border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-1 text-xl font-semibold text-foreground">
                        {item.value === undefined ? "-" : item.value.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                <div
                  className={cn(
                    "mt-4 rounded-[8px] border p-3 text-sm",
                    campaignAllowed
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-destructive/30 bg-destructive/10 text-destructive",
                  )}
                >
                  {campaignAllowed
                    ? "Allowed. This campaign fits within the remaining monthly allowance."
                    : "Not enough monthly email allowance. Reduce audience or upgrade Mailtrap plan."}
                </div>

                {activeCampaign ? (
                  <div className="mt-4 rounded-[8px] border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                    Campaign #{activeCampaign.id} is currently {activeCampaign.status}. Only one queued or sending
                    campaign is allowed at a time.
                  </div>
                ) : null}

                <div className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="campaign-subject">Subject</Label>
                    <Input
                      id="campaign-subject"
                      placeholder="Your next student meal plan is ready"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      disabled={Boolean(activeCampaign)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="campaign-body">HTML content</Label>
                    <Textarea
                      id="campaign-body"
                      rows={10}
                      placeholder="<h1>This week's meal plan</h1><p>Write the meal plan email body here.</p>"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      disabled={Boolean(activeCampaign)}
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={!campaignReady || queueing || Boolean(activeCampaign)}
                    className="h-11 w-full gap-2"
                  >
                    {queueing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    Queue campaign
                  </Button>
                </div>
              </form>

              <div className="overflow-hidden rounded-[8px] border border-border bg-card shadow-sm">
                <div className="border-b border-border px-4 py-4 sm:px-5">
                  <h3 className="font-heading text-lg font-semibold text-foreground">Campaign history</h3>
                  <p className="text-sm text-muted-foreground">Queued meal plan campaigns and delivery progress.</p>
                </div>
                <div className="divide-y divide-border">
                  {campaignsLoading ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </div>
                  ) : campaignsData?.campaigns?.length ? (
                    campaignsData.campaigns.map((campaign) => (
                      <div key={campaign.id} className="px-4 py-4 sm:px-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{campaign.subject}</p>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span>{campaign.recipient_count.toLocaleString()} recipients</span>
                              <span>{campaign.sent_count.toLocaleString()} sent</span>
                              <span>{campaign.failed_count.toLocaleString()} failed</span>
                              <span>{campaign.skipped_count.toLocaleString()} skipped</span>
                              <span>{fmtDate(campaign.created_at)}</span>
                            </div>
                          </div>
                          <StatusBadge status={campaign.status} />
                        </div>
                        {campaign.status === "paused" || campaign.status === "queued" || campaign.status === "sending" ? (
                          <div className="mt-3 flex gap-2">
                            {campaign.status === "paused" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={campaignActionId === campaign.id}
                                onClick={() => campaignAction(campaign.id, "resume")}
                              >
                                Resume
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={campaignActionId === campaign.id}
                              onClick={() => campaignAction(campaign.id, "cancel")}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : null}
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  ((campaign.sent_count + campaign.failed_count + campaign.skipped_count) /
                                    Math.max(1, campaign.recipient_count)) *
                                    100,
                                ),
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">No campaigns queued yet.</div>
                  )}
                </div>
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  )
}
