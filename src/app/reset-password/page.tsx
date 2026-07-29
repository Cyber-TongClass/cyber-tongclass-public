"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { safeLocalPath } from "@/lib/safe-local-path"

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="container-custom max-w-md py-16">正在加载重置页面…</main>}>
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
    <main className="container-custom max-w-md py-16">
      <h1 className="aia-serif text-3xl font-semibold">重置密码</h1>
      {!token ? <p className="mt-4 text-sm" role="alert">缺少重置令牌，请重新申请重置邮件。</p> : null}
      {!done && token ? (
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label htmlFor="new-password" className="sr-only">新密码</label>
          <Input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="新密码" />
          <label htmlFor="new-password-confirmation" className="sr-only">再次输入新密码</label>
          <Input id="new-password-confirmation" type="password" required minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="再次输入新密码" />
          <Button type="submit" disabled={busy}>{busy ? "正在重置…" : "确认重置"}</Button>
        </form>
      ) : null}
      {message ? <p className="mt-4 text-sm leading-6" role="status">{message}</p> : null}
      <Link className="aia-link mt-6 inline-block text-sm" href={loginHref}>返回登录</Link>
    </main>
  )
}
