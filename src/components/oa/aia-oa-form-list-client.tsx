"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, Award, ChevronDown, ChevronRight, Pin, Receipt, Search } from "lucide-react"

import { AiaOAApprovalInboxClient } from "@/components/oa/aia-oa-approval-inbox-client"
import { AiaOAMySubmissionsClient } from "@/components/oa/aia-oa-my-submissions-client"
import { AiaOAAuthLoading, AiaOAListOverflowButton, AiaOALoginRequired } from "@/components/oa/aia-oa-shared"
import { useMyOAFormSubmissions, useOAApprovalInbox, usePublishedOAForms } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { splitOAFormsByCollectionStatus } from "@/lib/oa-forms"
import { cn } from "@/lib/utils"
import type { OAForm } from "@/types"

/** Each list caps at ten entries; the rest unfolds inline. */
const WORKSPACE_LIST_CAP = 10

type WorkspaceTab = "forms" | "mine" | "approvals"

/** Legacy section routes redirect into these hashes; each hash selects a tab. */
const TAB_HASH: Record<WorkspaceTab, string> = {
  forms: "oa-forms",
  mine: "oa-my",
  approvals: "oa-approvals",
}

function tabFromHash(hash: string): WorkspaceTab {
  if (hash === `#${TAB_HASH.mine}`) return "mine"
  if (hash === `#${TAB_HASH.approvals}`) return "approvals"
  return "forms"
}

function formatDate(value?: number) {
  if (!value || !Number.isFinite(value)) return null
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value))
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

function ColumnHeading({ icon, title, count }: { icon?: ReactNode; title: string; count: number }) {
  return (
    <h3 className="flex items-baseline gap-2 border-b aia-border-rule pb-2">
      {icon}
      <span className="aia-serif text-base font-semibold tracking-tight text-[hsl(var(--aia-ink))]">{title}</span>
      <span className="aia-mono text-xs aia-text-muted">{count} 项</span>
    </h3>
  )
}

function FixedReimbursementEntry({ customFormCount }: { customFormCount: number }) {
  return (
    <div className="mt-8">
      <Link
        href="/services/oa/reimbursements"
        className="aia-focus group flex items-baseline gap-3 border-b aia-border-rule py-3"
      >
        <Receipt className="h-4 w-4 self-center text-[hsl(var(--aia-red))]" aria-hidden="true" />
        <span className="aia-serif min-w-0 flex-1 text-base font-semibold tracking-tight text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
          报销
        </span>
        <span className="aia-mono text-xs aia-text-muted">
          学术交流{customFormCount > 0 ? ` · ${customFormCount} 个自定义表单` : ""}
        </span>
        <ArrowRight
          className="h-3.5 w-3.5 self-center text-[hsl(var(--aia-rule))] transition-colors group-hover:text-[hsl(var(--aia-red))]"
          aria-hidden="true"
        />
      </Link>
    </div>
  )
}

function FixedTeacherRecognitionEntry() {
  return (
    <div className="mt-3">
      <Link href="/services/teacher-recognitions" className="aia-focus group flex items-baseline gap-3 border-b aia-border-rule py-3">
        <Award className="h-4 w-4 self-center text-[hsl(var(--aia-red))]" aria-hidden="true" />
        <span className="aia-serif min-w-0 flex-1 text-base font-semibold tracking-tight transition-colors group-hover:text-[hsl(var(--aia-red))]">教师奖励申报</span>
        <span className="aia-mono text-xs aia-text-muted">教师专属</span>
        <ArrowRight className="h-3.5 w-3.5 self-center text-[hsl(var(--aia-rule))] group-hover:text-[hsl(var(--aia-red))]" aria-hidden="true" />
      </Link>
    </div>
  )
}

/** Forms tab: admin-pinned forms versus the rest, behind a search box and a category filter. */
function FormsPanel({ forms }: { forms: OAForm[] }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [restExpanded, setRestExpanded] = useState(false)
  const [pastOpen, setPastOpen] = useState(false)

  const standardForms = useMemo(() => forms.filter((form) => form.kind !== "reimbursement"), [forms])
  const customReimbursementCount = splitOAFormsByCollectionStatus(
    forms.filter((form) => form.kind === "reimbursement"),
    Date.now(),
  ).collecting.length
  const categories = useMemo(
    () => [...new Set(standardForms.map((form) => form.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN")),
    [standardForms],
  )

  const grouped = useMemo(() => splitOAFormsByCollectionStatus(standardForms, Date.now()), [standardForms])

  const matches = (form: OAForm) => {
    if (category !== "all" && form.category !== category) return false
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return [form.title, form.description, form.category]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(needle))
  }

  const collecting = grouped.collecting as OAForm[]
  const pinned = collecting
    .filter((form) => form.pinnedAt && matches(form))
    .sort((a, b) => (a.pinnedAt ?? 0) - (b.pinnedAt ?? 0))
  const rest = collecting.filter((form) => !form.pinnedAt && matches(form))
  const past = (grouped.past as OAForm[]).filter(matches)
  const visibleRest = restExpanded ? rest : rest.slice(0, WORKSPACE_LIST_CAP)
  const filtering = query.trim() !== "" || category !== "all"

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">搜索事项</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 aia-text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索事项标题、说明或类别…"
            className="aia-focus w-full border aia-border-rule bg-transparent py-2 pl-9 pr-3 text-sm text-[hsl(var(--aia-ink))] placeholder:text-[hsl(var(--aia-muted))]"
          />
        </label>
        <label className="flex items-center gap-2 sm:w-56">
          <span className="aia-mono shrink-0 text-xs uppercase tracking-[0.12em] aia-text-muted">类别</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="aia-focus w-full border aia-border-rule bg-transparent px-2 py-2 text-sm text-[hsl(var(--aia-ink))]"
          >
            <option value="all">全部类别</option>
            {categories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <section aria-label="置顶事项">
          <ColumnHeading
            icon={<Pin className="h-3.5 w-3.5 self-center text-[hsl(var(--aia-red))]" aria-hidden="true" />}
            title="置顶事项"
            count={pinned.length}
          />
          {pinned.length === 0 ? (
            <p className="aia-text-muted py-4 text-sm">
              {filtering ? "没有符合条件的置顶事项。" : "暂无置顶事项；管理员可在表单管理中置顶。"}
            </p>
          ) : (
            <ul className="divide-y divide-[hsl(var(--aia-rule))]">
              {pinned.map((form) => (
                <OAFormRow key={form._id} form={form} />
              ))}
            </ul>
          )}
          <FixedReimbursementEntry customFormCount={customReimbursementCount} />
          <FixedTeacherRecognitionEntry />
        </section>

        <section aria-label="其他事项">
          <ColumnHeading title="其他事项" count={rest.length} />
          {rest.length === 0 ? (
            <p className="aia-text-muted py-4 text-sm">
              {filtering ? "没有符合条件的事项，试试调整搜索或类别。" : "当前没有更多开放中的事项。"}
            </p>
          ) : (
            <>
              <ul className="divide-y divide-[hsl(var(--aia-rule))]">
                {visibleRest.map((form) => (
                  <OAFormRow key={form._id} form={form} />
                ))}
              </ul>
              {rest.length > WORKSPACE_LIST_CAP ? (
                <div className="border-t aia-border-rule pt-3">
                  <AiaOAListOverflowButton
                    expanded={restExpanded}
                    remaining={rest.length - WORKSPACE_LIST_CAP}
                    onToggle={() => setRestExpanded((current) => !current)}
                  />
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>

      {past.length > 0 || (!filtering && (grouped.past as OAForm[]).length > 0) ? (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setPastOpen((current) => !current)}
            aria-expanded={pastOpen}
            className="aia-focus aia-mono inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] aia-text-muted transition-colors hover:text-[hsl(var(--aia-red))]"
          >
            {pastOpen ? (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            已结束事项 · {past.length} 项
          </button>
          {pastOpen ? (
            <ul className="mt-1 divide-y divide-[hsl(var(--aia-rule))] opacity-70">
              {past.map((form) => (
                <OAFormRow key={form._id} form={form} past />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** Unified OA workspace: forms, own submissions and the approval inbox share one tabbed surface. */
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
  const submissions = useMyOAFormSubmissions() as unknown[] | undefined
  const inbox = useOAApprovalInbox() as unknown[] | undefined
  const [tab, setTab] = useState<WorkspaceTab>("forms")

  useEffect(() => {
    setTab(tabFromHash(window.location.hash))
    const onHashChange = () => setTab(tabFromHash(window.location.hash))
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  const select = (next: WorkspaceTab) => {
    setTab(next)
    window.history.replaceState(null, "", `#${TAB_HASH[next]}`)
  }

  const collectingCount = forms === undefined
    ? null
    : splitOAFormsByCollectionStatus(forms.filter((form) => form.kind !== "reimbursement"), Date.now()).collecting.length + 1
  const approvalCount = inbox?.length ?? null

  const tabs: { key: WorkspaceTab; kicker: string; title: string; count: number | null; alert?: boolean }[] = [
    { key: "forms", kicker: "事项 · Forms", title: "事项办理", count: collectingCount },
    { key: "mine", kicker: "提交 · Mine", title: "我的提交", count: submissions?.length ?? null },
    { key: "approvals", kicker: "审批 · Approvals", title: "审批处理台", count: approvalCount, alert: (approvalCount ?? 0) > 0 },
  ]

  return (
    <div>
      <div role="tablist" aria-label="OA 工作台分区" className="flex flex-wrap gap-x-8 gap-y-1 border-b aia-border-rule">
        {tabs.map((item) => {
          const active = tab === item.key
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              id={`oa-tab-${item.key}`}
              aria-selected={active}
              aria-controls={TAB_HASH[item.key]}
              onClick={() => select(item.key)}
              className={cn(
                "aia-focus relative flex items-baseline gap-2 pb-2.5 pt-1 text-sm transition-colors",
                active ? "font-semibold text-[hsl(var(--aia-ink))]" : "aia-text-muted hover:text-[hsl(var(--aia-ink))]",
              )}
            >
              <span className="aia-kicker">{item.kicker}</span>
              {item.title}
              {item.count !== null ? (
                <span className="aia-mono text-xs aia-text-muted">{item.count}</span>
              ) : null}
              {item.alert ? (
                <span className="h-1.5 w-1.5 self-center rounded-full bg-[hsl(var(--aia-red))]" aria-label="有待处理审批" />
              ) : null}
              <span
                className={cn(
                  "absolute inset-x-0 -bottom-px h-0.5 transition-colors",
                  active ? "bg-[hsl(var(--aia-red))]" : "bg-transparent",
                )}
                aria-hidden="true"
              />
            </button>
          )
        })}
      </div>

      {/* Panels stay mounted so inbox notes and expand state survive tab switches. */}
      <div id={TAB_HASH.forms} role="tabpanel" aria-labelledby="oa-tab-forms" hidden={tab !== "forms"} className="scroll-mt-32 pt-8">
        {forms === undefined ? (
          <p role="status" className="aia-text-muted py-6 text-sm">
            正在加载 OA 事项…
          </p>
        ) : (
          <FormsPanel forms={forms} />
        )}
      </div>

      <div id={TAB_HASH.mine} role="tabpanel" aria-labelledby="oa-tab-mine" hidden={tab !== "mine"} className="scroll-mt-32 pt-8">
        <AiaOAMySubmissionsClient maxVisible={WORKSPACE_LIST_CAP} />
      </div>

      <div id={TAB_HASH.approvals} role="tabpanel" aria-labelledby="oa-tab-approvals" hidden={tab !== "approvals"} className="scroll-mt-32 pt-8">
        <AiaOAApprovalInboxClient maxVisible={WORKSPACE_LIST_CAP} />
      </div>
    </div>
  )
}
