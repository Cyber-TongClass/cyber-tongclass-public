"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { OAFormRenderer } from "@/components/oa-forms/oa-form-renderer"
import { AiaOAAuthLoading, AiaOALoginRequired, AiaOAReviewStatusBadge, formatAiaOATime } from "@/components/oa/aia-oa-shared"
import { SafeReturnLink } from "@/components/navigation/safe-return-link"
import { useMyOAApprovalHistory, useMyOAFormSubmissions, useOAForm, useOAFormAttachmentUrl, useUpdateOAFormSubmission } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import type { OAFileAnswer, OAForm, OAFormField, OAFormSubmission, OAResultField } from "@/types"

type ApprovalHistoryItem = {
  action: "workflow_started" | "step_started" | "approved" | "rejected" | "step_completed" | "workflow_approved" | "workflow_rejected" | "changes_requested" | "workflow_changes_requested" | "resubmitted"
  stepIndex?: number
  stepId?: string
  stepTitle?: string
  actorName: string
  comment?: string
  createdAt: number
}

type TimelineNode = {
  key: string
  title: string
  detail: string
  operatorName: string
  time?: number
  state: "done" | "current" | "waiting" | "rejected"
}

function formatAnswer(field: OAFormField, value: unknown) {
  if (value === undefined || value === null || value === "") return "—"
  if (field.type === "table" && Array.isArray(value)) return value.map((row, index) => `第 ${index + 1} 行：${(field.columns || []).map((column) => `${column.label}：${String((row as Record<string, unknown>)[column.id] ?? "—")}`).join("；")}`).join("\n")
  if (Array.isArray(value)) return value.map((item) => typeof item === "object" && item && "fileName" in item ? String((item as { fileName: string }).fileName) : String(item)).join("；")
  return typeof value === "object" ? "已提交结构化内容" : String(value)
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

function AnswerValue({ submissionId, field, value }: { submissionId: string; field: OAFormField; value: unknown }) {
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

function buildTimeline(submission: OAFormSubmission, history: ApprovalHistoryItem[]): TimelineNode[] {
  const nodes: TimelineNode[] = [{
    key: "submitted",
    title: "提交",
    detail: "已提交",
    operatorName: submission.submitterName || "提交人",
    time: submission.submittedAt,
    state: "done",
  }]

  history.forEach((event, index) => {
    if (!["approved", "rejected", "changes_requested", "resubmitted"].includes(event.action)) return
    const approved = event.action === "approved"
    const changesRequested = event.action === "changes_requested"
    const resubmitted = event.action === "resubmitted"
    nodes.push({
      key: `${event.action}-${event.createdAt}-${index}`,
      title: event.stepTitle || "审批",
      detail: [
        resubmitted ? "已补充并重新提交" : changesRequested ? "要求补充材料" : approved ? "已同意" : "已驳回",
        event.comment,
      ].filter(Boolean).join(" · "),
      operatorName: event.actorName,
      time: event.createdAt,
      state: approved || resubmitted ? "done" : changesRequested ? "current" : "rejected",
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
      key: `pending-${activeStep.stepId || activeStep.createdAt}`,
      title: activeStep.stepTitle || "审批",
      detail: "等待处理",
      operatorName: "待审批",
      time: activeStep.createdAt,
      state: "current",
    })
  }

  const terminal = [...history].reverse().find((event) => event.action === "workflow_approved" || event.action === "workflow_rejected")
  if (terminal) {
    const approved = terminal.action === "workflow_approved"
    nodes.push({
      key: `completed-${terminal.createdAt}`,
      title: "结束",
      detail: [approved ? "已通过" : "未通过", terminal.comment].filter(Boolean).join(" · "),
      operatorName: terminal.actorName,
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
  const timeline = buildTimeline(submission, approvalHistory || [])
  const resultFields = form.resultFields || []
  const editable = submission.workflowStatus === "needs_changes"
    || (submission.workflowStatus === undefined && submission.allowSubmissionEdits === true)

  return <main className="container-custom max-w-4xl py-10 sm:py-12">
    <SafeReturnLink fallback="/services/oa#oa-my" className="aia-link aia-focus text-sm font-medium"><ArrowLeft className="mr-1 inline h-4 w-4" />返回进入位置</SafeReturnLink>
    <section className="mt-6 border aia-border-rule bg-white p-5 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="aia-kicker">提交 · Submission</p><h1 className="aia-serif mt-2 text-3xl font-semibold text-[hsl(var(--aia-ink))]">{submission.formTitle || form.title}的第 {ordinal} 次提交</h1><p className="aia-text-muted mt-2 text-sm">提交于 {formatAiaOATime(submission.submittedAt)}</p></div><AiaOAReviewStatusBadge status={submission.reviewStatus} /></div><dl className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">{form.fields.map((field) => <div key={field.id} className={field.type === "table" || field.type === "textarea" || field.type === "file" ? "sm:col-span-2" : ""}><dt className="aia-text-muted text-xs font-medium">{field.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-[hsl(var(--aia-ink))]"><AnswerValue submissionId={submission._id} field={field} value={submission.answers[field.id]} /></dd></div>)}</dl></section>
    {submission.resultValues && resultFields.length > 0 ? (
      <section className="mt-6 border aia-border-rule bg-white p-5 sm:p-8">
        <h2 className="aia-serif text-xl font-semibold text-[hsl(var(--aia-ink))]">办理结果</h2>
        <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {resultFields.map((field) => <div key={field.id}><dt className="aia-text-muted text-xs font-medium">{field.label}</dt><dd className="mt-1 text-sm text-[hsl(var(--aia-ink))]">{formatResult(field, submission.resultValues?.[field.id])}</dd></div>)}
        </dl>
      </section>
    ) : null}
    <section className="mt-6 border aia-border-rule bg-white p-5 sm:p-8"><h2 className="aia-serif text-xl font-semibold text-[hsl(var(--aia-ink))]">审批记录</h2><ol className="mt-6 space-y-6 border-l border-[hsl(var(--aia-rule))] pl-6">{timeline.map((node) => <li key={node.key} className="relative"><span className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ${node.state === "done" ? "bg-emerald-500" : node.state === "current" ? "bg-amber-400" : node.state === "rejected" ? "bg-rose-500" : "bg-slate-300"}`} /><p className="font-medium text-[hsl(var(--aia-ink))]">{node.title}</p><p className="mt-1 text-sm text-[hsl(var(--aia-ink))]">{node.operatorName}</p><p className="aia-text-muted mt-1 text-sm">{node.detail}</p>{node.time ? <time className="aia-text-muted mt-1 block text-xs">{formatAiaOATime(node.time)}</time> : null}</li>)}</ol></section>
    {editable ? (
      <section className="mt-6 border aia-border-rule bg-white p-5 sm:p-8">
        <h2 className="aia-serif text-xl font-semibold text-[hsl(var(--aia-ink))]">{submission.workflowStatus === "needs_changes" ? "补充材料并重新提交" : "修改提交内容"}</h2>
        <p className="aia-text-muted mt-2 text-sm">{submission.workflowStatus === "needs_changes" ? "请根据审批意见修改申请。重新提交后，审批将从当前步骤继续。" : "该表单允许修改已提交内容；保存后状态将回到待处理。"}</p>
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
  </main>
}
