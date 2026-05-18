"use client"

import Link from "next/link"
import { Lock } from "lucide-react"
import { TechDayAwardBadge, TechDayRoleBadge } from "@/components/techday/techday-badges"
import { TechDayShell } from "@/components/techday/techday-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTechDayActorArgs, useTechDayCurrentPrincipal } from "@/lib/api"
import { canUseTechDayAuthorTools } from "@/types/techday"

export default function TechDayProfilePage() {
  const actorArgs = useTechDayActorArgs()
  const principal = useTechDayCurrentPrincipal(actorArgs)
  const user = principal?.techDayUser

  if (principal === undefined) {
    return (
      <TechDayShell title="个人中心" description="加载 TechDay 账号信息。">
        <p className="text-sm text-slate-600">Loading...</p>
      </TechDayShell>
    )
  }

  if (!user) {
    return (
      <TechDayShell title="个人中心" description="请先登录 TechDay。">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              需要 TechDay 登录
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">个人中心只对已登录 TechDay 的作者、志愿者、审阅者和管理员开放。</p>
            <Button asChild><Link href="/techday/login">前往 TechDay 登录</Link></Button>
          </CardContent>
        </Card>
      </TechDayShell>
    )
  }

  const organizationDetails = user.organizationsDetail || []
  const voteCounterStatus = user.roleTemplateCanEditVote ? "是" : user.voteCounterOptIn ? "已申请" : "未报名"

  const rows = [
    ["姓名", user.name],
    ["邮箱", user.email],
    ["人员类型", <TechDayRoleBadge key="role" role={user.role} />],
    ["学校", user.school],
    ["学院", user.college],
    ["界别", user.grade],
    ["学号", user.studentId],
    ["组织", user.assignedTracks?.join("、") || user.organizationName || (user.role === "author" ? "作者无需分组" : "待分配")],
    ["职责", organizationDetails.length ? organizationDetails.map((org: any) => `${org.name}: ${org.responsibility}`).join("；") : user.responsibility],
    ["志愿方向", user.volunteerTracks?.join("、")],
    ["可服务时段", user.availabilitySlots?.join("、")],
    ["审阅方向", user.reviewerDirectionName],
    ["计票志愿者", user.role === "author" ? "作者无需计票" : voteCounterStatus],
    ["新闻发布", user.canPublishNews ? "已开启" : "未开启"],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "")

  return (
    <TechDayShell title="个人中心" description="查看 TechDay 账号、角色权限、分配组织、职责与方向信息。">
      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{user.name}</CardTitle>
            <div className="flex flex-wrap gap-2">
              {canUseTechDayAuthorTools(user) ? <Button asChild><Link href="/techday/author/profile">作者投稿</Link></Button> : null}
              {(user.role === "volunteer" || user.role === "admin") ? <Button asChild variant="outline"><Link href="/techday/volunteer/profile">志愿者资料</Link></Button> : null}
              {(user.role === "reviewer" || user.role === "admin") ? <Button asChild variant="outline"><Link href="/techday/awards">奖项管理</Link></Button> : null}
              {user.role === "admin" ? <Button asChild variant="outline"><Link href="/admin/techday/settings">后台</Link></Button> : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map(([label, value]) => (
              <div key={String(label)} className="rounded-md border bg-white p-3 text-sm">
                <div className="text-slate-500">{label}</div>
                <div className="mt-1 font-medium text-slate-900">{value || "-"}</div>
              </div>
            ))}
          </CardContent>
        </Card>
        {organizationDetails.length > 0 ? (
          <Card>
            <CardHeader><CardTitle>组织职责</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {organizationDetails.map((org: any) => (
                <div key={org._id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium text-slate-950">{org.name}</div>
                  <p className="mt-1 text-slate-600">{org.responsibility}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
        {user.roleTemplateName ? (
          <Card>
            <CardHeader><CardTitle>计票权限</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2 text-sm">
              <TechDayAwardBadge name={user.roleTemplateName} color={user.roleTemplateCanEditVote ? "#2563eb" : "#94a3b8"} />
              <span className="text-slate-600">{user.roleTemplateCanEditVote ? "该模板可编辑投票数据" : "该模板无计票编辑权限"}</span>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </TechDayShell>
  )
}
