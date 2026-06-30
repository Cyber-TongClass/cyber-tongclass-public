"use client"

import Link from "next/link"
import { TechDayShell } from "@/components/techday/techday-shell"
import { TechDayAccessGuard } from "@/components/techday/techday-access-guard"
import { TechDayReviewStatusBadge, TechDayRoleBadge } from "@/components/techday/techday-badges"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDeleteTechDaySubmission, useMyTechDaySubmissions, useTechDayActorArgs, useTechDayCurrentPrincipal } from "@/lib/api"

export default function TechDayAuthorProfilePage() {
  const actorArgs = useTechDayActorArgs()
  const principal = useTechDayCurrentPrincipal(actorArgs)
  const submissions = useMyTechDaySubmissions(actorArgs)
  const remove = useDeleteTechDaySubmission()

  return (
    <TechDayShell title="作者中心" description="管理自己的 TechDay 投稿和材料。">
      <TechDayAccessGuard role="author">
        <div className="grid gap-6">
          <Card>
            <CardHeader><CardTitle>{principal?.techDayUser?.name || "作者"}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
              <p><span className="font-medium text-slate-950">邮箱：</span>{principal?.techDayUser?.email || "-"}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-950">人员类型：</span>
                {principal?.techDayUser?.role ? <TechDayRoleBadge role={principal.techDayUser.role} /> : "-"}
              </div>
              <p><span className="font-medium text-slate-950">学校：</span>{principal?.techDayUser?.school || "-"}</p>
              <p><span className="font-medium text-slate-950">学院：</span>{principal?.techDayUser?.college || "-"}</p>
              <p><span className="font-medium text-slate-950">界别：</span>{principal?.techDayUser?.grade || "-"}</p>
              <p><span className="font-medium text-slate-950">学号：</span>{principal?.techDayUser?.studentId || "-"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>我的投稿</CardTitle>
              <Button asChild><Link href="/techday/author/submissions/new">上传作品</Link></Button>
            </CardHeader>
            <CardContent>
              <Table className="min-w-[680px]">
                <TableHeader><TableRow><TableHead>标题</TableHead><TableHead>Track</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                <TableBody>
                  {submissions?.map((item: any) => (
                    <TableRow key={item._id}>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>{item.track}</TableCell>
                      <TableCell><TechDayReviewStatusBadge status={item.reviewStatus} /></TableCell>
                      <TableCell className="min-w-32 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button size="sm" variant="outline" asChild><Link href={`/techday/author/submissions/${item._id}/edit`}>编辑</Link></Button>
                          <Button size="sm" variant="destructive" onClick={() => remove({ ...actorArgs, id: item._id })}>删除</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </TechDayAccessGuard>
    </TechDayShell>
  )
}
