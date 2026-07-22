"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { OAFormSubmissionDetail } from "@/components/oa-forms/oa-submission-detail"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useMyOAFormSubmission, useMyOAFormSubmissions, usePublishedOAFormBySlug } from "@/lib/api"
import { getSubmissionFormSnapshot } from "@/lib/oa-submissions"
import type { OAForm, OAFormSubmission } from "@/types"

export default function OAFormSubmissionDetailPage() {
  const params = useParams<{ id: string }>()
  const submission = useMyOAFormSubmission(params.id) as OAFormSubmission | null | undefined
  const submissions = useMyOAFormSubmissions() as OAFormSubmission[] | undefined
  const needsLegacyFallback = Boolean(submission && !submission.formSnapshot)
  const legacyForm = usePublishedOAFormBySlug(needsLegacyFallback ? submission?.formSlug : null) as OAForm | null | undefined

  if (submission === undefined || submissions === undefined || (needsLegacyFallback && legacyForm === undefined)) {
    return <div className="min-h-screen bg-[hsl(211,30%,97%)] flex items-center justify-center text-slate-500">Loading...</div>
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-[hsl(211,30%,97%)] py-10 px-4">
        <div className="mx-auto max-w-3xl space-y-6">
          <Button asChild variant="ghost"><Link href="/intranet/forms/submissions"><ArrowLeft className="mr-2 h-4 w-4" />返回我的提交</Link></Button>
          <Card><CardContent className="py-10 text-center text-sm text-slate-500">未找到该提交记录，或你没有访问权限。</CardContent></Card>
        </div>
      </div>
    )
  }

  const snapshot = getSubmissionFormSnapshot(submission, legacyForm)
  if (!snapshot) {
    return (
      <div className="min-h-screen bg-[hsl(211,30%,97%)] py-10 px-4">
        <div className="mx-auto max-w-3xl space-y-6">
          <Button asChild variant="ghost"><Link href="/intranet/forms/submissions"><ArrowLeft className="mr-2 h-4 w-4" />返回我的提交</Link></Button>
          <Card><CardContent className="py-10 text-center text-sm text-slate-500">该提交缺少表单布局，暂时无法展示内容。</CardContent></Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)] py-10 px-4">
      <main className="mx-auto max-w-5xl space-y-6">
        <Button asChild variant="ghost"><Link href="/intranet/forms/submissions"><ArrowLeft className="mr-2 h-4 w-4" />返回我的提交</Link></Button>
        <OAFormSubmissionDetail submission={submission} snapshot={snapshot} fallbackForm={legacyForm} allSubmissions={submissions} />
      </main>
    </div>
  )
}
