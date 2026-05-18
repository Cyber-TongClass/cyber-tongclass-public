"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { LogIn } from "lucide-react"
import { TechDayShell } from "@/components/techday/techday-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { notifyTechDayActorStorageChanged, useTechDayLogin } from "@/lib/api"

export default function TechDayLoginPage() {
  const router = useRouter()
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
      router.push("/techday")
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
        </CardContent>
      </Card>
    </TechDayShell>
  )
}
