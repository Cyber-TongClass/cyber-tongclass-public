"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { AiaOAApprovalInboxClient } from "@/components/oa/aia-oa-approval-inbox-client"
import { AiaOAMySubmissionsClient } from "@/components/oa/aia-oa-my-submissions-client"
import { AiaOAAuthLoading, AiaOALoginRequired } from "@/components/oa/aia-oa-shared"
import { usePublishedOAForms } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { splitOAFormsByCollectionStatus } from "@/lib/oa-forms"
import type { OAForm } from "@/types"

/** Legacy section routes redirect into the matching workspace anchors below. */
const OA_SECTION_ROUTES = { mine: "/services/oa/my", approvals: "/services/oa/approvals" } as const

function formatDate(value?: number) {
  if (!value || !Number.isFinite(value)) return null
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value))
}

function WorkspaceHeader({
  headingId,
  kicker,
  title,
  count,
}: {
  headingId: string
  kicker: string
  title: string
  count?: number
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b aia-border-rule pb-2">
      <h2 id={headingId} className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
        <span className="aia-kicker mr-3">{kicker}</span>
        {title}
      </h2>
      {typeof count === "number" ? <span className="aia-mono aia-text-muted text-xs">{count} 项</span> : null}
    </div>
  )
}

function OAFormRow({ form, past = false }: { form: OAForm; past?: boolean }) {
  const deadline = formatDate(form.closeAt)
  const kindLabel = form.kind === "reimbursement" ? "报销" : "申请 / 填报"

  return (
    <li>
      <Link
        href={`/services/oa/${encodeURIComponent(form.slug)}`}
        className="aia-focus group flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3"
      >
        <span className="aia-mono aia-bg-tag px-1.5 py-0.5 text-[11px] tracking-wider">{kindLabel}</span>
        <span className="min-w-0 flex-1 font-medium text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
          {form.title}
          {form.category ? <span className="aia-text-muted ml-2 text-xs">{form.category}</span> : null}
        </span>
        <span className="aia-text-muted text-xs">
          {deadline ? (past ? `结束于 ${deadline}` : `截止 ${deadline}`) : past ? "已结束" : "持续开放"}
        </span>
        <span className={past ? "aia-text-muted text-xs" : "text-xs font-medium text-[hsl(var(--aia-red))]"}>
          {past ? "已结束" : "开放中"}
        </span>
        <ArrowRight
          className="h-3.5 w-3.5 self-center text-[hsl(var(--aia-rule))] transition-colors group-hover:text-[hsl(var(--aia-red))]"
          aria-hidden="true"
        />
      </Link>
    </li>
  )
}

/** Unified OA workspace: forms, own submissions and the approval inbox share one dense surface. */
export function AiaOAFormListClient() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <AiaOAAuthLoading />
  }

  if (!isAuthenticated) {
    return <AiaOALoginRequired nextPath="/services/oa" action="查看面向院内账户开放的 OA 事项" />
  }

  return <AiaOAWorkspace />
}

function AiaOAWorkspace() {
  const forms = usePublishedOAForms({ includePast: true }) as OAForm[] | undefined
  const grouped = forms === undefined ? null : splitOAFormsByCollectionStatus(forms, Date.now())

  return (
    <div className="space-y-12">
      <section id="oa-forms" aria-labelledby="aia-oa-forms-heading">
        <WorkspaceHeader headingId="aia-oa-forms-heading" kicker="事项 · Forms" title="事项办理" count={forms?.length} />
        {forms === undefined || grouped === null ? (
          <p role="status" className="aia-text-muted py-6 text-sm">
            正在加载 OA 事项…
          </p>
        ) : forms.length === 0 ? (
          <p className="aia-text-muted py-6 text-sm">当前没有可办理的 OA 事项；事项可能尚未开放、已截止，或不在当前账户的办理范围内。</p>
        ) : (
          <ul className="divide-y divide-[hsl(var(--aia-rule))]">
            {(grouped.collecting as OAForm[]).map((form) => (
              <OAFormRow key={form._id} form={form} />
            ))}
            {(grouped.past as OAForm[]).map((form) => (
              <OAFormRow key={form._id} form={form} past />
            ))}
          </ul>
        )}
      </section>

      <section id="oa-my" aria-labelledby="aia-oa-my-heading" data-legacy-route={OA_SECTION_ROUTES.mine}>
        <WorkspaceHeader headingId="aia-oa-my-heading" kicker="提交 · Submissions" title="我的提交" />
        <AiaOAMySubmissionsClient />
      </section>

      <section id="oa-approvals" aria-labelledby="aia-oa-approvals-heading" data-legacy-route={OA_SECTION_ROUTES.approvals}>
        <WorkspaceHeader headingId="aia-oa-approvals-heading" kicker="审批 · Approvals" title="审批处理台" />
        <AiaOAApprovalInboxClient />
      </section>
    </div>
  )
}
