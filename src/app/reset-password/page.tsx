"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useState, type FormEvent } from "react"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { safeLocalPath } from "@/lib/safe-local-path"

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="container-custom max-w-md py-16">
          <p className="aia-text-muted text-sm">正在加载重置页面…</p>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const next = safeLocalPath(searchParams.get("next"), "/")
  const loginHref = `/login?next=${encodeURIComponent(next)}`
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (password.length < 8 || password !== confirmation) {
      setMessage("密码至少需要 8 位，且两次输入必须一致。")
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const resetResponse = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      })
      const result = await resetResponse.json()
      if (!resetResponse.ok) throw new Error(result.message || "密码重置失败。")
      setDone(true)
      setMessage("密码已重置，所有旧登录会话已失效。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "密码重置失败。")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-md border aia-border-rule px-6 py-8 sm:px-8 sm:py-10">
        <header>
          <p className="aia-kicker">账户 · 重置密码</p>
          <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
            重置密码
          </h1>
          <p className="aia-text-muted mt-3 text-sm leading-6">
            设置新密码后，所有旧登录会话将失效。
          </p>
        </header>

        <div className="mt-8 border-t aia-border-rule pt-6">
          {!token ? (
            <p className="text-sm leading-6 text-[hsl(var(--aia-red))]" role="alert">
              缺少重置令牌，请重新申请重置邮件。
            </p>
          ) : null}
          {!done && token ? (
            <form onSubmit={submit}>
              <div>
                <label htmlFor="new-password" className="aia-mono text-xs uppercase tracking-[0.12em] aia-text-muted">
                  新密码
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="请输入新密码"
                  className="aia-focus mt-2 w-full border aia-border-rule bg-transparent px-3 py-2.5 text-sm text-[hsl(var(--aia-ink))] placeholder:text-[hsl(var(--aia-muted))] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="mt-5">
                <label
                  htmlFor="new-password-confirmation"
                  className="aia-mono text-xs uppercase tracking-[0.12em] aia-text-muted"
                >
                  再次输入新密码
                </label>
                <input
                  id="new-password-confirmation"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="请再次输入新密码"
                  className="aia-focus mt-2 w-full border aia-border-rule bg-transparent px-3 py-2.5 text-sm text-[hsl(var(--aia-ink))] placeholder:text-[hsl(var(--aia-muted))] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <Button type="submit" className="mt-6 w-full" disabled={busy}>
                {busy ? "正在重置…" : "确认重置"}
              </Button>
            </form>
          ) : null}
          {message ? (
            <p
              className={
                done
                  ? "aia-text-muted mt-4 text-sm leading-6"
                  : "mt-4 text-sm leading-6 text-[hsl(var(--aia-red))]"
              }
              role="status"
            >
              {message}
            </p>
          ) : null}
          <Link className="aia-link aia-focus mt-6 inline-block text-sm font-medium" href={loginHref}>
            <ArrowLeft className="mr-1 inline h-4 w-4" aria-hidden="true" />
            返回登录
          </Link>
        </div>
      </section>
    </main>
  )
}
