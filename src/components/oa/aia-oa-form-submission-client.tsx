"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { CheckCircle2, ClipboardCheck, Clock3 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { OAFormRenderer } from "@/components/oa-forms/oa-form-renderer"
import { AiaOAAuthLoading, AiaOALoginRequired, AiaOAReviewStatusBadge, formatAiaOATime } from "@/components/oa/aia-oa-shared"
import { useMyOAFormSubmissions, useOAForm, useSubmitOAForm } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { isOAFormCollecting } from "@/lib/oa-forms"
import type { OAForm, OAFormSubmission } from "@/types"

function FormMeta({ form }: { form: OAForm }) {
  const closing = form.closeAt && Number.isFinite(form.closeAt)
    ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(form.closeAt))
    : null

  return (
    <div className="flex flex-wrap gap-2">
      {form.category ? <Badge variant="outline">{form.category}</Badge> : null}
      <Badge variant="secondary">{form.kind === "reimbursement" ? "报销" : "申请 / 填报"}</Badge>
      <Badge variant={isOAFormCollecting(form, Date.now()) ? "success" : "secondary"}>
        {isOAFormCollecting(form, Date.now()) ? "开放中" : "当前不可提交"}
      </Badge>
      {closing ? <span className="inline-flex items-center gap-1 self-center text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />截止 {closing}</span> : null}
    </div>
  )
}

function SubmissionSummary({ submissions }: { submissions: OAFormSubmission[] }) {
  if (submissions.length === 0) return null
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-5" aria-labelledby="aia-oa-current-submissions-heading">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 id="aia-oa-current-submissions-heading" className="font-semibold text-slate-950">我的历史提交</h2>
      </div>
      <div className="mt-4 space-y-3">
        {submissions.map((submission) => (
          <div key={submission._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
            <span className="text-slate-600">提交于 {formatAiaOATime(submission.submittedAt)}</span>
            <AiaOAReviewStatusBadge status={submission.reviewStatus} />
          </div>
        ))}
      </div>
    </section>
  )
}

/** Submission surface intentionally shows only records owned by the current session. */
export function AiaOAFormSubmissionClient() {
  const params = useParams<{ slug?: string | string[] }>()
  const slug = typeof params.slug === "string" ? params.slug : ""

  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) {
    return <AiaOAAuthLoading />
  }
  if (!isAuthenticated) {
    return <AiaOALoginRequired nextPath={`/services/oa/${encodeURIComponent(slug)}`} action="查看或提交该 OA 事项" />
  }

  return <AiaOAFormSubmissionAuthenticated slug={slug} />
}

function AiaOAFormSubmissionAuthenticated({ slug }: { slug: string }) {
  const form = useOAForm(slug || null) as OAForm | null | undefined
  const submit = useSubmitOAForm()
  const submissions = useMyOAFormSubmissions(form?._id) as OAFormSubmission[] | undefined
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  if (form === undefined) {
    return <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600" role="status">正在加载 OA 事项…</p>
  }

  if (!form) {
    return <Card><CardContent className="py-10 text-center text-sm text-slate-600">该 OA 事项不存在、未发布，或当前账户无权访问。</CardContent></Card>
  }

  const collecting = isOAFormCollecting(form, Date.now())
  const ownSubmissions = submissions || []

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" aria-labelledby="aia-oa-form-title">
        <FormMeta form={form} />
        <h1 id="aia-oa-form-title" className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{form.title}</h1>
        {form.description ? <p className="mt-3 max-w-3xl whitespace-pre-wrap leading-7 text-slate-600">{form.description}</p> : null}
      </section>

      {success ? (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950" role="status">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> 已提交。审核状态会同步显示在“我的提交”中。
        </p>
      ) : null}
      {submitError ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{submitError}</p> : null}

      <SubmissionSummary submissions={ownSubmissions} />

      {collecting ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" aria-labelledby="aia-oa-submit-heading">
          <h2 id="aia-oa-submit-heading" className="text-xl font-semibold text-slate-950">填写并提交</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">请仅填写办理该事项所必需的信息；提交后由具备权限的处理人审核。</p>
          <div className="mt-6">
            <OAFormRenderer
              form={form}
              heading=""
              submitLabel="提交 OA 事项"
              onSubmit={async (answers) => {
                setSubmitError(null)
                try {
                  await submit({ formId: form._id, answers })
                  setSuccess(true)
                } catch (error) {
                  const message = error instanceof Error ? error.message : "提交未成功完成，请稍后重试。"
                  setSubmitError(message)
                  throw error
                }
              }}
            />
          </div>
        </section>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">该事项当前不在可提交时间内。你仍可在“我的提交”中查看已有记录。</p>
      )}
    </div>
  )
}
