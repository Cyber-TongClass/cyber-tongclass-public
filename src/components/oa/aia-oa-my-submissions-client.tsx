"use client"

import { useState } from "react"
import Link from "next/link"

import { AiaOAAuthLoading, AiaOAListOverflowButton, AiaOALoginRequired, AiaOAReviewStatusBadge, formatAiaOATime } from "@/components/oa/aia-oa-shared"
import { useMyOAFormSubmissions, usePublishedOAForms } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import type { OAForm, OAFormSubmission } from "@/types"

/** Current-account submission history; it deliberately does not render user identifiers or contact details. */
export function AiaOAMySubmissionsClient({ maxVisible }: { maxVisible?: number }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <AiaOAAuthLoading />
  }

  if (!isAuthenticated) {
    return <AiaOALoginRequired nextPath="/services/oa/my" action="查看自己的 OA 提交记录" />
  }

  return <AiaOAMySubmissionsAuthenticated maxVisible={maxVisible} />
}

function AiaOAMySubmissionsAuthenticated({ maxVisible }: { maxVisible?: number }) {
  const submissions = useMyOAFormSubmissions() as OAFormSubmission[] | undefined
  const forms = usePublishedOAForms({ includePast: true }) as OAForm[] | undefined
  const [expanded, setExpanded] = useState(false)

  if (submissions === undefined) {
    return (
      <p role="status" className="aia-text-muted py-6 text-sm">
        正在加载我的提交…
      </p>
    )
  }

  if (submissions.length === 0) {
    return <p className="aia-text-muted py-6 text-sm">暂无 OA 提交记录。</p>
  }

  const ordinalFor = (submission: OAFormSubmission) => {
    const sameForm = submissions.filter((item) => item.formId === submission.formId)
      .sort((left, right) => left.submittedAt - right.submittedAt || left._id.localeCompare(right._id))
    return sameForm.findIndex((item) => item._id === submission._id) + 1
  }

  const titleFor = (submission: OAFormSubmission) => (
    submission.formTitle
    || submission.formSnapshot?.title
    || forms?.find((form) => form._id === submission.formId || form.slug === submission.formSlug)?.title
    || "OA 事项"
  )

  const capped = typeof maxVisible === "number" && !expanded && submissions.length > maxVisible
  const visibleSubmissions = capped ? submissions.slice(0, maxVisible) : submissions

  return (
    <div>
      <ul className="divide-y divide-[hsl(var(--aia-rule))]">
        {visibleSubmissions.map((submission) => (
          <li key={submission._id}>
            <Link
              href={`/services/oa/submissions/${encodeURIComponent(submission._id)}`}
              className="aia-focus group flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3"
            >
              <span className="min-w-0 flex-1 font-medium text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
                {titleFor(submission)}的第 {ordinalFor(submission)} 次提交
                <span className="aia-text-muted ml-2 text-xs">提交于 {formatAiaOATime(submission.submittedAt)}</span>
                {submission.adminNote ? (
                  <span className="aia-text-muted mt-0.5 block text-xs leading-5">处理意见：{submission.adminNote}</span>
                ) : null}
              </span>
              <AiaOAReviewStatusBadge status={submission.reviewStatus} />
            </Link>
          </li>
        ))}
      </ul>
      {typeof maxVisible === "number" && submissions.length > maxVisible ? (
        <div className="border-t aia-border-rule pt-3">
          <AiaOAListOverflowButton
            expanded={expanded}
            remaining={submissions.length - maxVisible}
            onToggle={() => setExpanded((current) => !current)}
          />
        </div>
      ) : null}
    </div>
  )
}
