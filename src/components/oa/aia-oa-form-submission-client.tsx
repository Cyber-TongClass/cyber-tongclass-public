"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useRef, useState } from "react"
import { CheckCircle2, ClipboardCheck, Clock3 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { OAFormRenderer } from "@/components/oa-forms/oa-form-renderer"
import { AiaOAAuthLoading, AiaOALoginRequired, AiaOAReviewStatusBadge, formatAiaOATime } from "@/components/oa/aia-oa-shared"
import { useMyOAFormSubmissions, useOAForm, useSubmitOAForm } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { isOAFormCollecting } from "@/lib/oa-forms"
import { withReturnTo } from "@/lib/safe-local-path"
import type { OAForm, OAFormSubmission } from "@/types"

function FormHeader({ form }: { form: OAForm }) {
  const closing = form.closeAt && Number.isFinite(form.closeAt)
    ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(form.closeAt))
    : null
  const collecting = isOAFormCollecting(form, Date.now())

  return (
    <header className="border-b aia-border-rule pb-7">
      <p className="aia-kicker">OA · {form.kind === "reimbursement" ? "报销" : "申请填报"}</p>
      <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
        {form.title}
      </h1>
      {form.description ? (
        <p className="aia-text-muted mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-7">{form.description}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {form.category ? (
          <span className="aia-mono aia-bg-tag px-1.5 py-0.5 text-[11px] tracking-wider">{form.category}</span>
        ) : null}
        <Badge variant={collecting ? "success" : "secondary"}>{collecting ? "开放中" : "当前不可提交"}</Badge>
        {closing ? (
          <span className="aia-text-muted inline-flex items-center gap-1 text-xs">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />截止 {closing}
          </span>
        ) : null}
      </div>
    </header>
  )
}

function SubmissionSummary({ submissions, returnTo }: { submissions: OAFormSubmission[]; returnTo: string }) {
  if (submissions.length === 0) return null
  return (
    <section className="border-t aia-border-rule pt-6" aria-labelledby="aia-oa-current-submissions-heading">
      <p className="aia-kicker flex items-center gap-2" id="aia-oa-current-submissions-heading">
        <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />我的历史提交
      </p>
      <ul className="mt-4 divide-y divide-[hsl(var(--aia-rule))]">
        {submissions.map((submission) => (
          <li key={submission._id}>
            <Link
              href={withReturnTo(`/services/oa/submissions/${submission._id}`, returnTo)}
              className="aia-focus group flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
            >
              <span className="aia-text-muted text-sm transition-colors group-hover:text-[hsl(var(--aia-red))]">
                提交于 {formatAiaOATime(submission.submittedAt)}
              </span>
              <AiaOAReviewStatusBadge status={submission.reviewStatus} />
            </Link>
          </li>
        ))}
      </ul>
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
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const idempotencyKeyRef = useRef<string | null>(null)

  if (form === undefined) {
    return <p className="aia-text-muted py-6 text-sm" role="status">正在加载 OA 事项…</p>
  }

  if (!form) {
    return (
      <p className="border border-dashed aia-border-rule px-4 py-3 text-sm leading-6 text-[hsl(var(--aia-ink))]">
        该 OA 事项不存在、未发布，或当前账户无权访问。
      </p>
    )
  }

  const collecting = isOAFormCollecting(form, Date.now())
  const ownSubmissions = submissions || []

  return (
    <div className="space-y-10">
      <FormHeader form={form} />

      {submittedId ? (
        <div className="border border-dashed aia-border-rule px-4 py-3" role="status">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
            <div>
              <p className="font-medium text-[hsl(var(--aia-ink))]">已提交</p>
              <p className="aia-text-muted mt-1 text-sm leading-6">审核状态会同步显示在「我的提交」中。</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <Link
                  href={withReturnTo(`/services/oa/submissions/${submittedId}`, `/services/oa/${slug}`)}
                  className="aia-link aia-focus font-medium"
                >
                  查看本次提交
                </Link>
                {form.allowMultipleSubmissions !== false ? (
                  <button
                    type="button"
                    className="aia-link aia-focus font-medium"
                    onClick={() => {
                      idempotencyKeyRef.current = null
                      setSubmittedId(null)
                    }}
                  >
                    再填一份
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {submitError ? (
        <p role="alert" className="border-y aia-border-rule bg-[hsl(var(--aia-tag))] px-4 py-3 text-sm text-[hsl(var(--aia-red-deep))]">
          {submitError}
        </p>
      ) : null}

      <SubmissionSummary submissions={ownSubmissions} returnTo={`/services/oa/${slug}`} />

      {!submittedId && collecting ? (
        <OAFormRenderer
          form={form}
          heading="填写并提交"
          submitLabel="提交 OA 事项"
          onSubmit={async (answers) => {
            setSubmitError(null)
            try {
              idempotencyKeyRef.current ||= crypto.randomUUID()
              const id = await submit({
                formId: form._id,
                answers,
                idempotencyKey: idempotencyKeyRef.current,
              })
              setSubmittedId(String(id))
            } catch (error) {
              const message = error instanceof Error ? error.message : "提交未成功完成，请稍后重试。"
              setSubmitError(message)
              throw error
            }
          }}
        />
      ) : !submittedId ? (
        <p className="border border-dashed aia-border-rule px-4 py-3 text-sm leading-6 text-[hsl(var(--aia-ink))]">
          该事项当前不在可提交时间内。你仍可在「我的提交」中查看已有记录。
        </p>
      ) : null}
    </div>
  )
}
