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
  changes_requested: "已要求补充",
  skipped: "已跳过",
}

export function AiaOAApprovalTaskDetailClient({ taskId }: { taskId: string }) {
  const { isAuthenticated, isLoading } = useAuth()
  const task = useOAApprovalTask(isAuthenticated ? taskId : null) as ApprovalTaskDetail | null | undefined

  if (isLoading) return <AiaOAAuthLoading />
  if (!isAuthenticated) {
    return <AiaOALoginRequired nextPath={`/services/oa/approvals/${encodeURIComponent(taskId)}`} action="查看审批事项上下文" />
  }
  if (task === undefined) return <AiaOAAuthLoading />

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
              <span className="aia-text-muted">{taskStatusLabels[task.taskStatus]}</span>
              <span className="aia-text-muted">提交于 {formatAiaOATime(task.submittedAt)}</span>
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
            <div className="border aia-border-rule p-4 text-sm">
              <p className="aia-text-muted text-xs">处理意见</p>
              <p className="mt-1 whitespace-pre-wrap">{task.taskComment}</p>
            </div>
          ) : null}
          {task.taskStatus === "pending" ? (
            <Button asChild><Link href="/services/oa/approvals">前往审批处理台</Link></Button>
          ) : null}
        </>
      )}
    </div>
  )
}
