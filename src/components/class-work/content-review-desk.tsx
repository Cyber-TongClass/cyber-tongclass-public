"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight } from "lucide-react"

import { ContentReviewDecisionPanel } from "@/components/class-work/content-review-decision-panel"
import { ContentReviewStatus } from "@/components/class-work/content-review-status"
import { PublishedContentManager } from "@/components/class-work/published-content-manager"
import {
  useContentReviewQueue,
  useMyContentPermissions,
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
  const [message, setMessage] = useState<string | null>(null)
  const copy = labels[category]

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

                  <div className="mt-5 border-t aia-border-rule pt-4">
                    <ContentReviewDecisionPanel
                      submission={{ ...submission, canReview }}
                      onComplete={(decision) => setMessage(decision === "approved" ? "审核已通过，内容已自动发布。" : "已退回给创建者。")}
                    />
                  </div>
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
