"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useRef, useState } from "react"
import { ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { OAFormRenderer } from "@/components/oa-forms/oa-form-renderer"
import { isOAFormCollecting, oaReviewStatusLabels } from "@/lib/oa-forms"
import { useMyOAFormSubmissions, useOAFormAttachmentUrl, usePublishedOAFormBySlug, useSubmitOAForm, useUpdateOAFormSubmission } from "@/lib/api"
import type { OAFileAnswer, OAForm, OAFormSubmission } from "@/types"

function formatTime(value?: number) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

function formatResult(form: OAForm, resultValues?: Record<string, unknown>) {
  if (!resultValues || Object.keys(resultValues).length === 0) return "-"
  const labelById = new Map((form.resultFields || []).map((field) => [field.id, field.label]))
  return Object.entries(resultValues).map(([key, value]) => `${labelById.get(key) || key}: ${String(value ?? "")}`).join("；")
}

function isFileAnswer(value: unknown): value is OAFileAnswer[] {
  return Array.isArray(value) && value.some((item) => item && typeof item === "object" && "storageId" in item)
}

function AttachmentLink({ submissionId, file }: { submissionId: string; file: OAFileAnswer }) {
  const url = useOAFormAttachmentUrl({ submissionId, storageId: file.storageId })
  if (!url) return <span>{file.fileName}</span>
  return (
    <a href={url as string} target="_blank" rel="noreferrer" className="aia-link inline-flex items-center gap-1">
      {file.fileName}
      <ExternalLink className="h-3 w-3" />
    </a>
  )
}

function formatAnswerValue(submissionId: string, value: unknown) {
  if (isFileAnswer(value)) {
    return (
      <div className="space-y-1">
        {value.map((file) => <AttachmentLink key={`${submissionId}-${file.storageId}`} submissionId={submissionId} file={file} />)}
      </div>
    )
  }
  if (Array.isArray(value)) {
    return <span className="whitespace-pre-wrap">{value.map((item) => typeof item === "object" ? JSON.stringify(item) : String(item)).join("；")}</span>
  }
  if (value && typeof value === "object") return <span className="whitespace-pre-wrap">{JSON.stringify(value)}</span>
  return <span className="whitespace-pre-wrap">{String(value ?? "-")}</span>
}

function SubmissionDialog({ form, submission, canEdit, initialMode, triggerLabel }: { form: OAForm; submission: OAFormSubmission; canEdit: boolean; initialMode: "view" | "edit"; triggerLabel: string }) {
  const updateSubmission = useUpdateOAFormSubmission()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"view" | "edit">(initialMode)

  const onOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) setMode(initialMode)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button type="button" className="aia-link aia-focus text-sm font-medium">{triggerLabel}</button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "修改提交内容" : "提交内容"}</DialogTitle>
          <DialogDescription>{formatTime(submission.submittedAt)} · {oaReviewStatusLabels[submission.reviewStatus]}</DialogDescription>
        </DialogHeader>
        {mode === "edit" ? (
          <OAFormRenderer
            form={form}
            initialAnswers={submission.answers}
            heading="修改提交"
            submitLabel="保存修改"
            onSubmit={async (answers) => {
              await updateSubmission({ id: submission._id, answers })
              window.location.reload()
            }}
          />
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              {form.fields.map((field) => (
                <div key={field.id} className="aia-bg-tag border aia-border-rule px-3 py-2">
                  <div className="aia-mono text-xs font-medium uppercase tracking-[0.1em] aia-text-muted">{field.label}</div>
                  <div className="mt-1 break-words text-sm text-[hsl(var(--aia-ink))]">{formatAnswerValue(submission._id, submission.answers?.[field.id])}</div>
                </div>
              ))}
            </div>
            {submission.adminNote ? (
              <div className="border aia-border-rule px-3 py-2 text-sm">
                <div className="font-medium text-[hsl(var(--aia-ink))]">管理员备注</div>
                <div className="mt-1 whitespace-pre-wrap aia-text-muted">{submission.adminNote}</div>
              </div>
            ) : null}
            {form.resultsVisible && submission.resultValues && Object.keys(submission.resultValues).length > 0 ? (
              <div className="border aia-border-rule px-3 py-2 text-sm">
                <div className="font-medium text-[hsl(var(--aia-ink))]">结果</div>
                <div className="mt-1 aia-text-muted">{formatResult(form, submission.resultValues)}</div>
              </div>
            ) : null}
            {canEdit ? (
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={() => setMode("edit")}>修改提交</Button>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function IntranetFormBackLink() {
  return (
    <Link href="/tong-class/intranet/forms" className="aia-link aia-mono text-xs uppercase tracking-[0.14em]">
      ← 返回 OA 填报
    </Link>
  )
}

export default function IntranetFormDetailPage() {
  const params = useParams<{ slug: string }>()
  const form = usePublishedOAFormBySlug(params.slug) as OAForm | null | undefined
  const submissions = useMyOAFormSubmissions(form?._id || null) as OAFormSubmission[] | undefined
  const submitForm = useSubmitOAForm()
  const submissionIdempotencyKeyRef = useRef<string | null>(null)
  const collecting = form ? isOAFormCollecting(form) : false
  const canEditSubmissions = Boolean(form?.allowSubmissionEdits && collecting)

  if (form === undefined) {
    return (
      <div className="container-custom max-w-3xl py-10 sm:py-12">
        <p role="status" className="aia-mono aia-text-muted text-xs">正在读取表单…</p>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="container-custom max-w-3xl space-y-6 py-10 sm:py-12">
        <IntranetFormBackLink />
        <p className="border border-dashed aia-border-rule px-4 py-3 text-sm leading-6 text-[hsl(var(--aia-ink))]">表单不存在或尚未发布。</p>
      </div>
    )
  }

  return (
    <div className="container-custom max-w-3xl space-y-10 py-10 sm:py-12">
      <IntranetFormBackLink />

      <header className="border-b aia-border-rule pb-7">
        <p className="aia-kicker">OA · 填报</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="aia-mono aia-bg-tag px-1.5 py-0.5 text-[11px] tracking-wider">{form.category}</span>
          {form.resultsVisible ? <Badge>可查看结果</Badge> : null}
        </div>
        <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">{form.title}</h1>
        {form.description ? <p className="aia-text-muted mt-2 max-w-2xl text-sm leading-6">{form.description}</p> : null}
      </header>

      {collecting ? (
        <OAFormRenderer
          form={form}
          heading="新建提交"
          onSubmit={async (answers) => {
            submissionIdempotencyKeyRef.current ||= crypto.randomUUID()
            await submitForm({
              formId: form._id,
              answers,
              idempotencyKey: submissionIdempotencyKeyRef.current,
            })
            window.location.reload()
          }}
          submitLabel="提交填报"
        />
      ) : (
        <p className="border border-dashed aia-border-rule px-4 py-3 text-sm leading-6 text-[hsl(var(--aia-ink))]">该表单已停止收集，你仍可查看自己的提交记录。</p>
      )}

      <section aria-labelledby="intranet-form-submissions-heading">
        <div className="flex items-baseline gap-3 border-b aia-border-rule pb-3">
          <span className="aia-kicker">提交 · Submissions</span>
          <h2 id="intranet-form-submissions-heading" className="aia-serif text-lg font-semibold tracking-tight text-[hsl(var(--aia-ink))]">我的提交记录</h2>
        </div>
        <div className="overflow-x-auto pt-4">
          <Table>
            <TableHeader><TableRow><TableHead className="w-48">提交时间</TableHead><TableHead className="w-32">状态</TableHead><TableHead>详情</TableHead></TableRow></TableHeader>
            <TableBody>
              {submissions === undefined ? <TableRow><TableCell colSpan={3} className="text-center aia-text-muted">正在读取提交记录…</TableCell></TableRow> : submissions.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center aia-text-muted">暂无提交记录</TableCell></TableRow> : submissions.map((submission) => (
                <TableRow key={submission._id}>
                  <TableCell className="whitespace-nowrap">{formatTime(submission.submittedAt)}</TableCell>
                  <TableCell>{oaReviewStatusLabels[submission.reviewStatus]}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <SubmissionDialog form={form} submission={submission} canEdit={canEditSubmissions} initialMode="view" triggerLabel="查看内容" />
                      {canEditSubmissions ? <SubmissionDialog form={form} submission={submission} canEdit={canEditSubmissions} initialMode="edit" triggerLabel="修改" /> : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
