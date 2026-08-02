import { Check, Clock3, GitBranch, X } from "lucide-react"

import type { ContentSubmission, ContentReviewStatus } from "@/lib/api"
import { cn } from "@/lib/utils"

type ReviewTask = {
  _id?: string
  reviewerName?: string
  status?: "pending" | "approved" | "rejected" | "skipped"
  decision?: "approved" | "rejected"
  comment?: string
  actedAt?: number
  decidedAt?: number
}

type SubmissionWithTasks = ContentSubmission & {
  tasks?: ReviewTask[]
  reviewTasks?: ReviewTask[]
  reviewerCount?: number
}

const statusPresentation: Record<ContentReviewStatus, { label: string; className: string; icon: typeof Clock3 }> = {
  pending: {
    label: "等待审核",
    className: "aia-border-rule bg-[hsl(var(--aia-tag))] text-[hsl(var(--aia-ink))]",
    icon: Clock3,
  },
  approved: {
    label: "已通过",
    className: "border-[hsl(var(--aia-ink))] bg-[hsl(var(--aia-ink))] text-[hsl(var(--aia-paper))]",
    icon: Check,
  },
  rejected: {
    label: "未通过",
    className: "border-[hsl(var(--aia-red))] bg-[hsl(var(--aia-paper))] text-[hsl(var(--aia-red))]",
    icon: X,
  },
}

export function ContentReviewStatus({ submission, compact = false }: {
  submission: SubmissionWithTasks
  compact?: boolean
}) {
  const presentation = statusPresentation[submission.status] || statusPresentation.pending
  const Icon = presentation.icon
  // `tasks` is the current server contract; `reviewTasks` keeps drafts created
  // against the first Phase 2 contract readable during a rolling deployment.
  const reviewTasks = submission.tasks || submission.reviewTasks || []
  const activeReviewTasks = reviewTasks.filter((task) => (task.decision || task.status) !== "skipped")
  const expectedCount = activeReviewTasks.length || submission.reviewerCount || reviewTasks.length

  return (
    <div className={cn(!compact && "border-y aia-border-rule py-4")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn(
          "aia-mono inline-flex items-center gap-1.5 border px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em]",
          presentation.className,
        )}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {presentation.label}
        </span>
        {expectedCount > 1 ? (
          <span className="aia-mono inline-flex items-center gap-1 text-xs aia-text-muted">
            <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
            任一审核人处理即可 · 共 {expectedCount} 人
          </span>
        ) : null}
      </div>

      {!compact && reviewTasks.length > 0 ? (
        <ol className="mt-4 divide-y divide-[hsl(var(--aia-rule))] border-y aia-border-rule">
          {reviewTasks.map((task, index) => {
            const decision = task.decision || task.status || "pending"
            return (
              <li key={task._id || `${task.reviewerName || "reviewer"}-${index}`} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:items-baseline">
                <div>
                  <p className="aia-serif font-semibold text-[hsl(var(--aia-ink))]">{task.reviewerName || `审核人 ${index + 1}`}</p>
                  {task.comment ? <p className="aia-text-muted mt-1 text-sm leading-6">{task.comment}</p> : null}
                </div>
                <span className="aia-mono text-xs uppercase tracking-[0.1em] aia-text-muted">
                  {decision === "approved" ? "已同意" : decision === "rejected" ? "已拒绝" : decision === "skipped" ? "流程已结束，无需处理" : "待处理"}
                </span>
              </li>
            )
          })}
        </ol>
      ) : null}

      {!compact && submission.reviewComment ? (
        <p className="mt-4 text-sm leading-6 text-[hsl(var(--aia-ink))]">
          <span className="aia-mono mr-2 text-xs uppercase tracking-[0.1em] aia-text-muted">审核意见</span>
          {submission.reviewComment}
        </p>
      ) : null}
    </div>
  )
}
