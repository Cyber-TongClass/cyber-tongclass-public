"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { TechDayShell } from "@/components/techday/techday-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  notifyTechDayActorStorageChanged,
  useApplyInternalTechDayVolunteer,
  useRegisterTechDayVolunteer,
  useTechDayActorArgs,
  useTechDayCurrentPrincipal,
  useTechDayInternalVolunteerApplication,
  useTechDayOrganizations,
} from "@/lib/api"

const timeSlots = ["12:30-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00", "17:00-18:00"]
const statusLabels: Record<string, string> = {
  active: "已通过",
  pending: "等待管理员审核与分配组织",
  disabled: "已禁用",
}

export default function TechDayVolunteerRegisterPage() {
  const router = useRouter()
  const actorArgs = useTechDayActorArgs()
  const principal = useTechDayCurrentPrincipal(actorArgs)
  const organizations = useTechDayOrganizations()
  const application = useTechDayInternalVolunteerApplication(actorArgs.mainSessionToken ? actorArgs : null)
  const register = useRegisterTechDayVolunteer()
  const applyInternal = useApplyInternalTechDayVolunteer()
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    school: "",
    college: "",
    grade: "",
    studentId: "",
  })
  const [selectedOrgNames, setSelectedOrgNames] = useState<string[]>([])
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [voteCounterOptIn, setVoteCounterOptIn] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isInternal = Boolean(principal?.mainUser)
  const organizationNames = useMemo(() => (organizations || []).map((org: any) => org.name), [organizations])

  useEffect(() => {
    if (!application) return
    if (application.volunteerTracks?.length) setSelectedOrgNames(application.volunteerTracks)
    if (application.availabilitySlots?.length) setSelectedSlots(application.availabilitySlots)
    setVoteCounterOptIn(Boolean(application.voteCounterOptIn))
  }, [application])

  const toggleOrg = (name: string) => {
    setSelectedOrgNames((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name])
  }

  const toggleSlot = (slot: string) => {
    setSelectedSlots((current) => current.includes(slot) ? current.filter((item) => item !== slot) : [...current, slot])
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)
    try {
      if (isInternal) {
        if (!actorArgs.mainSessionToken) throw new Error("请先使用通班账号登录")
        const result = await applyInternal({
          mainSessionToken: actorArgs.mainSessionToken,
          volunteerTracks: selectedOrgNames,
          availabilitySlots: selectedSlots,
          voteCounterOptIn,
        })
        notifyTechDayActorStorageChanged()
        setMessage(result.pendingApproval ? "报名已提交，等待管理员审核并分配志愿者组织。" : "志愿者信息已更新。")
        return
      }
      const result = await register({
        ...form,
        volunteerTracks: selectedOrgNames,
        availabilitySlots: selectedSlots,
        voteCounterOptIn,
      })
      if (result.sessionToken) {
        window.localStorage.setItem("techday_session_token", result.sessionToken)
        notifyTechDayActorStorageChanged()
        router.push("/techday/volunteer/profile")
        return
      }
      setMessage("报名已提交，需管理员启用并分配组织后才能进入报销与志愿者工作区。")
    } catch (error) {
      setError(error instanceof Error ? error.message : "报名失败")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <TechDayShell title="志愿者报名" description="通班内部成员可用主站账号报名进入志愿者队列；外部志愿者可创建 TechDay-only 账号。">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>{isInternal ? "通班成员志愿者报名" : "创建志愿者账号"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={submit}>
            {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}
            {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
            {isInternal ? (
              <div className="grid gap-3 rounded-md border bg-slate-50 p-4 text-sm md:grid-cols-2">
                <div>
                  <div className="text-slate-500">通班账号</div>
                  <div className="font-medium text-slate-950">{principal?.mainUser?.chineseName || principal?.mainUser?.englishName || principal?.mainUser?.username}</div>
                  <div className="text-xs text-slate-500">{principal?.mainUser?.email}</div>
                </div>
                <div>
                  <div className="text-slate-500">报名状态</div>
                  <div className="font-medium text-slate-950">{application?.status ? statusLabels[application.status] : "未报名"}</div>
                  <div className="text-xs text-slate-500">管理员通过后会在后台分配具体志愿者组织。</div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
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
                      required={key !== "studentId"}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-2">
              <Label>报名组织</Label>
              <div className="flex flex-wrap gap-2">
                {organizationNames.length === 0 ? <span className="text-xs text-slate-500">管理员尚未配置组织。</span> : null}
                {organizationNames.map((name: string) => (
                  <button
                    key={name}
                    type="button"
                    className={`rounded-md border px-3 py-1 text-sm ${selectedOrgNames.includes(name) ? "border-primary bg-primary text-white" : "bg-white text-slate-700"}`}
                    onClick={() => toggleOrg(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>可服务时段</Label>
              <div className="flex flex-wrap gap-2">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`rounded-md border px-3 py-1 text-sm ${selectedSlots.includes(slot) ? "border-emerald-600 bg-emerald-600 text-white" : "bg-white text-slate-700"}`}
                    onClick={() => toggleSlot(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <Label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={voteCounterOptIn} onChange={(event) => setVoteCounterOptIn(event.target.checked)} />
              报名计票志愿者
            </Label>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={submitting}>{submitting ? "提交中..." : isInternal ? "提交报名" : "注册并报名"}</Button>
              {!isInternal ? <span className="text-xs text-slate-500">已有通班账号请先登录主站，再回到本页报名。</span> : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </TechDayShell>
  )
}
