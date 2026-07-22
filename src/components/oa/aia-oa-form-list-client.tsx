"use client"

import Link from "next/link"
import { ArrowRight, ClipboardList, Clock3, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { AiaOAAuthLoading, AiaOALoginRequired } from "@/components/oa/aia-oa-shared"
import { usePublishedOAForms } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { splitOAFormsByCollectionStatus } from "@/lib/oa-forms"
import type { OAForm } from "@/types"

function formatDate(value?: number) {
  if (!value || !Number.isFinite(value)) return null
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value))
}

function FormCard({ form, past = false }: { form: OAForm; past?: boolean }) {
  const deadline = formatDate(form.closeAt)
  const kindLabel = form.kind === "reimbursement" ? "报销" : "申请 / 填报"

  return (
    <Link
      href={`/services/oa/${encodeURIComponent(form.slug)}`}
      className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{kindLabel}</Badge>
            {form.category ? <Badge variant="secondary">{form.category}</Badge> : null}
            {past ? <Badge variant="secondary">已结束</Badge> : <Badge variant="success">开放中</Badge>}
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-950 group-hover:text-primary">{form.title}</h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{form.description || "查看填报要求、提交进度与审核结果。"}</p>
        </div>
        <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
      </div>
      <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        {deadline ? (past ? `结束于 ${deadline}` : `截止 ${deadline}`) : past ? "已结束" : "持续开放"}
      </div>
    </Link>
  )
}

function FormSection({ title, description, forms, past = false }: { title: string; description: string; forms: OAForm[]; past?: boolean }) {
  return (
    <section aria-labelledby={past ? "aia-oa-past-heading" : "aia-oa-open-heading"}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={past ? "aia-oa-past-heading" : "aia-oa-open-heading"} className="text-2xl font-bold tracking-tight text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <span className="text-sm text-slate-500">{forms.length} 项</span>
      </div>
      {forms.length === 0 ? (
        <Card className="mt-4"><CardContent className="py-8 text-center text-sm text-slate-500">{past ? "暂无已结束的 OA 事项。" : "当前没有开放中的 OA 事项。"}</CardContent></Card>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {forms.map((form) => <FormCard key={form._id} form={form} past={past} />)}
        </div>
      )}
    </section>
  )
}

/** AIA OA entry point. Data access stays in the session-aware API wrapper. */
export function AiaOAFormListClient() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <AiaOAAuthLoading />
  }

  if (!isAuthenticated) {
    return <AiaOALoginRequired nextPath="/services/oa" action="查看面向院内账户开放的 OA 事项" />
  }

  return <AiaOAFormListAuthenticated />
}

function AiaOAFormListAuthenticated() {
  const forms = usePublishedOAForms({ includePast: true }) as OAForm[] | undefined

  if (forms === undefined) {
    return <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600" role="status">正在加载 OA 事项…</p>
  }

  const grouped = splitOAFormsByCollectionStatus(forms, Date.now())

  return (
    <div className="space-y-10">
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/services/oa/my"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="mt-3 font-semibold text-slate-950">我的提交</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">查看当前账户的提交记录、审核状态和处理意见。</p>
        </Link>
        <Link
          href="/services/oa/approvals"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="mt-3 font-semibold text-slate-950">审批处理台</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">获授审批权限的账户可处理分配给自己的 OA 事项。</p>
        </Link>
      </div>

      <FormSection title="正在办理" description="可在开放期内提交或补充的研究院 OA 事项。" forms={grouped.collecting as OAForm[]} />
      <FormSection title="历史事项" description="已结束收集的 OA 事项仍可查看自己的提交状态。" forms={grouped.past as OAForm[]} past />
    </div>
  )
}
