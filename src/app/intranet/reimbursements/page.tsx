"use client"

import Link from "next/link"
import { ArrowLeft, FileText, Hourglass } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const modules = [
  {
    title: "学术交流支持",
    description: "提交学术交流项目支持申请，或查看历史记录。",
    href: "/intranet/reimbursements/academic-exchange",
    icon: FileText,
    enabled: true,
  },
  {
    title: "学生活动报销",
    description: "学生活动相关报销流程正在整理中。",
    href: "#",
    icon: Hourglass,
    enabled: false,
  },
]

export default function IntranetReimbursementsPage() {
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
            通班内部报销与支持申请入口。请勿将内部材料和申请信息分享到公开渠道。
          </p>
        </div>
      </section>

      <section className="bg-[hsl(211,30%,97%)] py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-4 md:grid-cols-2">
          {modules.map((module) => {
            const Icon = module.icon
            const content = (
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5 text-primary" />
                    {module.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-7 text-slate-600">{module.description}</p>
                  {!module.enabled ? (
                    <p className="mt-4 inline-flex rounded-sm border border-dashed border-slate-300 px-3 py-1 text-xs font-medium text-slate-500">
                      Coming Soon
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            )

            return module.enabled ? (
              <Link key={module.title} href={module.href} className="block h-full">
                {content}
              </Link>
            ) : (
              <div key={module.title} className="h-full opacity-80">
                {content}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
