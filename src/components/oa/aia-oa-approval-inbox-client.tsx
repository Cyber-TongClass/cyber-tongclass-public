"use client"

import { useState } from "react"
import { Check, ExternalLink, FileCheck2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { AiaOAAuthLoading, AiaOALoginRequired, AiaOAReviewStatusBadge, formatAiaOATime } from "@/components/oa/aia-oa-shared"
import { useOAApprovalInbox, useOAFormAttachmentUrl, useReviewOAFormSubmission } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import type { OAFileAnswer, OAReviewStatus } from "@/types"

type AiaOAApprovalInboxItem = {
  _id: string
  formId: string
  formSlug: string
  formTitle: string
  submittedAt: number
  answers: Record<string, unknown>
  reviewStatus: OAReviewStatus
  workflowStatus?: "pending" | "approved" | "rejected"
  currentApprovalStep?: number
  taskId: string
  taskStatus: "pending" | "approved" | "rejected" | "skipped"
  taskActedAt?: number
  taskComment?: string
  approvalStep?: {
    id: string
    title: string
    index: number
    completion: "any" | "all"
  }
}

function isFileAnswer(value: unknown): value is OAFileAnswer[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => (
    item && typeof item === "object" && "storageId" in item && "fileName" in item
  ))
}

function AttachmentLink({ submissionId, file }: { submissionId: string; file: OAFileAnswer }) {
  const url = useOAFormAttachmentUrl({ submissionId, storageId: file.storageId })
  if (!url) return <span>{file.fileName}</span>
  return (
    <a href={url as string} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline underline-offset-4">
      {file.fileName}<ExternalLink className="h-3 w-3" aria-hidden="true" />
    </a>
  )
}

function AnswerValue({ submissionId, value }: { submissionId: string; value: unknown }) {
  if (isFileAnswer(value)) {
    return <span className="flex flex-col items-start gap-1">{value.map((file) => <AttachmentLink key={file.storageId} submissionId={submissionId} file={file} />)}</span>
  }
  return <>{formatAnswer(value)}</>
}

function AnswerPreview({ submissionId, answers }: { submissionId: string; answers: Record<string, unknown> }) {
  const entries = Object.entries(answers || {})
  if (entries.length === 0) return <p className="text-sm text-slate-500">申请中没有可显示的字段。</p>

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-md border border-slate-200 bg-white px-3 py-2">
          <dt className="text-xs font-medium text-slate-500">{key}</dt>
          <dd className="mt-1 break-words text-sm text-slate-800"><AnswerValue submissionId={submissionId} value={value} /></dd>
        </div>
      ))}
    </dl>
  )
}

function formatAnswer(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—"
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) return value.map((item) => formatAnswer(item)).join("；")
  if (typeof value === "object") {
    const record = value as { fileName?: unknown }
    return typeof record.fileName === "string" ? `附件：${record.fileName}` : "已提交结构化内容"
  }
  return "已提交"
}

type ReviewAction = "approve" | "reject"

const actionPresentation: Record<ReviewAction, { label: string; icon: typeof Check; variant: "default" | "outline" | "destructive" }> = {
  approve: { label: "通过", icon: Check, variant: "default" },
  reject: { label: "不通过", icon: X, variant: "destructive" },
}

/** Reviewer inbox. The server is the authority for whether this session may see or act on any item. */
export function AiaOAApprovalInboxClient() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <AiaOAAuthLoading />
  }

  if (!isAuthenticated) {
    return <AiaOALoginRequired nextPath="/services/oa/approvals" action="打开审批处理台" />
  }

  return <AiaOAApprovalInboxAuthenticated />
}

function AiaOAApprovalInboxAuthenticated() {
  const inbox = useOAApprovalInbox() as AiaOAApprovalInboxItem[] | undefined
  const review = useReviewOAFormSubmission()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleReview(taskId: string, action: ReviewAction) {
    setBusyId(taskId)
    setMessage(null)
    try {
      const comment = notes[taskId]?.trim()
      await review({ taskId, action, ...(comment ? { comment } : {}) })
      setMessage("审批结果已提交。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "审批未成功完成，请稍后重试。")
    } finally {
      setBusyId(null)
    }
  }

  if (inbox === undefined) {
    return <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600" role="status">正在加载审批事项…</p>
  }

  if (inbox.length === 0) {
    return (
      <Card><CardContent className="py-10 text-center text-sm text-slate-600">
        <FileCheck2 className="mx-auto mb-3 h-6 w-6 text-slate-400" aria-hidden="true" />
        当前没有待处理事项，或你的账户尚未被授予相关审批权限。
      </CardContent></Card>
    )
  }

  return (
    <div className="space-y-4">
      {message ? <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700" role="status">{message}</p> : null}
      {inbox.map((item) => (
        <article key={item.taskId} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label={`OA 审批事项 ${item.formTitle || item.formSlug || item._id}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-primary">{item.formTitle || item.formSlug || "OA 事项"}</p>
              <p className="mt-1 text-sm text-slate-600">提交于 {formatAiaOATime(item.submittedAt)}</p>
              {item.approvalStep ? (
                <p className="mt-1 text-xs text-slate-500">
                  当前步骤：第 {item.approvalStep.index + 1} 级 · {item.approvalStep.title} · {item.approvalStep.completion === "all" ? "全体审批人通过" : "任一审批人处理"}
                </p>
              ) : null}
            </div>
            <AiaOAReviewStatusBadge status={item.reviewStatus} />
          </div>

          <details className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-800">查看提交内容</summary>
            <div className="mt-4"><AnswerPreview submissionId={item._id} answers={item.answers || {}} /></div>
          </details>

          <div className="mt-5">
            <label htmlFor={`aia-oa-note-${item.taskId}`} className="text-sm font-medium text-slate-800">处理意见（可选）</label>
            <Textarea
              id={`aia-oa-note-${item.taskId}`}
              value={notes[item.taskId] || ""}
              onChange={(event) => setNotes((current) => ({ ...current, [item.taskId]: event.target.value }))}
              placeholder="必要时说明审批依据或需补充的内容"
              className="mt-2"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(actionPresentation) as ReviewAction[]).map((action) => {
              const presentation = actionPresentation[action]
              const Icon = presentation.icon
              return (
                <Button
                  key={action}
                  type="button"
                  variant={presentation.variant}
                  size="sm"
                  disabled={busyId === item.taskId}
                  onClick={() => void handleReview(item.taskId, action)}
                >
                  <Icon className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  {presentation.label}
                </Button>
              )
            })}
          </div>
        </article>
      ))}
    </div>
  )
}
