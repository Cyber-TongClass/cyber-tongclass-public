"use client"

import Link from "next/link"
import { CalendarDays, ExternalLink, MapPin } from "lucide-react"

import { ContentReviewStatus } from "@/components/class-work/content-review-status"
import { ContentReviewDecisionPanel } from "@/components/class-work/content-review-decision-panel"
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer"
import {
  useContentSubmissionDetail,
  useMyContentPermissions,
  type ContentReviewCategory,
  type ContentSubmission,
} from "@/lib/api"

const labels = {
  news: { noun: "新闻", back: "新闻审核台" },
  events: { noun: "活动", back: "活动审核台" },
} as const

function formatTime(value: number) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "long", timeStyle: "short" }).format(new Date(value))
}

function ScopeSummary({ scope }: { scope?: Record<string, unknown> }) {
  const values = scope ? Object.values(scope).filter(Array.isArray).flat() : []
  return (
    <p className="aia-text-muted text-sm leading-6">
      {values.length > 0 ? `已选择 ${values.length} 个可见范围条件（任一匹配即可查看）` : "研究院全体成员可见"}
    </p>
  )
}

function SubmissionBody({ submission }: { submission: ContentSubmission }) {
  const payload = submission.payload
  return (
    <>
      {submission.category === "events" ? (
        <div className="mt-7 grid gap-3 border-y aia-border-rule py-4 text-sm sm:grid-cols-2">
          <p className="flex items-center gap-2 text-[hsl(var(--aia-ink))]">
            <CalendarDays className="h-4 w-4 text-[hsl(var(--aia-red))]" aria-hidden="true" />
            {payload.date || "日期待定"} {payload.time || ""}
            {payload.endDate ? ` — ${payload.endDate} ${payload.endTime || ""}` : ""}
          </p>
          <p className="flex items-center gap-2 text-[hsl(var(--aia-ink))]">
            <MapPin className="h-4 w-4 text-[hsl(var(--aia-red))]" aria-hidden="true" />
            {payload.location || "地点待定"}
          </p>
        </div>
      ) : null}

      <section aria-labelledby="submission-content-title" className="mt-9">
        <h2 id="submission-content-title" className="aia-serif text-xl font-semibold text-[hsl(var(--aia-ink))]">
          {submission.category === "news" ? "新闻正文" : "活动说明"}
        </h2>
        <div className="mt-4 border-t aia-border-rule pt-4">
          <MarkdownRenderer
            content={submission.category === "news" ? payload.content || "" : payload.description || ""}
            className="[&_p]:text-[hsl(var(--aia-ink))]"
          />
        </div>
      </section>

      {(payload.sourceUrl || payload.url) ? (
        <a
          href={payload.sourceUrl || payload.url}
          target="_blank"
          rel="noreferrer"
          className="aia-link aia-focus mt-6 inline-flex items-center text-sm font-medium"
        >
          打开相关链接<ExternalLink className="ml-1 h-4 w-4" aria-hidden="true" />
        </a>
      ) : null}
    </>
  )
}

function SubmissionResult({ submission, category, canManage }: {
  submission?: ContentSubmission
  category: ContentReviewCategory
  canManage: boolean
}) {
  const copy = labels[category]
  if (!submission) {
    return (
      <div className="border-b aia-border-rule py-12">
        <h2 className="aia-serif text-xl font-semibold text-[hsl(var(--aia-ink))]">没有找到这份提交</h2>
        <p className="aia-text-muted mt-2 text-sm leading-6">它可能已被移除，或不在你的可访问范围内。</p>
        <Link href={canManage ? `/class-work/${category}/manage` : `/class-work/${category}/new`} className="aia-link aia-focus mt-4 inline-block text-sm font-medium">
          {canManage ? `返回${copy.back}` : `创建${copy.noun}`}
        </Link>
      </div>
    )
  }

  const workflowStage = submission.workflowStage ?? "publication_approval"
  const myTask = submission.myTaskId
    ? submission.tasks?.find((task) => task._id === submission.myTaskId)
    : undefined
  const decisionSubmission: ContentSubmission = {
    ...submission,
    workflowStage,
    canReview: canManage
      && submission.status === "pending"
      && workflowStage === "publication_approval"
      && (!myTask || myTask.status === "pending"),
  }

  return (
    <article>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <p className="aia-mono text-xs uppercase tracking-[0.14em] text-[hsl(var(--aia-red))]">
            {copy.noun}提交 · {submission.creatorName}
          </p>
          <h1 className="aia-serif mt-4 text-3xl font-semibold leading-tight tracking-tight text-[hsl(var(--aia-ink))] sm:text-4xl">{submission.title}</h1>
          <p className="aia-text-muted mt-3 text-sm">提交于 {formatTime(submission.createdAt)}</p>
          <SubmissionBody submission={submission} />
        </div>

        <aside className="border-t aia-border-rule pt-5 lg:sticky lg:top-24 lg:self-start">
          <h2 className="aia-serif text-xl font-semibold text-[hsl(var(--aia-ink))]">审核流程</h2>
          <div className="mt-4"><ContentReviewStatus submission={submission} /></div>
          <section className="mt-7 border-t aia-border-rule pt-5" aria-labelledby="content-decision-title">
            <h2 id="content-decision-title" className="aia-serif text-xl font-semibold text-[hsl(var(--aia-ink))]">我的抉择</h2>
            <ContentReviewDecisionPanel submission={decisionSubmission} />
          </section>
          <div className="mt-7 border-t aia-border-rule pt-5">
            <p className="aia-mono text-xs font-semibold uppercase tracking-[0.12em] aia-text-muted">发布后可见范围</p>
            <div className="mt-2"><ScopeSummary scope={submission.targetScope} /></div>
          </div>
          <Link href={canManage ? `/class-work/${category}/manage` : "/portal/list"} className="aia-link aia-focus mt-6 inline-block text-sm font-medium">
            ← {canManage ? `返回${copy.back}` : "返回班级工作"}
          </Link>
        </aside>
      </div>
    </article>
  )
}

export function ContentSubmissionDetail({ category, id }: { category: ContentReviewCategory; id: string }) {
  const submission = useContentSubmissionDetail(category, id)
  const permissions = useMyContentPermissions()
  if (submission === undefined || permissions === undefined) {
    return <p role="status" className="aia-text-muted py-12 text-sm">正在加载提交详情…</p>
  }
  return (
    <SubmissionResult
      submission={submission || undefined}
      category={category}
      canManage={permissions[category]?.canManage === true}
    />
  )
}
