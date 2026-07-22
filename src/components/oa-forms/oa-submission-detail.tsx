"use client"

import { ExternalLink, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useOAFormAttachmentUrl } from "@/lib/api"
import { oaReviewStatusLabels } from "@/lib/oa-forms"
import { formatSubmissionAnswer, getApprovalTimeline, getSubmissionTitle } from "@/lib/oa-submissions"
import type { OAFileAnswer, OAForm, OAFormField, OAFormSnapshot, OAFormSubmission, OAResultField } from "@/types"

type Props = {
  submission: OAFormSubmission
  snapshot: OAFormSnapshot
  fallbackForm?: OAForm | null
  allSubmissions: OAFormSubmission[]
}

function formatTime(value?: number) {
  if (!value) return "-"
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

function AttachmentLink({ submissionId, file }: { submissionId: string; file: OAFileAnswer }) {
  const url = useOAFormAttachmentUrl({ submissionId, storageId: file.storageId })

  if (!url) return <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{file.fileName}</span>

  return (
    <a href={url as string} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline underline-offset-4">
      <FileText className="h-3.5 w-3.5" />{file.fileName}<ExternalLink className="h-3 w-3" />
    </a>
  )
}

function AnswerValue({ field, submissionId, value }: { field: OAFormField; submissionId: string; value: unknown }) {
  const answer = formatSubmissionAnswer(field, value)

  if (answer.kind === "files") {
    if (answer.files.length === 0) return <span className="text-slate-500">-</span>
    return <div className="space-y-1">{answer.files.map((file) => <AttachmentLink key={`${submissionId}-${file.storageId}`} submissionId={submissionId} file={file as OAFileAnswer} />)}</div>
  }

  if (answer.kind === "multiple") {
    return answer.items.length > 0 ? <ul className="space-y-1">{answer.items.map((item, index) => <li key={`${item}-${index}`} className="before:mr-2 before:text-slate-400 before:content-['•']">{item}</li>)}</ul> : <span className="text-slate-500">-</span>
  }

  if (answer.kind === "table") {
    if (answer.columns.length === 0 || answer.rows.length === 0) return <span className="text-slate-500">-</span>
    return (
      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>{answer.columns.map((column) => <th key={column} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">{column}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {answer.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, columnIndex) => <td key={`${rowIndex}-${answer.columns[columnIndex]}`} className="whitespace-pre-wrap px-3 py-2 align-top text-slate-900">{cell || "-"}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    )
  }

  return <span className="whitespace-pre-wrap">{answer.text}</span>
}

function resultFieldsFor(snapshot: OAFormSnapshot, fallbackForm?: OAForm | null) {
  return (snapshot.resultFields || fallbackForm?.resultFields || []).filter((field) => field.visibleToSubmitter !== false)
}

function getTimelineDotClass(state: ReturnType<typeof getApprovalTimeline>[number]["state"]) {
  if (state === "completed" || state === "approved") return "border-green-200 bg-green-500"
  if (state === "in_progress" || state === "needs_changes") return "border-orange-200 bg-orange-500"
  if (state === "rejected") return "border-red-200 bg-red-500"
  return "border-slate-200 bg-slate-300"
}

function ApprovalTimeline({ submission }: { submission: OAFormSubmission }) {
  const timeline = getApprovalTimeline(submission)

  return (
    <ol className="relative space-y-6">
      {timeline.map((node, index) => (
        <li key={node.label} className="relative flex gap-3">
          {index < timeline.length - 1 ? <span className="absolute bottom-[-36px] left-[5.5px] top-3 w-px bg-slate-200" aria-hidden="true" /> : null}
          <span className={`relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 ${getTimelineDotClass(node.state)}`} aria-hidden="true" />
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-900">{node.label}</span>
              {node.actor ? <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600" aria-label={node.actor}>{node.actor.slice(0, 1)}</span> : null}
              {node.actor ? <span className="text-sm text-slate-700">{node.actor}</span> : null}
            </div>
            <p className="mt-1 text-sm text-slate-600">{node.detail}</p>
            {node.timestamp ? <time className="mt-1 block text-xs text-slate-400">{formatTime(node.timestamp)}</time> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function OAFormSubmissionDetail({ submission, snapshot, fallbackForm, allSubmissions }: Props) {
  const title = getSubmissionTitle(
    { ...submission, formTitle: submission.formTitle || snapshot.title || fallbackForm?.title },
    allSubmissions,
  )
  const fields = snapshot.fields || []
  const visibleResultFields = resultFieldsFor(snapshot, fallbackForm)
  const hasResults = Boolean(
    snapshot.resultsVisible &&
      submission.resultValues &&
      visibleResultFields.some((field) => {
        const value = submission.resultValues?.[field.id]
        return value !== undefined && value !== null && value !== ""
      }),
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <p className="text-sm text-slate-500">提交时间：{formatTime(submission.submittedAt)}</p>
          </div>
          <Badge variant={statusVariant(submission.reviewStatus)}>{oaReviewStatusLabels[submission.reviewStatus]}</Badge>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-4 md:grid-cols-2">
            {fields.map((field) => (
              <div key={field.id} className={field.type === "table" || field.type === "textarea" || field.type === "file" ? "space-y-1 md:col-span-2" : "space-y-1"}>
                <dt className="text-xs font-medium text-slate-500">{field.label}</dt>
                <dd className="break-words text-sm text-slate-900"><AnswerValue field={field} submissionId={submission._id} value={submission.answers?.[field.id]} /></dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {hasResults ? (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardHeader><CardTitle className="text-lg">处理结果</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-4 md:grid-cols-2">
              {visibleResultFields.map((field: OAResultField) => {
                const value = submission.resultValues?.[field.id]
                if (value === undefined || value === null || value === "") return null
                return <div key={field.id} className="space-y-1"><dt className="text-xs font-medium text-slate-500">{field.label}</dt><dd className="whitespace-pre-wrap text-sm text-slate-900">{typeof value === "object" ? "复杂内容无法显示" : String(value)}</dd></div>
              })}
            </dl>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle className="text-lg">审批进度</CardTitle></CardHeader>
        <CardContent><ApprovalTimeline submission={submission} /></CardContent>
      </Card>
    </div>
  )
}
