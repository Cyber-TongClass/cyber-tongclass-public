"use client"

import { useEffect, useState } from "react"
import { Check, ExternalLink, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AiaOAAuthLoading, AiaOAListOverflowButton, AiaOALoginRequired, AiaOAReviewStatusBadge, formatAiaOATime } from "@/components/oa/aia-oa-shared"
import {
  useEnsureMyReimbursementApprovalTasks,
  useMyContentPermissions,
  useOAApprovalInbox,
  useOAFormAttachmentUrl,
  useReviewOAFormSubmission,
} from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import type { OAFileAnswer, OAReviewStatus } from "@/types"

type AiaOAApprovalInboxItem = {
  _id: string
  formId: string
  formSlug: string
  formTitle: string
  submittedAt: number
  answers: Record<string, unknown>
  formFields: Array<{
    id: string
    label: string
    type: string
  }>
  reviewStatus: OAReviewStatus
  workflowStatus?: "pending" | "needs_changes" | "approved" | "rejected"
  workflowVersion?: number
  currentApprovalStep?: number
  nodeId?: string
  nodeTitle?: string
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
    <a href={url as string} target="_blank" rel="noreferrer" className="aia-link inline-flex items-center gap-1 text-[hsl(var(--aia-red))]">
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

function AnswerPreview({
  submissionId,
  answers,
  formFields,
}: {
  submissionId: string
  answers: Record<string, unknown>
  formFields: AiaOAApprovalInboxItem["formFields"]
}) {
  const knownIds = new Set(formFields.map((field) => field.id))
  const entries = [
    ...formFields
      .filter((field) => Object.prototype.hasOwnProperty.call(answers || {}, field.id))
      .map((field) => ({ key: field.id, label: field.label, value: answers[field.id] })),
    ...Object.entries(answers || {})
      .filter(([key]) => !knownIds.has(key))
      .map(([key, value]) => ({ key, label: `历史字段（${key}）`, value })),
  ]
  if (entries.length === 0) return <p className="aia-text-muted text-sm">申请中没有可显示的字段。</p>

  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {entries.map(({ key, label, value }) => (
        <div key={key} className="border aia-border-rule px-3 py-2">
          <dt className="aia-text-muted text-xs font-medium">{label}</dt>
          <dd className="mt-1 break-words text-sm text-[hsl(var(--aia-ink))]"><AnswerValue submissionId={submissionId} value={value} /></dd>
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

type ReviewAction = "approve" | "reject" | "request_changes"

const actionPresentation: Record<ReviewAction, { label: string; icon: typeof Check; variant: "default" | "outline" | "destructive"; className?: string }> = {
  approve: { label: "同意", icon: Check, variant: "default" },
  reject: { label: "拒绝", icon: X, variant: "destructive" },
  request_changes: {
    label: "暂缓评审",
    icon: RotateCcw,
    variant: "outline",
    className: "border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200",
  },
}

/** Reviewer inbox. The server is the authority for whether this session may see or act on any item. */
export function AiaOAApprovalInboxClient({ maxVisible }: { maxVisible?: number }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <AiaOAAuthLoading />
  }

  if (!isAuthenticated) {
    return <AiaOALoginRequired nextPath="/services/oa/approvals" action="打开审批处理台" />
  }

  return <AiaOAApprovalInboxAuthenticated maxVisible={maxVisible} />
}

function AiaOAApprovalInboxAuthenticated({ maxVisible }: { maxVisible?: number }) {
  const inbox = useOAApprovalInbox() as AiaOAApprovalInboxItem[] | undefined
  const permissions = useMyContentPermissions()
  const ensureReimbursementTasks = useEnsureMyReimbursementApprovalTasks()
  const review = useReviewOAFormSubmission()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set())
  const [message, setMessage] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (permissions?.reimbursement?.canManage !== true) return
    void ensureReimbursementTasks().catch(() => {
      // The reactive inbox will retry on the next authenticated mount.
    })
  }, [ensureReimbursementTasks, permissions?.reimbursement?.canManage])

  async function handleReview(taskId: string, action: ReviewAction) {
    if (busyIds.has(taskId)) return
    setBusyIds((current) => new Set(current).add(taskId))
    setMessage(null)
    try {
      const comment = notes[taskId]?.trim()
      if (action === "request_changes" && !comment) {
        setMessage("暂缓评审时必须填写处理意见。")
        return
      }
      const item = inbox?.find((candidate) => candidate.taskId === taskId)
      if (!item) {
        setMessage("该审批事项已更新，请刷新后重试。")
        return
      }
      const result = await review({
        taskId,
        action,
        idempotencyKey: crypto.randomUUID(),
        expectedVersion: item.workflowVersion ?? 1,
        ...(comment ? { comment } : {}),
      })
      if (!result.updated) {
        const failureMessages: Record<string, string> = {
          stale_version: "该事项已被更新，请重新加载后再处理。",
          task_not_pending: "该事项已被处理，无需重复提交。",
          task_not_current: "该事项已进入其他审批步骤，请重新加载。",
          workflow_not_pending: "该流程已结束，无需重复处理。",
          idempotency_conflict: "审批请求标识冲突，请重新操作。",
          already_handled: "该审批请求已处理。",
        }
        setMessage(failureMessages[result.reason] || "审批状态已变化，本次操作未写入。")
        return
      }
      setNotes((current) => ({ ...current, [taskId]: "" }))
      setMessage(result.reason === "awaiting_other_approvers"
        ? "你的审批结果已提交，正在等待本级其他审批人。"
        : "审批结果已提交。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "审批未成功完成，请稍后重试。")
    } finally {
      setBusyIds((current) => {
        const next = new Set(current)
        next.delete(taskId)
        return next
      })
    }
  }

  if (inbox === undefined) {
    return (
      <p role="status" className="aia-text-muted py-6 text-sm">
        正在加载审批事项…
      </p>
    )
  }

  if (inbox.length === 0) {
    return <p className="aia-text-muted py-6 text-sm">当前没有待处理事项，或你的账户尚未被授予相关审批权限。</p>
  }

  const visibleItems = typeof maxVisible === "number" && !expanded ? inbox.slice(0, maxVisible) : inbox

  return (
    <div>
      {message ? <p role="status" className="aia-text-muted py-3 text-sm">{message}</p> : null}
      <div className="divide-y divide-[hsl(var(--aia-rule))]">
        {visibleItems.map((item) => (
          <article key={item.taskId} className="py-5" aria-label={`OA 审批事项 ${item.formTitle || item.formSlug || item._id}`}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="min-w-0 flex-1 font-medium text-[hsl(var(--aia-ink))]">
                {item.formTitle || item.formSlug || "OA 事项"}
                <span className="aia-text-muted ml-2 text-xs">提交于 {formatAiaOATime(item.submittedAt)}</span>
                {item.approvalStep ? (
                  <span className="aia-text-muted ml-2 text-xs">
                    第 {item.approvalStep.index + 1} 级 · {item.approvalStep.title} · {item.approvalStep.completion === "all" ? "全体审批人通过" : "任一审批人处理"}
                  </span>
                ) : item.nodeTitle ? (
                  <span className="aia-text-muted ml-2 text-xs">{item.nodeTitle}</span>
                ) : null}
              </p>
              <AiaOAReviewStatusBadge status={item.reviewStatus} />
            </div>

            <details className="mt-3 border aia-border-rule px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium text-[hsl(var(--aia-ink))]">查看提交内容</summary>
              <div className="mt-3">
                <AnswerPreview submissionId={item._id} answers={item.answers || {}} formFields={item.formFields || []} />
              </div>
            </details>

            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="min-w-56 flex-1">
                <label htmlFor={`aia-oa-note-${item.taskId}`} className="aia-text-muted text-xs font-medium">
                  处理意见（暂缓评审时必填）
                </label>
                <Textarea
                  id={`aia-oa-note-${item.taskId}`}
                  value={notes[item.taskId] || ""}
                  onChange={(event) => setNotes((current) => ({ ...current, [item.taskId]: event.target.value }))}
                  placeholder="必要时说明审批依据或需补充的内容"
                  className="mt-1 min-h-9"
                  disabled={busyIds.has(item.taskId)}
                />
              </div>
              <div className="flex gap-2">
                {(Object.keys(actionPresentation) as ReviewAction[]).map((action) => {
                  const presentation = actionPresentation[action]
                  const Icon = presentation.icon
                  return (
                    <Button
                      key={action}
                      type="button"
                      variant={presentation.variant}
                      size="sm"
                      className={`min-h-11 ${presentation.className || ""}`}
                      disabled={busyIds.has(item.taskId)}
                      onClick={() => void handleReview(item.taskId, action)}
                    >
                      <Icon className="mr-1.5 h-4 w-4" aria-hidden="true" />
                      {presentation.label}
                    </Button>
                  )
                })}
              </div>
            </div>
          </article>
        ))}
      </div>
      {typeof maxVisible === "number" && inbox.length > maxVisible ? (
        <div className="border-t aia-border-rule pt-3">
          <AiaOAListOverflowButton
            expanded={expanded}
            remaining={inbox.length - maxVisible}
            onToggle={() => setExpanded((current) => !current)}
          />
        </div>
      ) : null}
    </div>
  )
}
