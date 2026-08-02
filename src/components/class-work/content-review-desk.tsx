"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, Check, X } from "lucide-react"

import { ContentReviewStatus } from "@/components/class-work/content-review-status"
import { PublishedContentManager } from "@/components/class-work/published-content-manager"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  useContentReviewQueue,
  useMyContentPermissions,
  useReviewContentSubmission,
  type ContentReviewCategory,
  type ContentReviewStatus as ReviewStatus,
  type ContentSubmission,
} from "@/lib/api"
import { cn } from "@/lib/utils"

const labels = {
  news: { noun: "新闻", queue: "新闻审核台" },
  events: { noun: "活动", queue: "活动审核台" },
} as const

type DeskFilter = ReviewStatus | "all"
type QueueSubmission = ContentSubmission & {
  myTaskId?: string
  canReview?: boolean
  tasks?: Array<{
    _id: string
    reviewerName: string
    status: "pending" | "approved" | "rejected" | "skipped"
    comment?: string
    decidedAt?: number
  }>
}

function formatTime(value: number) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

export function ContentReviewDesk({ category }: { category: ContentReviewCategory }) {
  const [filter, setFilter] = useState<DeskFilter>("pending")
  const submissions = useContentReviewQueue(category, filter === "all" ? undefined : filter) as QueueSubmission[] | undefined
  const permissions = useMyContentPermissions()
  const review = useReviewContentSubmission()
  const [comments, setComments] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const copy = labels[category]

  async function decide(submission: QueueSubmission, decision: "approved" | "rejected") {
    if (busyId) return
    const id = submission._id
    const comment = comments[id]?.trim()
    if (decision === "rejected" && !comment) {
      setError("未通过时必须填写审核意见。")
      return
    }
    setBusyId(id)
    setError(null)
    setMessage(null)
    try {
      const request: Parameters<typeof review>[0] & { taskId?: string } = {
        id,
        ...(submission.myTaskId ? { taskId: submission.myTaskId } : {}),
        decision,
        ...(comment ? { comment } : {}),
      }
      await review(request)
      setComments((current) => ({ ...current, [id]: "" }))
      setMessage(decision === "approved" ? "审核已通过，内容已自动发布。" : "已退回给创建者。")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "审核失败，请稍后重试。")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-y aia-border-rule py-3">
        <div className="flex flex-wrap gap-1" aria-label={`${copy.noun}审核状态筛选`}>
          {([
            ["pending", "待审核"],
            ["approved", "已通过"],
            ["rejected", "未通过"],
            ["all", "全部"],
          ] as Array<[DeskFilter, string]>).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "aia-focus aia-mono px-3 py-2 text-xs uppercase tracking-[0.12em] transition-colors",
                filter === value ? "bg-[hsl(var(--aia-ink))] text-white" : "aia-text-muted hover:text-[hsl(var(--aia-red))]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {permissions?.[category]?.canCreate ? (
          <Link href={`/class-work/${category}/new`} className="aia-link aia-focus text-sm font-medium">创建{copy.noun}</Link>
        ) : null}
      </div>

      {message ? <p role="status" className="mt-4 border-y aia-border-rule py-3 text-sm text-[hsl(var(--aia-ink))]">{message}</p> : null}
      {error ? <p role="alert" className="mt-4 border-y aia-border-rule py-3 text-sm text-[hsl(var(--aia-red))]">{error}</p> : null}

      {submissions === undefined ? (
        <p role="status" className="aia-text-muted py-12 text-sm">正在加载{copy.queue}…</p>
      ) : submissions.length === 0 ? (
        <div className="border-b aia-border-rule py-12">
          <p className="aia-serif text-xl font-semibold text-[hsl(var(--aia-ink))]">当前没有{filter === "pending" ? "待审核" : "符合条件的"}{copy.noun}</p>
          <p className="aia-text-muted mt-2 text-sm">新的提交会在创建后自动出现在这里。</p>
        </div>
      ) : (
        <div className="divide-y divide-[hsl(var(--aia-rule))] border-b aia-border-rule">
          {submissions.map((submission, index) => {
            const isPending = submission.status === "pending"
            const myTask = submission.myTaskId
              ? submission.tasks?.find((task) => task._id === submission.myTaskId)
              : undefined
            const canReview = isPending
              && submission.canReview === true
              && (!myTask || myTask.status === "pending")
            return (
              <article key={submission._id} className="py-6 sm:grid sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-5">
                <span className="aia-mono text-xs aia-text-muted">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="aia-mono text-xs uppercase tracking-[0.12em] text-[hsl(var(--aia-red))]">
                        {submission.creatorName} · {formatTime(submission.createdAt)}
                      </p>
                      <h2 className="aia-serif mt-2 text-xl font-semibold leading-snug text-[hsl(var(--aia-ink))]">{submission.title}</h2>
                    </div>
                    <ContentReviewStatus submission={submission} compact />
                  </div>

                  {category === "events" ? (
                    <p className="aia-text-muted mt-3 text-sm">
                      {submission.payload.date || "日期待定"}
                      {submission.payload.time ? ` ${submission.payload.time}` : ""}
                      {submission.payload.location ? ` · ${submission.payload.location}` : ""}
                    </p>
                  ) : (
                    <p className="aia-text-muted mt-3 line-clamp-2 text-sm leading-6">{submission.payload.content || "暂无正文摘要"}</p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <Link href={`/class-work/${category}/submissions/${submission._id}`} className="aia-link aia-focus inline-flex items-center text-sm font-medium">
                      查看完整提交<ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>

                  {canReview ? (
                    <div className="mt-5 grid gap-3 border-t aia-border-rule pt-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                      <div>
                        <label htmlFor={`review-comment-${submission._id}`} className="aia-mono text-xs font-semibold uppercase tracking-[0.12em] aia-text-muted">
                          审核意见
                        </label>
                        <Textarea
                          id={`review-comment-${submission._id}`}
                          value={comments[submission._id] || ""}
                          onChange={(event) => setComments((current) => ({ ...current, [submission._id]: event.target.value }))}
                          placeholder="通过时可选；未通过时必填"
                          className="mt-2 min-h-20 rounded-none border-x-0 border-t-0 bg-transparent px-0"
                          disabled={busyId === submission._id}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" className="rounded-none" disabled={busyId !== null} onClick={() => void decide(submission, "rejected")}>
                          <X className="mr-2 h-4 w-4" aria-hidden="true" />不通过
                        </Button>
                        <Button type="button" className="rounded-none bg-[hsl(var(--aia-red))] hover:bg-[hsl(var(--aia-red-deep))]" disabled={busyId !== null} onClick={() => void decide(submission, "approved")}>
                          <Check className="mr-2 h-4 w-4" aria-hidden="true" />{busyId === submission._id ? "正在提交…" : "同意"}
                        </Button>
                      </div>
                    </div>
                  ) : isPending && myTask ? (
                    <p role="status" className="mt-4 border-y aia-border-rule bg-[hsl(var(--aia-tag))] py-3 text-sm leading-6 text-[hsl(var(--aia-ink))]">
                      该审核已由其他有权限人员处理，无需重复操作。
                    </p>
                  ) : isPending ? (
                    <p role="status" className="aia-text-muted mt-4 border-y aia-border-rule py-3 text-sm leading-6">
                      你当前没有处理这份提交的审核资格，仅可查看进度。
                    </p>
                  ) : submission.reviewComment ? (
                    <p className="aia-text-muted mt-4 border-y aia-border-rule py-3 text-sm leading-6">审核意见：{submission.reviewComment}</p>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
      <PublishedContentManager category={category} />
    </div>
  )
}
