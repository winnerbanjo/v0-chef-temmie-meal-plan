"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  Users,
  UserCheck,
  ShoppingBag,
  Mail,
  KeyRound,
  LogOut,
  Loader2,
  Send,
  CalendarClock,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function fmtDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const STAT_CARDS = [
  { key: "totalUsers", label: "Total users", icon: Users },
  { key: "totalSubscribers", label: "Subscribers", icon: UserCheck },
  { key: "totalPurchases", label: "Purchases", icon: ShoppingBag },
  { key: "totalEmailsSent", label: "Emails sent", icon: Mail },
  { key: "totalOtpVerifications", label: "OTP verifications", icon: KeyRound },
] as const

export function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const router = useRouter()
  const { data: stats } = useSWR<Record<string, number>>("/api/admin/stats", fetcher)
  const { data: usersData, isLoading: usersLoading } = useSWR<{ users: any[] }>("/api/admin/users", fetcher)
  const { data: purchasesData, isLoading: purchasesLoading } = useSWR<{ purchases: any[] }>(
    "/api/admin/purchases",
    fetcher,
  )
  const {
    data: broadcastData,
    mutate: mutateBroadcast,
  } = useSWR<{ broadcasts: any[]; sentToday: boolean }>("/api/admin/broadcast", fetcher)

  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [audience, setAudience] = useState("all")
  const [sending, setSending] = useState(false)

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" })
    router.refresh()
  }

  async function sendBroadcast(e: React.FormEvent) {
    e.preventDefault()
    if (sending) return
    setSending(true)
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim(), audience }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to send broadcast.")
        return
      }
      toast.success(`Broadcast sent to ${data.recipientCount} recipient(s).`)
      setSubject("")
      setBody("")
      mutateBroadcast()
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setSending(false)
    }
  }

  const lastBroadcast = broadcastData?.broadcasts?.[0]
  const sentToday = broadcastData?.sentToday ?? false
  const broadcastReady = subject.trim().length >= 3 && body.trim().length >= 3 && !sentToday

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">Admin dashboard</h1>
            <p className="text-xs text-muted-foreground">{adminEmail}</p>
          </div>
          <Button variant="outline" onClick={logout} className="gap-2 rounded-xl bg-transparent">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {STAT_CARDS.map((card) => {
            const Icon = card.icon
            const value = stats?.[card.key]
            return (
              <div key={card.key} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <p className="mt-3 text-2xl font-semibold text-foreground">
                  {value === undefined ? <span className="text-muted-foreground">—</span> : value}
                </p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            )
          })}
        </div>

        <Tabs defaultValue="users" className="mt-8">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="purchases">Purchases</TabsTrigger>
            <TabsTrigger value="broadcast">Email broadcast</TabsTrigger>
          </TabsList>

          {/* Users */}
          <TabsContent value="users">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : usersData?.users?.length ? (
                    usersData.users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-foreground">{u.fullName}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell className="text-muted-foreground">{u.platform ?? "—"}</TableCell>
                        <TableCell>
                          {u.subscriberStatus === "active" ? (
                            <Badge className="bg-success/15 text-success hover:bg-success/15">Active</Badge>
                          ) : (
                            <Badge variant="secondary">{u.subscriberStatus ?? "None"}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{fmtDate(u.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        No users yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Purchases */}
          <TabsContent value="purchases">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : purchasesData?.purchases?.length ? (
                    purchasesData.purchases.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-muted-foreground">{p.email}</TableCell>
                        <TableCell className="font-medium text-foreground">{p.product ?? "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={p.status === "completed" ? "default" : "secondary"}
                            className={p.status === "completed" ? "bg-success/15 text-success hover:bg-success/15" : ""}
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.amount === 0 ? "Free" : `${(p.amount / 100).toFixed(2)} ${p.currency}`}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{fmtDate(p.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        No purchases yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Broadcast */}
          <TabsContent value="broadcast">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <form onSubmit={sendBroadcast} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="font-heading text-lg font-semibold text-foreground">Compose broadcast</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Send one email to your audience. Limited to one broadcast per day.
                </p>

                {sentToday ? (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-secondary/50 p-3 text-sm text-muted-foreground">
                    <CalendarClock className="h-4 w-4" />
                    A broadcast has already been sent today. Try again tomorrow.
                  </div>
                ) : null}

                <div className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="A new recipe just dropped"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      disabled={sentToday}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="body">Message</Label>
                    <Textarea
                      id="body"
                      rows={7}
                      placeholder="Write your message…"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      disabled={sentToday}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target audience</Label>
                    <RadioGroup value={audience} onValueChange={setAudience} className="grid gap-2 sm:grid-cols-3">
                      {[
                        { value: "all", label: "All users" },
                        { value: "subscribers", label: "Subscribers" },
                        { value: "purchasers", label: "Purchasers" },
                      ].map((opt) => (
                        <Label
                          key={opt.value}
                          htmlFor={`aud-${opt.value}`}
                          className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3 text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                        >
                          <RadioGroupItem id={`aud-${opt.value}`} value={opt.value} />
                          {opt.label}
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={!broadcastReady || sending}
                    className="h-12 w-full gap-2 rounded-xl text-base"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send broadcast
                  </Button>
                </div>
              </form>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="font-heading text-lg font-semibold text-foreground">Recent broadcasts</h2>
                {lastBroadcast ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Last sent {fmtDate(lastBroadcast.sentAt ?? lastBroadcast.createdAt)}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">No broadcasts sent yet.</p>
                )}

                <ul className="mt-4 space-y-3">
                  {broadcastData?.broadcasts?.map((b) => (
                    <li key={b.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{b.subject}</p>
                        <Badge
                          variant={b.status === "sent" ? "default" : "secondary"}
                          className={b.status === "sent" ? "bg-success/15 text-success hover:bg-success/15" : ""}
                        >
                          {b.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {b.audience} · {b.recipientCount} recipient(s) · {fmtDate(b.sentAt ?? b.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
