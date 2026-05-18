"use client"

import { FormEvent, useState } from "react"
import { TechDayShell } from "@/components/techday/techday-shell"
import { TechDayAccessGuard } from "@/components/techday/techday-access-guard"
import { TechDayAwardBadge } from "@/components/techday/techday-badges"
import { TechDayTrackSelect, TechDayYearSelect } from "@/components/techday/techday-filters"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTechDayActorArgs, useTechDayAwardSubmissions, useUpsertTechDayRecommendation } from "@/lib/api"
import type { TechDayTrack } from "@/types/techday"

export default function TechDayAwardsPage() {
  const actorArgs = useTechDayActorArgs()
  const [track, setTrack] = useState<TechDayTrack>("poster")
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const submissions = useTechDayAwardSubmissions({ ...actorArgs, track, year: year === "all" ? undefined : Number(year) } as any)
  const upsert = useUpsertTechDayRecommendation()
  const [reason, setReason] = useState("")

  const recommend = async (event: FormEvent<HTMLFormElement>, submissionId: string) => {
    event.preventDefault()
    await upsert({ ...actorArgs, submissionId: submissionId as any, reason, confidence: 0.8 })
    setReason("")
  }

  return (
    <TechDayShell title="奖项管理" description="审阅者按方向推荐作品，管理员可在后台配置奖项。">
      <TechDayAccessGuard role="reviewer">
        <Card>
          <CardHeader>
            <div className="grid gap-3 md:grid-cols-[1fr_220px_220px] md:items-center">
              <CardTitle>候选作品</CardTitle>
              <TechDayTrackSelect value={track} onValueChange={setTrack} />
              <TechDayYearSelect value={year} onValueChange={setYear} />
            </div>
          </CardHeader>
          <CardContent>
            <Table className="min-w-[760px]">
              <TableHeader><TableRow><TableHead>编号</TableHead><TableHead>作品</TableHead><TableHead>奖项</TableHead><TableHead>推荐</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
              <TableBody>
                {submissions?.map((item: any) => (
                  <TableRow key={item._id}>
                    <TableCell>{item.sequenceNo || "-"}</TableCell>
                    <TableCell>{item.title}<p className="text-xs text-slate-500">{item.directionName}</p></TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{item.awardBadges?.map((award: any) => <TechDayAwardBadge key={award._id} name={award.name} color={award.color} />)}</div></TableCell>
                    <TableCell>{item.reviewerTags?.length || 0}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild><Button size="sm" variant="outline">推荐</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>推荐作品</DialogTitle></DialogHeader>
                          <form className="space-y-3" onSubmit={(event) => recommend(event, item._id)}>
                            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="推荐理由" required />
                            <Button type="submit">保存推荐</Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TechDayAccessGuard>
    </TechDayShell>
  )
}
