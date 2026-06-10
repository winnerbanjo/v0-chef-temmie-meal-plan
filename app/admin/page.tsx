import { getAdminEmail } from "@/lib/session"
import { AdminLogin } from "@/components/admin-login"
import { AdminDashboard } from "@/components/admin-dashboard"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const email = await getAdminEmail()
  if (!email) {
    return <AdminLogin />
  }
  return <AdminDashboard adminEmail={email} />
}
