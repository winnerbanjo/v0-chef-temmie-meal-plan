"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function logout() {
    setLoading(true)
    try {
      await fetch("/api/purchases/logout", { method: "POST" })
      router.push("/")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={logout} disabled={loading} className="gap-2 rounded-xl bg-transparent">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      Log out
    </Button>
  )
}
