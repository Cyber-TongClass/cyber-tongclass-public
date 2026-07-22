"use client"

import Link from "next/link"
import { ArrowLeft, ClipboardList } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useMyOAFormSubmissions } from "@/lib/api"
import { oaReviewStatusLabels } from "@/lib/oa-forms"
import { getSubmissionTitle } from "@/lib/oa-submissions"
import type { OAFormSubmission } from "@/types"

function formatTime(value: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function statusVariant(status: OAFormSubmission["reviewStatus"]) {
  if (status === "approved") return "success" as const
  if (status === "pending" || status === "needs_changes") return "warning" as const
  return "destructive" as const
}

export default function OAFormSubmissionsPage() {
  const submissions = useMyOAFormSubmissions() as OAFormSubmission[] | undefined
  const newestFirst = submissions ? [...submissions].sort((left, right) => right.submittedAt - left.submittedAt || right._id.localeCompare(left._id)) : []

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)] py-10 px-4">
      <main className="mx-auto max-w-5xl space-y-6">
        <Button asChild variant="ghost"><Link href="/intranet/forms"><ArrowLeft className="mr-2 h-4 w-4" />返回 OA 填报</Link></Button>
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-primary/10 p-2 text-primary"><ClipboardList className="h-6 w-6" /></span>
          <div><h1 className="text-3xl font-extrabold text-slate-900">我的提交</h1><p className="mt-1 text-sm text-slate-600">查看所有 OA 表单的提交内容与审核进度。</p></div>
        </div>

        {submissions === undefined ? (
          <Card><CardContent className="py-10 text-center text-sm text-slate-500">Loading...</CardContent></Card>
        ) : newestFirst.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-slate-500">你还没有 OA 表单提交记录。</CardContent></Card>
        ) : (
          <div className="divide-y rounded-xl border bg-white shadow-sm">
            {newestFirst.map((submission) => (
              <Link key={submission._id} href={`/intranet/forms/submissions/${submission._id}`} className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-slate-950">{getSubmissionTitle(submission, submissions)}</p>
                  <time className="text-sm text-slate-500">{formatTime(submission.submittedAt)}</time>
                </div>
                <Badge variant={statusVariant(submission.reviewStatus)} className="w-fit shrink-0">{oaReviewStatusLabels[submission.reviewStatus]}</Badge>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
