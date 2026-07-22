"use client"

import Link from "next/link"
import { ClipboardList } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { AiaOAAuthLoading, AiaOALoginRequired, AiaOAReviewStatusBadge, formatAiaOATime } from "@/components/oa/aia-oa-shared"
import { useMyOAFormSubmissions } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import type { OAFormSubmission } from "@/types"

/** Current-account submission history; it deliberately does not render user identifiers or contact details. */
export function AiaOAMySubmissionsClient() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <AiaOAAuthLoading />
  }

  if (!isAuthenticated) {
    return <AiaOALoginRequired nextPath="/services/oa/my" action="查看自己的 OA 提交记录" />
  }

  return <AiaOAMySubmissionsAuthenticated />
}

function AiaOAMySubmissionsAuthenticated() {
  const submissions = useMyOAFormSubmissions() as OAFormSubmission[] | undefined

  if (submissions === undefined) {
    return <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600" role="status">正在加载我的提交…</p>
  }

  if (submissions.length === 0) {
    return (
      <Card><CardContent className="py-10 text-center text-sm text-slate-600">
        <ClipboardList className="mx-auto mb-3 h-6 w-6 text-slate-400" aria-hidden="true" />
        暂无 OA 提交记录。
        <Link href="/services/oa" className="ml-2 font-medium text-primary underline-offset-4 hover:underline">前往 OA 服务</Link>
      </CardContent></Card>
    )
  }

  return (
    <div className="divide-y overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {submissions.map((submission) => (
        <Link
          key={submission._id}
          href={`/services/oa/${encodeURIComponent(submission.formSlug)}`}
          className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-950">{submission.formSlug || "OA 事项"}</h2>
            <p className="mt-1 text-sm text-slate-600">提交于 {formatAiaOATime(submission.submittedAt)}</p>
            {submission.adminNote ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">处理意见：{submission.adminNote}</p> : null}
          </div>
          <AiaOAReviewStatusBadge status={submission.reviewStatus} />
        </Link>
      ))}
    </div>
  )
}
