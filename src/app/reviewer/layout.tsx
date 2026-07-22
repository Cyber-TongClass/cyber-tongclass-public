"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, FileText, LogOut, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTongClassSessionToken } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import type { ReviewerAccount } from "@/types"
import { REVIEWER_MAIN_SESSION_HEADER } from "./reviewer-access-constants"
import { ReviewerAccessProvider, type ReviewerAccess } from "./reviewer-access-context"

type IndependentReviewerPayload = {
  accessMode?: "independent"
  reviewer?: ReviewerAccount | null
}

type TeacherReviewerPayload = {
  accessMode?: "teacher_derived"
}

export default function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === "/reviewer/login"
  const mainSessionToken = useTongClassSessionToken()
  const { isAuthenticated, isLoading: mainAuthLoading } = useAuth()
  const [reviewer, setReviewer] = useState<ReviewerAccount | null>(null)
  const [access, setAccess] = useState<ReviewerAccess | null>(null)
  const [loading, setLoading] = useState(!isLoginPage)

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadIndependentReviewer() {
      const response = await fetch("/api/reviewer/me", { cache: "no-store" })
      if (!response.ok) return null
      const payload = await response.json() as IndependentReviewerPayload
      return payload.accessMode === "independent" && payload.reviewer ? payload.reviewer : null
    }

    async function loadTeacherReviewer() {
      const response = await fetch("/api/reviewer/me", {
        cache: "no-store",
        headers: { [REVIEWER_MAIN_SESSION_HEADER]: mainSessionToken },
      })
      if (!response.ok) return false
      const payload = await response.json() as TeacherReviewerPayload
      return payload.accessMode === "teacher_derived"
    }

    async function loadReviewerAccess() {
      setLoading(true)
      setAccess(null)
      setReviewer(null)
      let settled = false

      try {
        // A valid independent Reviewer cookie always wins. This keeps existing
        // external Reviewer access working without forwarding the main token.
        const independentReviewer = await loadIndependentReviewer().catch(() => null)
        if (independentReviewer) {
          if (!cancelled) {
            setReviewer(independentReviewer)
            setAccess({ mode: "independent" })
          }
          settled = true
          return
        }

        // Wait for the main-site hook to prove the local token still maps to an
        // authenticated account before forwarding it to the server route.
        if (mainAuthLoading) return

        if (isAuthenticated && mainSessionToken) {
          const teacherAuthorized = await loadTeacherReviewer().catch(() => false)
          if (teacherAuthorized) {
            if (!cancelled) {
              setAccess({ mode: "teacher_derived", mainSessionToken })
            }
            settled = true
            return
          }
        }

        settled = true
        router.replace(`/reviewer/login?next=${encodeURIComponent(pathname)}`)
      } finally {
        if (settled && !cancelled) setLoading(false)
      }
    }

    loadReviewerAccess()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isLoginPage, mainAuthLoading, mainSessionToken, pathname, router])

  const handleReviewerLogout = async () => {
    await fetch("/api/reviewer/logout", { method: "POST" }).catch(() => null)
    router.push("/reviewer/login")
    router.refresh()
  }

  if (isLoginPage) return <>{children}</>

  if (loading || !access) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    )
  }

  const isTeacherDerived = access.mode === "teacher_derived"

  return (
    <ReviewerAccessProvider value={access}>
      <div className="min-h-screen bg-slate-50">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-900 text-white">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-slate-950">Tong Class Reviewer</p>
                {isTeacherDerived ? (
                  <p className="text-xs text-slate-500">教师授权访问 · 使用主站会话</p>
                ) : (
                  <p className="text-xs text-slate-500">{reviewer?.displayName} · {reviewer?.username}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost">
                <Link href="/reviewer/reimbursements/academic-exchange">
                  <FileText className="mr-2 h-4 w-4" />
                  报销申请
                </Link>
              </Button>
              {isTeacherDerived ? (
                <Button asChild variant="outline">
                  <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    返回 AIA
                  </Link>
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={handleReviewerLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  退出 Reviewer
                </Button>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </ReviewerAccessProvider>
  )
}
