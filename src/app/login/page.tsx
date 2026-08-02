"use client"

import { Suspense, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Building2, KeyRound, Loader2, ShieldCheck } from "lucide-react"
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
    <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
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
    <main className="bg-white">
      <div className="container-custom grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="flex items-center py-12 pr-0 sm:py-16 lg:pr-20 xl:pr-28">
          <div className="w-full max-w-xl">
            <Link href="/" className="aia-focus inline-block">
              <Image
                src="/brand/aia/pku-iai-horizontal-lockup.png"
                alt="北京大学人工智能研究院"
                width={560}
                height={112}
                priority
                className="h-auto w-full max-w-[17rem]"
              />
              <span className="aia-mono mt-3 block text-[0.7rem] uppercase tracking-[0.16em] text-[hsl(var(--aia-red))]">
                综合服务系统 · Account Access
              </span>
            </Link>

            <section className="mt-10 max-w-md sm:mt-14">
              <header>
                <p className="aia-kicker">账户 · 登录</p>
                <h1 className="aia-serif mt-3 text-4xl font-semibold tracking-[-0.035em] text-[hsl(var(--aia-ink))] sm:text-5xl">
                  登录
                </h1>
                <p className="aia-text-muted mt-4 text-sm leading-7">
                  使用研究院统一账号访问与您身份相关的服务和工作模块。
                </p>
              </header>

              <form onSubmit={handleSubmit} className="mt-9 border-t aia-border-rule pt-7">
                {error && (
                  <p role="alert" className="mb-5 border-l-2 border-[hsl(var(--aia-red))] bg-[hsl(var(--aia-warm))] px-4 py-3 text-sm leading-6 text-[hsl(var(--aia-red-deep))]">
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
                    autoComplete="username"
                    placeholder="请输入学号、用户名或工号"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    disabled={isLoading || authLoading}
                    className="aia-focus mt-2 min-h-12 w-full border aia-border-rule bg-white px-4 py-3 text-sm text-[hsl(var(--aia-ink))] transition-colors placeholder:text-[hsl(var(--aia-muted))] hover:border-[hsl(var(--aia-muted))] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="aia-mono text-xs uppercase tracking-[0.12em] aia-text-muted">
                      密码
                    </label>
                    <Link href={`/forgot-password?next=${encodedNext}`} className="aia-link aia-focus text-xs">
                      忘记密码？
                    </Link>
                  </div>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading || authLoading}
                    className="aia-focus mt-2 min-h-12 w-full border aia-border-rule bg-white px-4 py-3 text-sm text-[hsl(var(--aia-ink))] transition-colors placeholder:text-[hsl(var(--aia-muted))] hover:border-[hsl(var(--aia-muted))] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <Button
                  type="submit"
                  className="mt-7 min-h-12 w-full rounded-none bg-[hsl(var(--aia-red))] font-semibold text-white hover:bg-[hsl(var(--aia-red-deep))]"
                  disabled={isLoading || authLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登录中...
                    </>
                  ) : (
                    <>
                      登录并继续
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </Button>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <p className="aia-text-muted">账号由研究院统一创建与管理。</p>
                  <Link href={nextPath} className="aia-link aia-focus font-medium">
                    <ArrowLeft className="mr-1 inline h-4 w-4" aria-hidden="true" />
                    返回之前页面
                  </Link>
                </div>
              </form>
            </section>
          </div>
        </div>

        <aside className="-mx-4 flex flex-col justify-between bg-[hsl(var(--aia-red))] px-6 py-10 text-white sm:-mx-6 sm:px-10 lg:mx-0 lg:px-10 lg:py-14" aria-label="内网说明">
          <div>
            <p className="aia-mono text-[0.7rem] uppercase tracking-[0.18em] text-white/65">AIA · INTRANET</p>
            <h2 className="mt-5 max-w-xs text-3xl font-semibold leading-[1.25] tracking-[-0.025em]">
              一个身份，连接研究院服务
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/72">
              登录后，系统会依据账户权限呈现通知、活动、研究资料和管理入口。
            </p>
          </div>

          <div className="mt-12 border-t border-white/25">
            <div className="grid grid-cols-[2rem_1fr] gap-3 border-b border-white/25 py-5">
              <ShieldCheck className="h-5 w-5 text-white/70" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">统一身份与权限</p>
                <p className="mt-1 text-xs leading-5 text-white/65">仅呈现与你职责相关的模块。</p>
              </div>
            </div>
            <div className="grid grid-cols-[2rem_1fr] gap-3 border-b border-white/25 py-5">
              <Building2 className="h-5 w-5 text-white/70" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">研究院综合服务</p>
                <p className="mt-1 text-xs leading-5 text-white/65">公共信息与内部工作保持同一入口。</p>
              </div>
            </div>
            <div className="grid grid-cols-[2rem_1fr] gap-3 py-5">
              <KeyRound className="h-5 w-5 text-white/70" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">需要账户帮助？</p>
                <p className="mt-1 text-xs leading-5 text-white/65">请联系研究院管理员核验账户信息。</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
