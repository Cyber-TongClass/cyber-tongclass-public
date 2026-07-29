"use client"

import { FormEvent, Suspense, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { LogIn } from "lucide-react"
import { TechDayShell } from "@/components/techday/techday-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { notifyTechDayActorStorageChanged, useTechDayLogin } from "@/lib/api"
import { safeLocalPath } from "@/lib/safe-local-path"

export default function TechDayLoginPage() {
  return (
    <Suspense fallback={<TechDayLoginLoading />}>
      <TechDayLoginForm />
    </Suspense>
  )
}

function TechDayLoginLoading() {
  return (
    <TechDayShell title="TechDay 登录" description="正在读取登录入口...">
      <Card className="mx-auto max-w-md">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">正在加载...</CardContent>
      </Card>
    </TechDayShell>
  )
}

function TechDayLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const login = useTechDayLogin()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      const result = await login({ identifier, password })
      window.localStorage.setItem("techday_session_token", result.sessionToken)
      notifyTechDayActorStorageChanged()
      router.push(safeLocalPath(searchParams.get("next"), "/techday"))
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录失败")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <TechDayShell title="TechDay 登录" description="外部作者、志愿者和审阅者使用 TechDay-only 账号登录。通班内部成员可直接使用主站登录。">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>TechDay-only 账号</CardTitle>
          <CardDescription>可使用邮箱或已使用的邀请码登录。</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="identifier">邮箱 / 邀请码</Label>
              <Input id="identifier" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">密码</Label>
              <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
            <Button type="submit" disabled={submitting}>
              <LogIn className="mr-2 h-4 w-4" />
              {submitting ? "登录中..." : "登录"}
            </Button>
            {message ? <p className="text-sm text-red-600">{message}</p> : null}
          </form>
          <div className="mt-5 border-t pt-4 text-sm text-muted-foreground">
            还没有账号？
            <Link className="ml-2 font-medium text-primary underline-offset-4 hover:underline" href="/techday/register/author">注册作者账号</Link>
            <span className="mx-2" aria-hidden="true">·</span>
            <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/techday/register/volunteer">申请志愿者账号</Link>
          </div>
        </CardContent>
      </Card>
    </TechDayShell>
  )
}
