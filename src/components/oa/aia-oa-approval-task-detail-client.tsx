"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { AiaOAAuthLoading, AiaOALoginRequired, AiaOAReviewStatusBadge, formatAiaOATime } from "@/components/oa/aia-oa-shared"
import { SafeReturnLink } from "@/components/navigation/safe-return-link"
import { Button } from "@/components/ui/button"
import { useOAApprovalTask } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import type { OAReviewStatus } from "@/types"

type ApprovalTaskDetail = {
  _id: string
  formTitle?: string
  formSlug?: string
  submittedAt: number
  answers: Record<string, unknown>
  formFields: Array<{ id: string; label: string }>
  reviewStatus: OAReviewStatus
  taskStatus: "pending" | "approved" | "rejected" | "changes_requested" | "skipped"
  taskActedAt?: number
  taskComment?: string
  approvalStep?: { index: number; title: string }
  nodeId?: string
  nodeTitle?: string
  workflowVersion?: number
  reviewers?: ApprovalTaskReviewer[]
  tasks?: ApprovalTaskReviewer[]
  branches?: ApprovalTaskReviewer[]
}

type ApprovalTaskReviewer = {
  taskId?: string
  reviewerName?: string
  status?: "pending" | "approved" | "rejected" | "changes_requested" | "skipped"
  decision?: "approve" | "approved" | "reject" | "rejected" | "request_changes" | "changes_requested"
  comment?: string
  actedAt?: number
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—"
  if (Array.isArray(value)) return value.map(formatValue).join("；")
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

const taskStatusLabels: Record<ApprovalTaskDetail["taskStatus"], string> = {
  pending: "待处理",
  approved: "已通过",
  rejected: "已驳回",
  changes_requested: "暂缓评审",
  skipped: "已跳过",
}

function branchStatus(reviewer: ApprovalTaskReviewer) {
  const status = reviewer.decision || reviewer.status
  if (status === "approve" || status === "approved") return { label: "已同意", className: "text-emerald-700" }
  if (status === "reject" || status === "rejected") return { label: "已拒绝", className: "text-rose-700" }
  if (status === "request_changes" || status === "changes_requested") return { label: "暂缓评审", className: "text-amber-800" }
  if (status === "skipped") return { label: "本轮无需处理", className: "aia-text-muted" }
  return { label: "等待处理", className: "aia-text-muted" }
}

export function AiaOAApprovalTaskDetailClient({ taskId }: { taskId: string }) {
  const { isAuthenticated, isLoading } = useAuth()
  const task = useOAApprovalTask(isAuthenticated ? taskId : null) as ApprovalTaskDetail | null | undefined

  if (isLoading) return <AiaOAAuthLoading />
  if (!isAuthenticated) {
    return <AiaOALoginRequired nextPath={`/services/oa/approvals/${encodeURIComponent(taskId)}`} action="查看审批事项上下文" />
  }
  if (task === undefined) return <AiaOAAuthLoading />
  const reviewerBranches = task?.branches || task?.tasks || task?.reviewers || []

  return (
    <div className="space-y-6">
      <SafeReturnLink fallback="/notifications" className="aia-link inline-flex items-center gap-2 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        返回进入位置
      </SafeReturnLink>
      {!task ? (
        <div className="border aia-border-rule p-6">
          <h1 className="aia-serif text-2xl font-semibold">审批事项不可用</h1>
          <p className="aia-text-muted mt-2 text-sm">该通知对应的任务不存在，或当前账户无权查看。</p>
        </div>
      ) : (
        <>
          <header className="space-y-2 border-b aia-border-rule pb-5">
            <p className="aia-kicker">审批上下文 · Approval context</p>
            <h1 className="aia-serif text-3xl font-semibold">{task.formTitle || task.formSlug || "OA 审批事项"}</h1>
            <div className="flex flex-wrap gap-3 text-sm">
              <AiaOAReviewStatusBadge status={task.reviewStatus} />
              <span className={task.taskStatus === "changes_requested"
                ? "bg-amber-100 px-2 py-0.5 text-amber-800"
                : "aia-text-muted"}>
                {taskStatusLabels[task.taskStatus]}
              </span>
              <span className="aia-text-muted">提交于 {formatAiaOATime(task.submittedAt)}</span>
              {task.workflowVersion ? <span className="aia-mono aia-text-muted">V{task.workflowVersion}</span> : null}
            </div>
          </header>
          <dl className="grid gap-3 sm:grid-cols-2">
            {(task.formFields || []).map((field) => (
              <div key={field.id} className="border aia-border-rule p-3">
                <dt className="aia-text-muted text-xs">{field.label}</dt>
                <dd className="mt-1 break-words text-sm">{formatValue(task.answers?.[field.id])}</dd>
              </div>
            ))}
          </dl>
          {task.taskComment ? (
            <div className={task.taskStatus === "changes_requested"
              ? "border border-amber-300 bg-amber-100 p-4 text-sm text-amber-900"
              : "border aia-border-rule p-4 text-sm"}>
              <p className={task.taskStatus === "changes_requested" ? "text-xs text-amber-800" : "aia-text-muted text-xs"}>
                {task.taskStatus === "changes_requested" ? "暂缓评审意见" : "处理意见"}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{task.taskComment}</p>
            </div>
          ) : null}
          {reviewerBranches.length > 1 ? (
            <section aria-label="本节点审批分支">
              <h2 className="aia-serif text-lg font-semibold">
                {task.nodeTitle || task.approvalStep?.title || "本节点审批分支"}
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {reviewerBranches.map((reviewer, index) => {
                  const presentation = branchStatus(reviewer)
                  return (
                    <li key={reviewer.taskId || index} className="border aia-border-rule p-3 text-sm">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-medium">{reviewer.reviewerName || `审批人 ${index + 1}`}</span>
                        <span className={presentation.className}>{presentation.label}</span>
                      </div>
                      {reviewer.comment ? <p className="mt-2 whitespace-pre-wrap text-xs">{reviewer.comment}</p> : null}
                      {reviewer.actedAt ? (
                        <time className="aia-mono aia-text-muted mt-2 block text-[0.65rem]">{formatAiaOATime(reviewer.actedAt)}</time>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}
          {task.taskStatus === "pending" ? (
            <Button asChild><Link href="/services/oa/approvals">前往审批处理台</Link></Button>
          ) : null}
        </>
      )}
    </div>
  )
}
