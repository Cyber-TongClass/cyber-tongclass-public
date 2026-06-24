"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ReviewerLoginPage() {
  return (
    <Suspense fallback={<ReviewerLoginShell />}>
      <ReviewerLoginForm />
    </Suspense>
  )
}

function ReviewerLoginShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <Loader2 className="h-6 w-6 animate-spin text-slate-900" />
    </div>
  )
}

function ReviewerLoginForm() {
  const searchParams = useSearchParams()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setLoading(true)
    try {
      const response = await fetch("/api/reviewer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.message || "Reviewer 登录失败")
        return
      }

      const next = searchParams.get("next")
      window.location.href = next?.startsWith("/reviewer") ? next : "/reviewer/reimbursements/academic-exchange"
    } catch {
      setError("Reviewer 登录失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-900 text-white">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <span className="text-left">
              <span className="block text-xl font-extrabold text-slate-950">Tong Class Reviewer</span>
              <span className="block text-sm text-slate-500">外部只读访问</span>
            </span>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reviewer 登录</CardTitle>
            <CardDescription>使用超级管理员创建的 Reviewer 用户名和密码登录。</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error ? (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="reviewer-username">用户名</Label>
                <Input
                  id="reviewer-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewer-password">密码</Label>
                <Input
                  id="reviewer-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  "登录"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
