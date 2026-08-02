"use client"

import Link from "next/link"
import { ArrowRight, FilePlus2, FileText, Receipt, ShieldCheck } from "lucide-react"

import { AiaOAAuthLoading, AiaOALoginRequired } from "@/components/oa/aia-oa-shared"
import { useMyContentPermissions, usePublishedOAForms } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import type { OAForm } from "@/types"

type ReimbursementRights = {
  canCreate: boolean
  canManage: boolean
}

type PermissionsWithReimbursement = {
  reimbursement?: ReimbursementRights
}

const academicExchangeEntry = {
  title: "学术交流报销",
  description: "提交学术交流项目支持与报销申请，查看办理进度，并按要求补充材料。",
  href: "/services/oa/reimbursements/academic-exchange",
}

function CustomReimbursementRow({ form }: { form: OAForm }) {
  return (
    <li className="border-b aia-border-rule">
      <Link
        href={`/services/oa/${encodeURIComponent(form.slug)}`}
        className="aia-focus group flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4"
      >
        <span className="aia-mono aia-bg-tag px-1.5 py-0.5 text-[11px] tracking-wider">报销表单</span>
        <span className="aia-serif min-w-0 flex-1 text-base font-semibold tracking-tight text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
          {form.title}
        </span>
        <span className="aia-text-muted text-xs">{form.closeAt ? "限时开放" : "持续开放"}</span>
        <ArrowRight
          className="h-3.5 w-3.5 self-center text-[hsl(var(--aia-rule))] transition-colors group-hover:text-[hsl(var(--aia-red))]"
          aria-hidden="true"
        />
        {form.description ? (
          <span className="aia-text-muted basis-full pl-0 text-sm leading-6 sm:pl-[5.7rem]">{form.description}</span>
        ) : null}
      </Link>
    </li>
  )
}

export function AiaReimbursementWorkspaceClient() {
  const { isAuthenticated, isLoading } = useAuth()
  const forms = usePublishedOAForms({ kind: "reimbursement", includePast: false }) as OAForm[] | undefined
  // Reimbursement is intentionally an optional capability while older backends
  // return only news/events. Absence means no create entry; it never grants access.
  const permissions = useMyContentPermissions() as PermissionsWithReimbursement | undefined
  const canCreateForm = permissions?.reimbursement?.canCreate === true
  const canManageForm = permissions?.reimbursement?.canManage === true

  if (isLoading) return <AiaOAAuthLoading />

  if (!isAuthenticated) {
    return (
      <AiaOALoginRequired
        nextPath="/services/oa/reimbursements"
        action="查看面向院内账户开放的报销事项"
      />
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b aia-border-rule pb-4">
        <div>
          <p className="aia-kicker">固定 OA · Reimbursement</p>
          <h2 className="aia-serif mt-2 text-2xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">报销办理</h2>
          <p className="aia-text-muted mt-2 max-w-2xl text-sm leading-6">
            学术交流使用固定申请；其他报销按已发布的自定义表单办理，提交后统一进入 OA 审批流程。
          </p>
        </div>
        {canCreateForm || canManageForm ? (
          <div className="flex flex-wrap gap-2">
            {canManageForm ? (
              <Link
                href="/services/oa/approvals"
                className="aia-focus inline-flex items-center gap-2 border aia-border-rule px-3 py-2 text-sm font-medium text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                审核报销
              </Link>
            ) : null}
            {canCreateForm ? (
              <>
                <Link
                  href="/forms/manage"
                  className="aia-focus inline-flex items-center gap-2 border aia-border-rule px-3 py-2 text-sm font-medium text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  管理我的报销表单
                </Link>
                <Link
                  href="/forms/manage/reimbursements/new"
                  className="aia-focus inline-flex items-center gap-2 border border-[hsl(var(--aia-red))] px-3 py-2 text-sm font-medium text-[hsl(var(--aia-red))] transition-colors hover:bg-[hsl(var(--aia-red))] hover:text-white"
                >
                  <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                  创建报销表单
                </Link>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <section aria-labelledby="academic-reimbursement-title" className="mt-8">
        <p className="aia-mono text-xs uppercase tracking-[0.12em] aia-text-muted">01 · 固定流程</p>
        <Link
          href={academicExchangeEntry.href}
          className="aia-focus group mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-y aia-border-rule py-4"
        >
          <FileText className="h-4 w-4 self-center text-[hsl(var(--aia-red))]" aria-hidden="true" />
          <span id="academic-reimbursement-title" className="aia-serif min-w-0 flex-1 text-lg font-semibold tracking-tight text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
            {academicExchangeEntry.title}
          </span>
          <span className="aia-mono text-xs text-[hsl(var(--aia-red))]">进入办理</span>
          <ArrowRight className="h-3.5 w-3.5 self-center text-[hsl(var(--aia-red))]" aria-hidden="true" />
          <span className="aia-text-muted basis-full text-sm leading-6 sm:pl-8">{academicExchangeEntry.description}</span>
        </Link>
      </section>

      <section aria-labelledby="custom-reimbursements-title" className="mt-10">
        <div className="flex items-baseline gap-3 border-b aia-border-rule pb-2">
          <Receipt className="h-4 w-4 self-center text-[hsl(var(--aia-red))]" aria-hidden="true" />
          <h3 id="custom-reimbursements-title" className="aia-serif text-lg font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
            自定义报销表单
          </h3>
          <span className="aia-mono text-xs aia-text-muted">{forms?.length ?? "—"} 项</span>
        </div>

        {forms === undefined ? (
          <p role="status" className="aia-text-muted py-6 text-sm">正在加载报销表单…</p>
        ) : forms.length === 0 ? (
          <p className="aia-text-muted py-6 text-sm">当前没有面向你的自定义报销表单。</p>
        ) : (
          <ul>
            {forms.map((form) => <CustomReimbursementRow key={form._id} form={form} />)}
          </ul>
        )}
      </section>
    </div>
  )
}
