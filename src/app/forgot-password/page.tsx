"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useState, type FormEvent } from "react"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { safeLocalPath } from "@/lib/safe-local-path"

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
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
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-md border aia-border-rule px-6 py-8 sm:px-8 sm:py-10">
        <header>
          <p className="aia-kicker">账户 · 找回密码</p>
          <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
            忘记密码
          </h1>
          <p className="aia-text-muted mt-3 text-sm leading-6">
            输入账户邮箱。无论邮箱是否存在，系统都会返回相同提示。
          </p>
        </header>

        <div className="mt-8 border-t aia-border-rule pt-6">
          <form onSubmit={submit}>
            <label
              htmlFor="forgot-password-email"
              className="aia-mono text-xs uppercase tracking-[0.12em] aia-text-muted"
            >
              账户邮箱
            </label>
            <input
              id="forgot-password-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="请输入账户邮箱"
              className="aia-focus mt-2 w-full border aia-border-rule bg-transparent px-3 py-2.5 text-sm text-[hsl(var(--aia-ink))] placeholder:text-[hsl(var(--aia-muted))] disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button type="submit" className="mt-6 w-full" disabled={busy}>
              {busy ? "正在发送…" : "发送重置邮件"}
            </Button>
            {message ? (
              <p className="aia-text-muted mt-4 text-sm leading-6" role="status">
                {message}
              </p>
            ) : null}
          </form>

          <Link href={loginHref} className="aia-link aia-focus mt-6 inline-block text-sm font-medium">
            <ArrowLeft className="mr-1 inline h-4 w-4" aria-hidden="true" />
            返回登录
          </Link>
        </div>
      </section>
    </main>
  )
}
