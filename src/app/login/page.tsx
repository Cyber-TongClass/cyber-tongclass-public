"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
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
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
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
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="block text-2xl font-extrabold text-primary sm:text-3xl">北京大学人工智能研究院综合服务系统</span>
            <p className="mt-1 text-slate-600">Artificial Intelligence Agora</p>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">登录</h1>
            <CardDescription>
              使用您的账号和密码登录
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="identifier" className="text-sm font-medium">
                  账号（学号 / 用户名 / 工号）
                </label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="请输入学号、用户名或工号"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  disabled={isLoading || authLoading}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">
                    密码
                  </label>
                  <Link
                    href={`/forgot-password?next=${encodedNext}`}
                    className="text-sm text-primary hover:underline"
                  >
                    忘记密码?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || authLoading}
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
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
              
              <p className="text-sm text-center text-slate-600">
                如需开通账号，请联系管理员统一创建。
              </p>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-sm text-slate-600 mt-6">
          <Link href={nextPath} className="hover:underline">
            ← 返回之前页面
          </Link>
        </p>
      </div>
    </div>
  )
}
