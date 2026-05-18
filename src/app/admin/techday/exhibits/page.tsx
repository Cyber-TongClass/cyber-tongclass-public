"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TechDayReviewStatusBadge } from "@/components/techday/techday-badges"
import { TechDayTrackSelect, TechDayYearSelect } from "@/components/techday/techday-filters"
import {
  useAdminDeleteTechDaySubmission,
  useAdminTechDaySubmissions,
  useAdminUpdateTechDaySubmission,
  useExportTechDaySubmissions,
  useRenumberTechDaySubmissions,
  useTechDayActorArgs,
} from "@/lib/api"
import { downloadCsv, type TechDayTrack } from "@/types/techday"

export default function AdminTechDayExhibitsPage() {
  const actorArgs = useTechDayActorArgs()
  const [track, setTrack] = useState<TechDayTrack>("poster")
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const submissions = useAdminTechDaySubmissions({ ...actorArgs, track, year: year === "all" ? undefined : Number(year) } as any)
  const exportRows = useExportTechDaySubmissions({ ...actorArgs, track, year: year === "all" ? undefined : Number(year) } as any)
  const update = useAdminUpdateTechDaySubmission()
  const remove = useAdminDeleteTechDaySubmission()
  const renumber = useRenumberTechDaySubmissions()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">TechDay 参展管理</h1>
        <p className="mt-2 text-sm text-slate-600">审核投稿、更新状态、按年份和 Track 重新编号。</p>
      </div>
      <Card>
        <CardHeader>
          <div className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto_auto] md:items-center">
            <CardTitle>投稿列表</CardTitle>
            <TechDayTrackSelect value={track} onValueChange={setTrack} />
            <TechDayYearSelect value={year} onValueChange={setYear} />
            <Button onClick={() => renumber({ ...actorArgs, track, year: year === "all" ? undefined : Number(year) })}>重新编号</Button>
            <Button
              type="button"
              variant="outline"
              disabled={!exportRows?.length}
              onClick={() => downloadCsv(`techday-${year}-${track}-submissions.csv`, exportRows as any)}
            >
              <Download className="mr-2 h-4 w-4" />
              导出当前列表
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[760px]">
            <TableHeader><TableRow><TableHead>编号</TableHead><TableHead>标题</TableHead><TableHead>作者</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              {submissions?.map((item: any) => (
                <TableRow key={item._id}>
                  <TableCell>{item.sequenceNo || "-"}</TableCell>
                  <TableCell>{item.title}<p className="text-xs text-slate-500">{item.directionName}</p></TableCell>
                  <TableCell>{item.authors || item.authorName || "-"}</TableCell>
                  <TableCell><TechDayReviewStatusBadge status={item.reviewStatus} /></TableCell>
                  <TableCell className="min-w-40 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => update({ ...actorArgs, id: item._id, reviewStatus: "approved" })}>通过</Button>
                      <Button size="sm" variant="outline" onClick={() => update({ ...actorArgs, id: item._id, reviewStatus: "rejected" })}>拒绝</Button>
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
  )
}
