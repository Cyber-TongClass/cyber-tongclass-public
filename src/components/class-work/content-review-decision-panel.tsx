"use client"

import { useState } from "react"
import { Check, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useReviewContentSubmission, type ContentSubmission } from "@/lib/api"
import { resolveMyContentReviewTask } from "@/components/class-work/content-review-task"

type Decision = "approved" | "rejected"

export function ContentReviewDecisionPanel({
  submission,
  onComplete,
}: {
  submission: ContentSubmission
  onComplete?: (decision: Decision) => void
}) {
  const review = useReviewContentSubmission()
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState<Decision | null>(null)
  const [error, setError] = useState("")
  const myTask = resolveMyContentReviewTask(submission.tasks, submission.myTaskId)
  const myTaskId = myTask?._id ?? submission.myTaskId

  async function decide(decision: "approved" | "rejected") {
    if (busy) return
    const normalizedComment = comment.trim()
    if (decision === "rejected" && !normalizedComment) {
      setError("未通过时必须填写审核意见。")
      return
    }
    setBusy(decision)
    setError("")
    try {
      await review({
        id: submission._id,
        ...(myTaskId ? { taskId: myTaskId } : {}),
        decision,
        ...(normalizedComment ? { comment: normalizedComment } : {}),
      })
      setComment("")
      onComplete?.(decision)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "审核失败，请稍后重试。")
    } finally {
      setBusy(null)
    }
  }

  if (submission.canReview !== true) {
    const reason = submission.workflowStage === "source_review"
      ? "来源审阅需在新闻来源审阅台处理。"
      : submission.status !== "pending"
        ? "该提交已完成审核。"
        : myTask && (myTask.status ?? "pending") !== "pending"
          ? "你的审核任务已经结束，无需重复操作。"
          : "你当前没有处理这份提交的审核资格，仅可查看进度。"
    return <p role="status" className="aia-text-muted mt-3 text-sm leading-6">{reason}</p>
  }

  return (
    <div className="mt-4">
      <label htmlFor={`review-comment-${submission._id}`} className="aia-mono text-xs font-semibold uppercase tracking-[0.12em] aia-text-muted">
        审核意见
      </label>
      <Textarea
        id={`review-comment-${submission._id}`}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="同意时可选；未通过时必填"
        className="mt-2 min-h-24 rounded-none border-x-0 border-t-0 bg-transparent px-0"
        disabled={busy !== null}
      />
      {error ? <p role="alert" className="mt-3 text-sm text-[hsl(var(--aia-red))]">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="rounded-none" disabled={busy !== null} onClick={() => void decide("rejected")}>
          <X className="mr-2 h-4 w-4" aria-hidden="true" />{busy === "rejected" ? "正在提交…" : "不通过"}
        </Button>
        <Button type="button" className="rounded-none bg-[hsl(var(--aia-red))] hover:bg-[hsl(var(--aia-red-deep))]" disabled={busy !== null} onClick={() => void decide("approved")}>
          <Check className="mr-2 h-4 w-4" aria-hidden="true" />{busy === "approved" ? "正在提交…" : "同意"}
        </Button>
      </div>
    </div>
  )
}
