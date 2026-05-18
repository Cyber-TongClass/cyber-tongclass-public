"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, Download, SlidersHorizontal } from "lucide-react"
import { TechDayShell } from "@/components/techday/techday-shell"
import { TechDayAwardBadge, TechDayReviewStatusBadge } from "@/components/techday/techday-badges"
import { TechDayDirectionSelect, TechDayTrackSelect, TechDayYearSelect } from "@/components/techday/techday-filters"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTechDayDirections, useTechDayPublicSubmissions } from "@/lib/api"
import { type TechDayTrack, downloadCsv } from "@/types/techday"

export default function TechDayHomePage() {
  const [track, setTrack] = useState<TechDayTrack>("poster")
  const [directionId, setDirectionId] = useState("all")
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [sort, setSort] = useState("")
  const directions = useTechDayDirections()
  const queryArgs = useMemo(() => ({
    track,
    directionId: directionId === "all" ? undefined : directionId,
    year: year === "all" ? undefined : Number(year),
    sort: sort ? sort as any : undefined,
  }), [track, directionId, year, sort])
  const data = useTechDayPublicSubmissions(queryArgs as any)
  const submissions = data?.submissions ?? []

  return (
    <TechDayShell
      title="TechDay 成果展示"
      description="浏览已通过审核的 Poster 与 Demo，查看方向、年份、奖项和公开材料。"
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              筛选
            </CardTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <TechDayTrackSelect value={track} onValueChange={setTrack} />
              <TechDayYearSelect value={year} onValueChange={setYear} />
              <TechDayDirectionSelect value={directionId} onValueChange={setDirectionId} directions={directions as any} />
              <Select value={sort || "default"} onValueChange={(value) => setSort(value === "default" ? "" : value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">默认排序</SelectItem>
                  <SelectItem value="voteInnovation" disabled={!data?.canSort}>最佳创意</SelectItem>
                  <SelectItem value="voteImpact" disabled={!data?.canSort}>最受欢迎</SelectItem>
                  <SelectItem value="voteFeasibility" disabled={!data?.canSort}>不明觉厉</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => downloadCsv(`techday-${track}-${year}.csv`, submissions as any)}
                disabled={!submissions.length}
              >
                <Download className="mr-2 h-4 w-4" />
                导出
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">编号</TableHead>
                <TableHead>作品</TableHead>
                <TableHead>方向</TableHead>
                <TableHead>作者</TableHead>
                <TableHead>奖项</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((item: any) => (
                <TableRow key={item._id}>
                  <TableCell>{item.sequenceNo || "-"}</TableCell>
                  <TableCell>
                    <p className="font-medium text-slate-950">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.venue}</p>
                  </TableCell>
                  <TableCell>{item.directionName || "-"}</TableCell>
                  <TableCell>{item.authors || item.authorName || "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(item.awardBadges?.length ? item.awardBadges : [{ name: item.awardTags?.[0] || "无" }]).map((award: any) => (
                        <TechDayAwardBadge key={award._id || award.name} name={award.name} color={award.color} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell><TechDayReviewStatusBadge status={item.reviewStatus} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/techday/papers/${item._id}`}>
                        详情 <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data === undefined ? <p className="py-8 text-center text-sm text-slate-500">Loading...</p> : null}
          {data && submissions.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">暂无通过审核的作品。</p> : null}
        </CardContent>
      </Card>
    </TechDayShell>
  )
}
