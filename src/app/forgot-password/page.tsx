"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { safeLocalPath } from "@/lib/safe-local-path"

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ForgotPasswordForm />
    </Suspense>
  )
}

function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const next = safeLocalPath(searchParams.get("next"), "/")
  const loginHref = `/login?next=${encodeURIComponent(next)}`

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch("/api/request-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, purpose: "password_reset", next }),
      })
      const result = await response.json()
      setMessage(result.message || "如果该邮箱对应有效账户，重置邮件已发送。")
    } catch {
      setMessage("暂时无法发送重置邮件，请稍后再试。")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>忘记密码</CardTitle>
          <CardDescription>
            输入账户邮箱。无论邮箱是否存在，系统都会返回相同提示。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <label htmlFor="forgot-password-email" className="sr-only">账户邮箱</label>
            <Input id="forgot-password-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="账户邮箱" />
            <Button type="submit" disabled={busy}>{busy ? "正在发送…" : "发送重置邮件"}</Button>
            {message ? <p className="text-sm leading-6" role="status">{message}</p> : null}
          </form>
        </CardContent>
        <CardFooter>
          <Link href={loginHref} className="text-sm text-primary hover:underline">
            ← 返回登录
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
