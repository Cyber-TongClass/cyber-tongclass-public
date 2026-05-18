"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { TechDayShell } from "@/components/techday/techday-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { notifyTechDayActorStorageChanged, useGetTechDayReviewerInvite, useRegisterTechDayReviewer, useTechDayDirections } from "@/lib/api"

export default function TechDayReviewerRegisterPage() {
  const router = useRouter()
  const register = useRegisterTechDayReviewer()
  const directions = useTechDayDirections()
  const [inviteCode, setInviteCode] = useState("")
  const invite = useGetTechDayReviewerInvite(inviteCode.trim() || null)
  const [form, setForm] = useState({ name: "", email: "", password: "", directionId: "" })
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    try {
      const result = await register({
        inviteCode,
        name: form.name,
        email: form.email,
        password: form.password,
        directionId: form.directionId ? form.directionId as any : undefined,
      })
      window.localStorage.setItem("techday_session_token", result.sessionToken)
      notifyTechDayActorStorageChanged()
      router.push("/techday/awards")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "注册失败")
    }
  }

  return (
    <TechDayShell title="审阅者注册" description="审阅者需要管理员发放的邀请码，注册后只能访问对应方向的奖项推荐流程。">
      <Card className="mx-auto max-w-2xl">
        <CardHeader><CardTitle>邀请码注册</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="invite">邀请码</Label>
              <Input id="invite" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} required />
              {invite ? <p className="text-sm text-slate-600">预设方向：{invite.presetDirectionName || "未预设"}，状态：{invite.isUsed ? "已使用" : "可用"}</p> : null}
            </div>
            <div className="grid gap-2"><Label htmlFor="name">姓名</Label><Input id="name" value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} required /></div>
            <div className="grid gap-2"><Label htmlFor="email">邮箱</Label><Input id="email" type="email" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} required /></div>
            <div className="grid gap-2"><Label htmlFor="password">密码</Label><Input id="password" type="password" value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} required /></div>
            <div className="grid gap-2">
              <Label>方向</Label>
              <Select value={form.directionId || "none"} onValueChange={(value) => setForm((current) => ({ ...current, directionId: value === "none" ? "" : value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">使用邀请码预设</SelectItem>
                  {directions?.map((direction: any) => <SelectItem key={direction._id} value={direction._id}>{direction.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
