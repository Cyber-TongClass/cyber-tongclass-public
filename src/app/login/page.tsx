"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { safeLocalPath } from "@/lib/safe-local-path"

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageShell />}>
      <LoginForm />
    </Suspense>
  )
}

function LoginPageShell() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <p role="status" className="aia-text-muted flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        正在加载登录页面…
      </p>
    </main>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const nextPath = safeLocalPath(searchParams.get("next"), "/")
  const encodedNext = encodeURIComponent(nextPath)

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      window.location.replace(nextPath)
    }
  }, [authLoading, isAuthenticated, nextPath])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await login(identifier, password)
      if (!result.ok) {
        setError(result.error || "账号或密码错误，请重试")
        return
      }
      
      window.location.href = nextPath
    } catch {
      setError("账号或密码错误，请重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="aia-focus inline-block">
            <span className="aia-serif block text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))] sm:text-2xl">
              北京大学人工智能研究院
            </span>
            <p className="aia-mono mt-1 text-xs uppercase tracking-[0.12em] aia-text-muted">综合服务系统</p>
          </Link>
        </div>

        <section className="border aia-border-rule px-6 py-8 sm:px-8 sm:py-10">
          <header>
            <p className="aia-kicker">账户 · 登录</p>
            <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
              登录
            </h1>
            <p className="aia-text-muted mt-3 text-sm leading-6">使用您的账号和密码登录。</p>
          </header>

          <form onSubmit={handleSubmit}>
            <div className="mt-8 border-t aia-border-rule pt-6">
              {error && (
                <p role="alert" className="mb-5 text-sm leading-6 text-[hsl(var(--aia-red))]">
                  {error}
                </p>
              )}

              <div>
                <label htmlFor="identifier" className="aia-mono text-xs uppercase tracking-[0.12em] aia-text-muted">
                  账号（学号 / 用户名 / 工号）
                </label>
                <input
                  id="identifier"
                  type="text"
                  placeholder="请输入学号、用户名或工号"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  disabled={isLoading || authLoading}
                  className="aia-focus mt-2 w-full border aia-border-rule bg-transparent px-3 py-2.5 text-sm text-[hsl(var(--aia-ink))] placeholder:text-[hsl(var(--aia-muted))] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="aia-mono text-xs uppercase tracking-[0.12em] aia-text-muted">
                    密码
                  </label>
                  <Link
                    href={`/forgot-password?next=${encodedNext}`}
                    className="aia-link aia-focus text-xs"
                  >
                    忘记密码？
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || authLoading}
                  className="aia-focus mt-2 w-full border aia-border-rule bg-transparent px-3 py-2.5 text-sm text-[hsl(var(--aia-ink))] placeholder:text-[hsl(var(--aia-muted))] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="mt-7">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || authLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登录中...
                    </>
                  ) : (
                    "登录"
                  )}
                </Button>
                <p className="aia-text-muted mt-4 text-center text-sm leading-6">
                  如需开通账号，请联系管理员统一创建。
                </p>
              </div>
            </div>
          </form>
        </section>

        <p className="mt-6 text-center">
          <Link href={nextPath} className="aia-link aia-focus text-sm font-medium">
            <ArrowLeft className="mr-1 inline h-4 w-4" aria-hidden="true" />
            返回之前页面
          </Link>
        </p>
      </div>
    </main>
  )
}
