"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { OAFormRenderer } from "@/components/oa-forms/oa-form-renderer"
import { AiaOAAuthLoading, AiaOALoginRequired, AiaOAReviewStatusBadge, formatAiaOATime } from "@/components/oa/aia-oa-shared"
import { SafeReturnLink } from "@/components/navigation/safe-return-link"
import { useMyOAApprovalHistory, useMyOAFormSubmissions, useOAForm, useOAFormAttachmentUrl, useUpdateOAFormSubmission } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { cn } from "@/lib/utils"
import type { OAFileAnswer, OAForm, OAFormField, OAFormSubmission, OAResultField } from "@/types"

type ApprovalHistoryItem = {
  kind?: "workflow_node"
  action?: "workflow_started" | "step_started" | "approved" | "rejected" | "step_completed" | "workflow_approved" | "workflow_rejected" | "changes_requested" | "workflow_changes_requested" | "resubmitted" | "form_access_granted" | "notification_sent" | "workflow_paused"
  stepIndex?: number
  stepId?: string
  stepTitle?: string
  nodeId?: string
  nodeTitle?: string
  nodeType?: "create_form" | "approval" | "batch_approval" | "fill_form" | "notification"
  state?: "completed" | "active" | "waiting" | "rejected" | "needs_changes" | "paused"
  workflowVersion?: number
  actorName?: string
  operatorName?: string
  comment?: string
  createdAt?: number
  startedAt?: number
  completedAt?: number
  scopeLabels?: string[]
  targetFormTitle?: string
  decisions?: ApprovalHistoryReviewer[]
  reviewers?: ApprovalHistoryReviewer[]
  tasks?: ApprovalHistoryReviewer[]
  branches?: ApprovalHistoryReviewer[]
}

type ApprovalHistoryReviewer = {
  taskId?: string
  reviewerName?: string
  actorName?: string
  status?: "pending" | "approved" | "rejected" | "changes_requested" | "skipped"
  decision?: "approve" | "approved" | "reject" | "rejected" | "request_changes" | "changes_requested"
  comment?: string
  actedAt?: number
  createdAt?: number
  workflowVersion?: number
}

type TimelineNode = {
  key: string
  title: string
  detail: string
  operatorName: string
  time?: number
  state: "done" | "current" | "waiting" | "rejected"
  /** Elapsed between the step reaching the approver and their action. */
  durationMs?: number
  /** True for the step currently waiting on an approver. */
  awaiting?: boolean
}

function formatAnswer(field: OAFormField, value: unknown) {
  if (value === undefined || value === null || value === "") return "—"
  if (Array.isArray(value)) return value.map((item) => typeof item === "object" && item && "fileName" in item ? String((item as { fileName: string }).fileName) : String(item)).join("；")
  return typeof value === "object" ? "已提交结构化内容" : String(value)
}

/** "2 天 3 小时" / "1 小时 20 分钟" / "45 分钟"; null when the input is not meaningful. */
function formatOADuration(ms?: number) {
  if (ms === undefined || !Number.isFinite(ms) || ms < 0) return null
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return "不足 1 分钟"
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  const parts: string[] = []
  if (days > 0) parts.push(`${days} 天`)
  if (hours > 0) parts.push(`${hours} 小时`)
  if (days === 0 && mins > 0) parts.push(`${mins} 分钟`)
  return parts.join(" ") || "不足 1 分钟"
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
    <a href={url as string} target="_blank" rel="noreferrer" className="aia-link inline-flex items-center gap-1">
      {file.fileName}<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  )
}

function TableAnswer({ field, value }: { field: OAFormField; value: unknown }) {
  const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : []
  const columns = field.columns || []
  if (rows.length === 0 || columns.length === 0) return <>—</>
  return (
    <div className="overflow-x-auto border aia-border-rule">
      <table className="w-full min-w-[28rem] text-left text-sm">
        <thead>
          <tr className="aia-bg-tag">
            {columns.map((column) => (
              <th key={column.id} className="aia-mono px-3 py-2 text-xs font-medium uppercase tracking-[0.1em] aia-text-muted">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t aia-border-rule">
              {columns.map((column) => (
                <td key={column.id} className="px-3 py-2 align-top text-[hsl(var(--aia-ink))]">
                  {String(row?.[column.id] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AnswerValue({ submissionId, field, value }: { submissionId: string; field: OAFormField; value: unknown }) {
  if (field.type === "table") {
    return <TableAnswer field={field} value={value} />
  }
  if (isFileAnswer(value)) {
    return <span className="flex flex-col items-start gap-1">{value.map((file) => <AttachmentLink key={file.storageId} submissionId={submissionId} file={file} />)}</span>
  }
  return <>{formatAnswer(field, value)}</>
}

function formatResult(field: OAResultField, value: unknown) {
  if (value === undefined || value === null || value === "") return "—"
  if (field.type === "select") {
    return field.options?.find((option) => option.value === value)?.label || String(value)
  }
  return String(value)
}

/** When did this step reach the approver? Latest step_started for the same step, else workflow start, else submission time. */
function receivedAtForAction(history: ApprovalHistoryItem[], actionIndex: number, fallback: number) {
  const event = history[actionIndex]
  for (let index = actionIndex - 1; index >= 0; index--) {
    const candidate = history[index]
    if (candidate.action !== "step_started") continue
    if (event.stepId && candidate.stepId && candidate.stepId !== event.stepId) continue
    return candidate.createdAt ?? fallback
  }
  for (let index = actionIndex - 1; index >= 0; index--) {
    if (history[index].action === "workflow_started") return history[index].createdAt ?? fallback
  }
  return fallback
}

function buildLegacyTimeline(submission: OAFormSubmission, history: ApprovalHistoryItem[]): TimelineNode[] {
  const nodes: TimelineNode[] = [{
    key: "submitted",
    title: "提交",
    detail: "已提交",
    operatorName: submission.submitterName || "提交人",
    time: submission.submittedAt,
    state: "done",
  }]

  history.forEach((event, index) => {
    if (!["approved", "rejected", "changes_requested", "resubmitted"].includes(event.action || "")) return
    const approved = event.action === "approved"
    const changesRequested = event.action === "changes_requested"
    const resubmitted = event.action === "resubmitted"
    nodes.push({
      key: `${event.action}-${event.createdAt ?? index}-${index}`,
      title: resubmitted ? "复审" : event.stepTitle || "审批",
      detail: [
        resubmitted ? "已补充并重新提交" : changesRequested ? "暂缓评审" : approved ? "已同意" : "已驳回",
        event.comment,
      ].filter(Boolean).join(" · "),
      operatorName: event.actorName || (resubmitted ? submission.submitterName || "提交人" : "审批人"),
      time: event.createdAt,
      state: approved || resubmitted ? "done" : changesRequested ? "current" : "rejected",
      durationMs: resubmitted || event.createdAt === undefined
        ? undefined
        : event.createdAt - receivedAtForAction(history, index, submission.submittedAt),
    })
  })

  if (submission.workflowStatus === "pending") {
    const activeStartIndex = history.findLastIndex((event) => {
      if (event.action !== "step_started") return false
      return !history.slice(history.indexOf(event) + 1).some((later) =>
        (later.action === "approved" || later.action === "rejected") && later.stepId === event.stepId
      )
    })
    const activeStep = activeStartIndex >= 0 ? history[activeStartIndex] : undefined
    if (activeStep) nodes.push({
      key: `pending-${activeStep.stepId || activeStep.createdAt || activeStartIndex}`,
      title: activeStep.stepTitle || "审批",
      detail: "等待处理",
      operatorName: "待审批",
      time: activeStep.createdAt,
      state: "current",
      awaiting: true,
    })
  }

  const terminal = [...history].reverse().find((event) => event.action === "workflow_approved" || event.action === "workflow_rejected")
  if (terminal) {
    const approved = terminal.action === "workflow_approved"
    nodes.push({
      key: `completed-${terminal.createdAt || terminal.action}`,
      title: "结束",
      detail: [approved ? "已通过" : "未通过", terminal.comment].filter(Boolean).join(" · "),
      operatorName: terminal.actorName || "系统",
      time: terminal.createdAt,
      state: approved ? "done" : "rejected",
    })
  } else if (submission.workflowStatus === "approved" || submission.workflowStatus === "rejected") {
    nodes.push({
      key: "completed-legacy",
      title: "结束",
      detail: submission.workflowStatus === "approved" ? "已通过（历史操作记录缺失）" : "未通过（历史操作记录缺失）",
      operatorName: "—",
      time: submission.workflowCompletedAt,
      state: submission.workflowStatus === "approved" ? "done" : "rejected",
    })
  }

  return nodes
}

function FieldRow({ submissionId, field, value }: { submissionId: string; field: OAFormField; value: unknown }) {
  const wide = field.type === "table" || field.type === "textarea" || field.type === "file"
  return (
    <div className={cn("border-b aia-border-rule py-4", !wide && "sm:grid sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-6")}>
      <dt className="aia-mono text-xs uppercase tracking-[0.12em] aia-text-muted">{field.label}</dt>
      <dd
        className={cn(
          "break-words text-sm leading-6 text-[hsl(var(--aia-ink))]",
          wide ? "mt-2.5" : "mt-1 sm:mt-0",
          field.type === "textarea" && "whitespace-pre-wrap",
        )}
      >
        <AnswerValue submissionId={submissionId} field={field} value={value} />
      </dd>
    </div>
  )
}

function ApprovalTimeline({ timeline }: { timeline: TimelineNode[] }) {
  const now = Date.now()
  return (
    <ol className="mt-5 space-y-5 border-l aia-border-rule pl-5">
      {timeline.map((node) => {
        const actedDuration = formatOADuration(node.durationMs)
        const waitingDuration = node.awaiting && node.time ? formatOADuration(now - node.time) : null
        return (
          <li key={node.key} className="relative">
            <span
              className={cn(
                "absolute -left-[23px] top-1.5 h-2 w-2 rounded-full",
                node.state === "done" && "bg-emerald-600",
                node.state === "current" && "bg-amber-500",
                node.state === "rejected" && "bg-rose-500",
                node.state === "waiting" && "bg-[hsl(var(--aia-rule))]",
              )}
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-[hsl(var(--aia-ink))]">{node.title}</p>
            <p className="aia-text-muted mt-0.5 text-xs">{node.operatorName}</p>
            <p className="mt-1 text-xs leading-5 text-[hsl(var(--aia-ink))]">{node.detail}</p>
            <p className="aia-mono mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.7rem] aia-text-muted">
              {node.time ? <time>{formatAiaOATime(node.time)}</time> : null}
              {actedDuration ? (
                <span className="text-[hsl(var(--aia-ink))]">收到后 {actedDuration} 处理</span>
              ) : null}
              {waitingDuration ? (
                <span className="text-amber-700">已等待 {waitingDuration}</span>
              ) : null}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

function reviewerDecision(reviewer: ApprovalHistoryReviewer) {
  const decision = reviewer.decision || reviewer.status
  if (decision === "approve" || decision === "approved") return { label: "已同意", tone: "approved" as const }
  if (decision === "reject" || decision === "rejected") return { label: "已拒绝", tone: "rejected" as const }
  if (decision === "request_changes" || decision === "changes_requested") return { label: "暂缓评审", tone: "deferred" as const }
  if (decision === "skipped") return { label: "本轮无需处理", tone: "muted" as const }
  return { label: "等待处理", tone: "pending" as const }
}

const workflowNodeTypeLabels = {
  create_form: "创建表单",
  approval: "审批",
  batch_approval: "批量审批",
  fill_form: "填写表单",
  notification: "通知",
} as const

function workflowStateLabel(node: ApprovalHistoryItem) {
  if (node.state === "completed") {
    if (node.nodeType === "notification") return "已发送"
    if (node.nodeType === "fill_form") return "已开放"
    if (node.nodeType === "create_form") return "已提交"
    return "已完成"
  }
  if (node.state === "active") return "处理中"
  if (node.state === "needs_changes") return "待补充材料"
  if (node.state === "rejected") return "已拒绝"
  if (node.state === "paused") return "流程暂停"
  return "尚未开始"
}

function WorkflowHistoryTimeline({ nodes }: { nodes: ApprovalHistoryItem[] }) {
  return (
    <ol className="mt-5 border-l aia-border-rule pl-5" aria-label="完整流程">
      {nodes.map((node, index) => {
        const isApproval = node.nodeType === "approval" || node.nodeType === "batch_approval"
        const showScope = Boolean(node.scopeLabels?.length)
          && (!isApproval || !node.decisions?.length || node.state === "active" || node.state === "waiting")
        const eventTime = node.completedAt || node.startedAt
        return (
          <li
            key={node.nodeId || `${node.nodeType}-${index}`}
            className={cn("relative pb-7 last:pb-0", node.state === "waiting" && "opacity-55")}
          >
            <span
              className={cn(
                "absolute -left-[24px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-[hsl(var(--aia-paper))]",
                node.state === "completed" && "bg-emerald-600",
                (node.state === "active" || node.state === "needs_changes" || node.state === "paused") && "bg-amber-500",
                node.state === "rejected" && "bg-rose-500",
                node.state === "waiting" && "bg-[hsl(var(--aia-rule))]",
              )}
              aria-hidden="true"
            />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-5 text-[hsl(var(--aia-ink))]">{node.nodeTitle}</p>
                <p className="aia-mono mt-1 text-[0.64rem] uppercase tracking-[0.12em] aia-text-muted">
                  {node.nodeType ? workflowNodeTypeLabels[node.nodeType] : "流程节点"}
                </p>
              </div>
              <span className={cn(
                "shrink-0 text-xs",
                node.state === "completed" && "text-emerald-700",
                (node.state === "active" || node.state === "needs_changes" || node.state === "paused") && "text-amber-700",
                node.state === "rejected" && "text-rose-700",
                node.state === "waiting" && "aia-text-muted",
              )}>
                {workflowStateLabel(node)}
              </span>
            </div>

            {node.nodeType === "create_form" ? (
              <p className="mt-2 text-xs text-[hsl(var(--aia-ink))]">{node.operatorName || "提交人"}</p>
            ) : null}
            {node.nodeType === "fill_form" ? (
              <p className="mt-2 text-xs leading-5 text-[hsl(var(--aia-ink))]">
                {node.state === "completed" ? "已开放填写：" : "到达此节点后开放："}
                {node.targetFormTitle || "目标表单"}
              </p>
            ) : null}
            {showScope ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="aia-text-muted text-xs">{isApproval ? "处理范围" : "通知范围"}</span>
                {node.scopeLabels?.map((label) => (
                  <span key={label} className="aia-bg-tag rounded-sm px-1.5 py-0.5 text-xs text-[hsl(var(--aia-ink))]">
                    {label}
                  </span>
                ))}
              </div>
            ) : null}

            {node.decisions?.length ? (
              <ul className="mt-3 space-y-2" aria-label={`${node.nodeTitle}实际处理记录`}>
                {node.decisions.map((reviewer, decisionIndex) => {
                  const decision = reviewerDecision(reviewer)
                  const rereview = (reviewer.workflowVersion ?? 1) > 1
                  return (
                    <li
                      key={reviewer.taskId || `${node.nodeId}-${decisionIndex}`}
                      className={cn(
                        "border-l-2 px-3 py-2 text-xs",
                        decision.tone === "approved" && "border-emerald-600 bg-emerald-50",
                        decision.tone === "rejected" && "border-rose-500 bg-rose-50",
                        decision.tone === "deferred" && "border-amber-500 bg-amber-100",
                      )}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium text-[hsl(var(--aia-ink))]">
                          {reviewer.reviewerName || reviewer.actorName || "审批人"}
                          {rereview ? <span className="aia-mono ml-1.5 text-[0.62rem] aia-text-muted">复审 V{reviewer.workflowVersion}</span> : null}
                        </span>
                        <span className={decision.tone === "deferred" ? "font-medium text-amber-800" : "aia-text-muted"}>
                          {decision.label}
                        </span>
                      </div>
                      {reviewer.comment ? (
                        <p className="mt-1.5 whitespace-pre-wrap leading-5 text-[hsl(var(--aia-ink))]">{reviewer.comment}</p>
                      ) : null}
                      {reviewer.actedAt ? (
                        <time className="aia-mono mt-1.5 block text-[0.65rem] aia-text-muted">
                          {formatAiaOATime(reviewer.actedAt)}
                        </time>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : null}
            {node.comment ? <p className="mt-2 text-xs leading-5 text-amber-800">{node.comment}</p> : null}
            {eventTime ? (
              <time className="aia-mono mt-2 block text-[0.65rem] aia-text-muted">{formatAiaOATime(eventTime)}</time>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

function ApprovalHistoryTimeline({
  workflowNodes,
  legacyTimeline,
}: {
  workflowNodes?: ApprovalHistoryItem[]
  legacyTimeline: TimelineNode[]
}) {
  return workflowNodes?.length
    ? <WorkflowHistoryTimeline nodes={workflowNodes} />
    : <ApprovalTimeline timeline={legacyTimeline} />
}

export default function AiaOASubmissionDetailPage() {
  const params = useParams<{ id: string }>()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const submissions = useMyOAFormSubmissions() as OAFormSubmission[] | undefined
  const submission = submissions?.find((item) => item._id === params.id)
  const fallbackForm = useOAForm(submission?.formSlug || null) as OAForm | null | undefined
  const approvalHistory = useMyOAApprovalHistory(submission?._id || null) as ApprovalHistoryItem[] | null | undefined
  const updateSubmission = useUpdateOAFormSubmission()
  const [updateMessage, setUpdateMessage] = useState<string | null>(null)

  if (authLoading) return <main className="container-custom py-12"><AiaOAAuthLoading /></main>
  if (!isAuthenticated) {
    return <main className="container-custom py-12"><AiaOALoginRequired nextPath={`/services/oa/submissions/${params.id}`} action="查看这条提交记录" /></main>
  }
  if (submissions === undefined || (submission && !submission.formSnapshot && fallbackForm === undefined) || (submission?.workflowStatus && approvalHistory === undefined)) return <p className="container-custom py-12 aia-text-muted">正在加载提交详情…</p>
  if (!submission) return <p className="container-custom py-12 aia-text-muted">未找到该提交记录，或你没有访问权限。</p>
  const form = submission.formSnapshot || fallbackForm
  if (!form) return <p className="container-custom py-12 aia-text-muted">该提交缺少可展示的表单信息。</p>
  const sameForm = submissions.filter((item) => item.formId === submission.formId).sort((a, b) => a.submittedAt - b.submittedAt || a._id.localeCompare(b._id))
  const ordinal = sameForm.findIndex((item) => item._id === submission._id) + 1
  const workflowNodes = (approvalHistory || [])
    .filter((item) => item.kind === "workflow_node")
    .sort((left, right) => (left.stepIndex ?? 0) - (right.stepIndex ?? 0))
  const legacyTimeline = buildLegacyTimeline(submission, approvalHistory || [])
  const resultFields = form.resultFields || []
  const editable = submission.workflowStatus === "needs_changes"
    || (submission.workflowStatus === undefined && submission.allowSubmissionEdits === true)

  return (
    <main className="container-custom max-w-6xl py-10 sm:py-12">
      <SafeReturnLink fallback="/services/oa#oa-my" className="aia-link aia-focus text-sm font-medium">
        <ArrowLeft className="mr-1 inline h-4 w-4" />返回进入位置
      </SafeReturnLink>

      <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="aia-kicker">提交 · Submission</p>
              <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
                {submission.formTitle || form.title}的第 {ordinal} 次提交
              </h1>
              <p className="aia-text-muted mt-2 text-sm">提交于 {formatAiaOATime(submission.submittedAt)}</p>
            </div>
            <AiaOAReviewStatusBadge status={submission.reviewStatus} />
          </header>

          <dl className="mt-8 border-t aia-border-rule">
            {form.fields.map((field) => (
              <FieldRow key={field.id} submissionId={submission._id} field={field} value={submission.answers[field.id]} />
            ))}
          </dl>

          {submission.resultValues && resultFields.length > 0 ? (
            <section className="mt-10" aria-label="办理结果">
              <h2 className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">办理结果</h2>
              <dl className="mt-4 border-t aia-border-rule">
                {resultFields.map((field) => (
                  <div key={field.id} className="border-b aia-border-rule py-4 sm:grid sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-6">
                    <dt className="aia-mono text-xs uppercase tracking-[0.12em] aia-text-muted">{field.label}</dt>
                    <dd className="mt-1 break-words text-sm leading-6 text-[hsl(var(--aia-ink))] sm:mt-0">
                      {formatResult(field, submission.resultValues?.[field.id])}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {editable ? (
            <section className="mt-10 border-t aia-border-rule pt-8" aria-label="修改提交">
              <h2 className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
                {submission.workflowStatus === "needs_changes" ? "补充材料并重新提交" : "修改提交内容"}
              </h2>
              <p className="aia-text-muted mt-2 text-sm">
                {submission.workflowStatus === "needs_changes" ? "请根据审批意见修改申请。重新提交后，审批将从当前步骤继续。" : "该表单允许修改已提交内容；保存后状态将回到待处理。"}
              </p>
              {updateMessage ? <p className="mt-3 text-sm" role="status">{updateMessage}</p> : null}
              <div className="mt-5">
                <OAFormRenderer
                  form={form as OAForm}
                  initialAnswers={submission.answers}
                  submitLabel="重新提交"
                  onSubmit={async (answers) => {
                    setUpdateMessage(null)
                    await updateSubmission({
                      id: submission._id,
                      answers,
                      expectedVersion: submission.workflowVersion ?? 1,
                    })
                    setUpdateMessage("补充材料已重新提交。")
                  }}
                />
              </div>
            </section>
          ) : null}
        </div>

        <aside aria-label="完整流程">
          <div className="lg:sticky lg:top-24">
            <h2 className="flex items-baseline gap-3 border-b aia-border-rule pb-2">
              <span className="aia-kicker">流程 · Workflow</span>
              <span className="aia-serif text-lg font-semibold tracking-tight text-[hsl(var(--aia-ink))]">完整流程</span>
            </h2>
            <ApprovalHistoryTimeline workflowNodes={workflowNodes} legacyTimeline={legacyTimeline} />
          </div>
        </aside>
      </div>
    </main>
  )
}
