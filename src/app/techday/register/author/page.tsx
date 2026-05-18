"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { TechDayShell } from "@/components/techday/techday-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { notifyTechDayActorStorageChanged, useRegisterTechDayAuthor } from "@/lib/api"

export default function TechDayAuthorRegisterPage() {
  const router = useRouter()
  const register = useRegisterTechDayAuthor()
  const [form, setForm] = useState({ email: "", name: "", password: "", school: "", college: "", grade: "", studentId: "" })
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    try {
      const result = await register(form)
      window.localStorage.setItem("techday_session_token", result.sessionToken)
      notifyTechDayActorStorageChanged()
      router.push("/techday/author/profile")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "注册失败")
    }
  }

  return (
    <TechDayShell title="作者注册" description="外部作者注册 TechDay-only 账号后可上传和维护自己的作品。">
      <Card className="mx-auto max-w-2xl">
        <CardHeader><CardTitle>创建作者账号</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
            {[
              ["name", "姓名"],
              ["email", "邮箱"],
              ["school", "学校"],
              ["college", "院系"],
              ["grade", "年级"],
              ["studentId", "学号/编号"],
              ["password", "密码"],
            ].map(([key, label]) => (
              <div key={key} className="grid gap-2">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type={key === "password" ? "password" : key === "email" ? "email" : "text"}
                  value={(form as any)[key]}
                  onChange={(event) => setForm((value) => ({ ...value, [key]: event.target.value }))}
                  required
                />
              </div>
            ))}
            <div className="flex items-center gap-3 md:col-span-2">
              <Button type="submit">注册</Button>
              {message ? <p className="text-sm text-red-600">{message}</p> : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </TechDayShell>
  )
}
