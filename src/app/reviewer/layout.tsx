"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { FileText, LogOut, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ReviewerAccount } from "@/types"

export default function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === "/reviewer/login"
  const [reviewer, setReviewer] = useState<ReviewerAccount | null>(null)
  const [loading, setLoading] = useState(!isLoginPage)

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false)
      return
    }

    let cancelled = false
    async function loadReviewer() {
      setLoading(true)
      try {
        const response = await fetch("/api/reviewer/me", { cache: "no-store" })
        if (!response.ok) {
          router.replace(`/reviewer/login?next=${encodeURIComponent(pathname)}`)
          return
        }
        const payload = await response.json()
        if (!cancelled) setReviewer(payload.reviewer)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadReviewer()
    return () => {
      cancelled = true
    }
  }, [isLoginPage, pathname, router])

  const handleLogout = async () => {
    await fetch("/api/reviewer/logout", { method: "POST" }).catch(() => null)
    router.push("/reviewer/login")
    router.refresh()
  }

  if (isLoginPage) return <>{children}</>

  if (loading || !reviewer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-900 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-slate-950">Tong Class Reviewer</p>
              <p className="text-xs text-slate-500">{reviewer.displayName} · {reviewer.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/reviewer/reimbursements/academic-exchange">
                <FileText className="mr-2 h-4 w-4" />
                报销申请
              </Link>
            </Button>
            <Button type="button" variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              退出
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
