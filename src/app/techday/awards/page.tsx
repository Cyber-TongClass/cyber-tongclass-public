"use client"

import { FormEvent, useRef, useState } from "react"
import { TechDayShell } from "@/components/techday/techday-shell"
import { TechDayAccessGuard } from "@/components/techday/techday-access-guard"
import { TechDayAwardBadge } from "@/components/techday/techday-badges"
import { TechDayTrackSelect, TechDayYearSelect } from "@/components/techday/techday-filters"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTechDayActorArgs, useTechDayAwardSubmissions, useTechDayCurrentPrincipal, useUpsertTechDayRecommendation } from "@/lib/api"
import type { TechDayTrack } from "@/types/techday"

export default function TechDayAwardsPage() {
  const actorArgs = useTechDayActorArgs()
  const principal = useTechDayCurrentPrincipal(actorArgs)
  const canReviewAwards = principal !== undefined && (
    principal?.techDayUser?.role === "reviewer"
    || principal?.techDayUser?.role === "admin"
    || principal?.mainUser?.role === "admin"
    || principal?.mainUser?.role === "super_admin"
  )
  const [track, setTrack] = useState<TechDayTrack>("poster")
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const submissions = useTechDayAwardSubmissions(canReviewAwards ? { ...actorArgs, track, year: year === "all" ? undefined : Number(year) } : null)
  const upsert = useUpsertTechDayRecommendation()
  const [reason, setReason] = useState("")
  const [openSubmissionId, setOpenSubmissionId] = useState<string | null>(null)
  const openSubmissionIdRef = useRef<string | null>(null)
  const [submittingRecommendationId, setSubmittingRecommendationId] = useState<string | null>(null)

  const recommend = async (event: FormEvent<HTMLFormElement>, submissionId: string) => {
    event.preventDefault()
    setSubmittingRecommendationId(submissionId)
    try {
      await upsert({ ...actorArgs, submissionId: submissionId as any, reason, confidence: 0.8 })
      if (openSubmissionIdRef.current === submissionId) {
        openSubmissionIdRef.current = null
        setReason("")
        setOpenSubmissionId(null)
      }
    } finally {
      setSubmittingRecommendationId((current) => current === submissionId ? null : current)
    }
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
                      <Dialog
                        open={openSubmissionId === String(item._id)}
                        onOpenChange={(open) => {
                          if (submittingRecommendationId === String(item._id)) return
                          const nextSubmissionId = open ? String(item._id) : null
                          openSubmissionIdRef.current = nextSubmissionId
                          setOpenSubmissionId(nextSubmissionId)
                          if (!open) setReason("")
                        }}
                      >
                        <DialogTrigger asChild><Button size="sm" variant="outline">推荐</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>推荐作品</DialogTitle>
                            <DialogDescription>填写推荐理由并保存；同一审阅者再次提交会更新原有推荐。</DialogDescription>
                          </DialogHeader>
                          <form className="space-y-3" onSubmit={(event) => recommend(event, item._id)}>
                            <div className="space-y-2">
                              <Label htmlFor="recommendation-reason">推荐理由</Label>
                              <Textarea
                                id="recommendation-reason"
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                placeholder="请说明推荐依据"
                                required
                              />
                            </div>
                            <Button type="submit" disabled={submittingRecommendationId === String(item._id)}>
                              {submittingRecommendationId === String(item._id) ? "保存中..." : "保存推荐"}
                            </Button>
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
