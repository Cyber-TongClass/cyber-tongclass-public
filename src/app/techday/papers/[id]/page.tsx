"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ExternalLink } from "lucide-react"
import { TechDayShell } from "@/components/techday/techday-shell"
import { TechDayAwardBadge, TechDayReviewStatusBadge } from "@/components/techday/techday-badges"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTechDayActorArgs, useTechDayPosterUrl, useTechDaySubmissionById } from "@/lib/api"

export default function TechDayPaperDetailPage() {
  const params = useParams<{ id: string }>()
  const actorArgs = useTechDayActorArgs()
  const submission = useTechDaySubmissionById(params.id, actorArgs)
  const posterUrl = useTechDayPosterUrl(params.id, actorArgs)

  return (
    <TechDayShell title={submission?.title || "作品详情"} description="查看公开作品材料、摘要、奖项与审核信息。">
      {submission === undefined ? <p className="text-sm text-slate-600">Loading...</p> : null}
      {submission === null ? <p className="text-sm text-slate-600">作品不存在。</p> : null}
      {submission ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-3">
                {submission.title}
                <TechDayReviewStatusBadge status={submission.reviewStatus} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                <p><span className="font-medium text-slate-950">作者：</span>{submission.authors || submission.authorName || "-"}</p>
                <p><span className="font-medium text-slate-950">方向：</span>{submission.directionName || "-"}</p>
                <p><span className="font-medium text-slate-950">Track：</span>{submission.track}</p>
                <p><span className="font-medium text-slate-950">年份：</span>{submission.year || "-"}</p>
                <p className="md:col-span-2"><span className="font-medium text-slate-950">发表/接收：</span>{submission.venue}</p>
              </div>
              <div>
                <h2 className="mb-2 font-semibold text-slate-950">摘要</h2>
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{submission.abstract}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {submission.awardBadges?.map((award: any) => <TechDayAwardBadge key={award._id} name={award.name} color={award.color} />)}
              </div>
              <div className="flex flex-wrap gap-2">
                {submission.paperUrl ? (
                  <Button asChild variant="outline">
                    <a href={submission.paperUrl} target="_blank" rel="noopener noreferrer">
                      项目链接 <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                ) : null}
                <Button asChild variant="outline"><Link href="/techday">返回列表</Link></Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Poster</CardTitle></CardHeader>
              <CardContent>
                {posterUrl ? (
                  <iframe src={`${posterUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} className="h-[520px] w-full rounded-md border" />
                ) : <p className="text-sm text-slate-600">暂无可访问的 Poster。</p>}
              </CardContent>
            </Card>
            {submission.logs?.length ? (
              <Card>
                <CardHeader><CardTitle>投票日志</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>字段</TableHead><TableHead>旧值</TableHead><TableHead>新值</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {submission.logs.map((log: any) => (
                        <TableRow key={log._id}><TableCell>{log.fieldName}</TableCell><TableCell>{log.oldValue}</TableCell><TableCell>{log.newValue}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}
    </TechDayShell>
  )
}
