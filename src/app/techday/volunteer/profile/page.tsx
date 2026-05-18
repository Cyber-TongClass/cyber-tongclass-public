"use client"

import { TechDayShell } from "@/components/techday/techday-shell"
import { TechDayAccessGuard } from "@/components/techday/techday-access-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTechDayActorArgs, useTechDayCurrentPrincipal } from "@/lib/api"

export default function TechDayVolunteerProfilePage() {
  const actorArgs = useTechDayActorArgs()
  const principal = useTechDayCurrentPrincipal(actorArgs)
  const user = principal?.techDayUser
  const organizationDetails = user?.organizationsDetail || []
  const responsibilities = organizationDetails.length
    ? organizationDetails.map((org: any) => `${org.name}: ${org.responsibility}`).join("；")
    : user?.responsibility || "由管理员分配"
  const voteCounterStatus = user?.roleTemplateCanEditVote ? "是" : user?.voteCounterOptIn ? "已申请" : "未报名"

  return (
    <TechDayShell title="志愿者资料" description="查看 TechDay 志愿者账号、工作组和服务时段。">
      <TechDayAccessGuard role="volunteer">
        <Card>
          <CardHeader><CardTitle>{user?.name || "志愿者"}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <p><span className="font-medium text-slate-950">邮箱：</span>{user?.email}</p>
            <p><span className="font-medium text-slate-950">学校：</span>{user?.school || "-"}</p>
            <p><span className="font-medium text-slate-950">学院：</span>{user?.college || "-"}</p>
            <p><span className="font-medium text-slate-950">界别：</span>{user?.grade || "-"}</p>
            <p><span className="font-medium text-slate-950">学号：</span>{user?.studentId || "-"}</p>
            <p><span className="font-medium text-slate-950">志愿方向：</span>{user?.volunteerTracks?.join("，") || "-"}</p>
            <p><span className="font-medium text-slate-950">已分配工作组：</span>{user?.assignedTracks?.join("，") || "-"}</p>
            <p><span className="font-medium text-slate-950">计票志愿者：</span>{voteCounterStatus}</p>
            <p><span className="font-medium text-slate-950">角色模板：</span>{user?.roleTemplateName || "-"}</p>
            <p className="md:col-span-2"><span className="font-medium text-slate-950">可服务时段：</span>{user?.availabilitySlots?.join("，") || "-"}</p>
            <p className="md:col-span-2"><span className="font-medium text-slate-950">职责：</span>{responsibilities}</p>
          </CardContent>
        </Card>
      </TechDayAccessGuard>
    </TechDayShell>
  )
}
