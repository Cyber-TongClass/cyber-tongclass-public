"use client"

import Link from "next/link"
import { ArrowLeft, Archive, ClipboardList, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { usePublishedOAForms } from "@/lib/api"
import { splitOAFormsByCollectionStatus } from "@/lib/oa-forms"
import type { OAForm } from "@/types"

function formatDate(value?: number) {
  if (!value) return null
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value))
}

function FormListSection({ title, emptyText, forms, isPast = false }: { title: string; emptyText: string; forms: OAForm[]; isPast?: boolean }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      {forms.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-slate-500">{emptyText}</CardContent></Card>
      ) : (
        <div className="divide-y rounded-xl border bg-white shadow-sm">
          {forms.map((form) => (
            <Link key={form._id} href={`/intranet/forms/${form.slug}`} className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-950">{form.title}</span>
                  <Badge variant="outline">{form.category}</Badge>
                  {isPast ? <Badge variant="secondary" className="gap-1"><Archive className="h-3 w-3" />过去</Badge> : null}
                </div>
                <p className="line-clamp-1 text-sm text-slate-500">{form.description || "点击查看表单内容。"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                {form.closeAt ? <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />截止 {formatDate(form.closeAt)}</span> : <span>{isPast ? "已归档" : "开放中"}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

export default function IntranetFormsPage() {
  const forms = usePublishedOAForms({ kind: "form", includePast: true }) as OAForm[] | undefined
  const grouped = forms ? splitOAFormsByCollectionStatus(forms, Date.now()) : null

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)]">
      <section className="bg-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative">
          <div className="absolute left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 text-[4rem] md:text-[7rem] lg:text-[9rem] font-extrabold uppercase tracking-[0.15em] text-white/5 select-none pointer-events-none whitespace-nowrap leading-none">FORMS</div>
          <Link href="/intranet" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white mb-4 transition-colors"><ArrowLeft className="h-4 w-4" />返回内网</Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">OA 填报</h1>
              <p className="text-lg text-white/70 max-w-2xl mt-2">正在发布的问卷、申请、报销和奖学金填报入口。</p>
            </div>
            <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white hover:text-primary">
              <Link href="/intranet/forms/submissions"><ClipboardList className="mr-2 h-4 w-4" />我的提交</Link>
            </Button>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {forms === undefined ? (
          <Card><CardContent className="py-10 text-center text-sm text-slate-500">Loading...</CardContent></Card>
        ) : !grouped || (grouped.collecting.length === 0 && grouped.past.length === 0) ? (
          <Card><CardContent className="py-10 text-center text-sm text-slate-500">暂无 OA 表单。</CardContent></Card>
        ) : (
          <div className="space-y-8">
            <FormListSection title="正在收集的表单" emptyText="暂无正在收集的表单。" forms={grouped.collecting as OAForm[]} />
            <FormListSection title="过去的表单" emptyText="暂无过去的表单。" forms={grouped.past as OAForm[]} isPast />
          </div>
        )}
      </main>
    </div>
  )
}
