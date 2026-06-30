"use client"

import Link from "next/link"
import { ArrowLeft, ClipboardList, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usePublishedOAForms } from "@/lib/api"
import type { OAForm } from "@/types"

const staticModules = [
  {
    title: "学术交流支持",
    description: "提交学术交流项目支持申请，或查看历史记录。",
    href: "/intranet/reimbursements/academic-exchange",
    icon: FileText,
  },
]

export default function IntranetReimbursementsPage() {
  const reimbursementForms = usePublishedOAForms({ kind: "reimbursement" }) as OAForm[] | undefined

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative">
          <div className="absolute left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 text-[4rem] md:text-[7rem] lg:text-[9rem] font-extrabold uppercase tracking-[0.15em] text-white/5 select-none pointer-events-none whitespace-nowrap leading-none">
            REIMBURSE
          </div>
          <Link href="/intranet" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            返回内网
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">报销</h1>
          <p className="text-lg text-white/70 max-w-2xl mt-2">
            报销是基于 OA 表单的专用流程，支持明细、票据上传、审核和补材料。
          </p>
        </div>
      </section>

      <section className="bg-[hsl(211,30%,97%)] py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-4 md:grid-cols-2">
          {staticModules.map((module) => {
            const Icon = module.icon
            return (
              <Link key={module.title} href={module.href} className="block h-full">
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><Icon className="h-5 w-5 text-primary" />{module.title}</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm leading-7 text-slate-600">{module.description}</p></CardContent>
                </Card>
              </Link>
            )
          })}

          {reimbursementForms?.map((form) => (
            <Link key={form._id} href={`/intranet/forms/${form.slug}`} className="block h-full">
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><ClipboardList className="h-5 w-5 text-primary" />{form.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-7 text-slate-600">{form.description || "进入报销填报页面。"}</p>
                  <p className="mt-4 inline-flex rounded-sm bg-primary/10 px-3 py-1 text-xs font-medium text-primary">报销表单</p>
                </CardContent>
              </Card>
            </Link>
          ))}

          {reimbursementForms === undefined ? (
            <Card className="h-full"><CardContent className="py-10 text-center text-sm text-slate-500">Loading...</CardContent></Card>
          ) : null}
        </div>
      </section>
    </div>
  )
}
