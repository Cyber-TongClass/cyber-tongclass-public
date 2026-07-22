import Link from "next/link"
import { ArrowRight, Building2 } from "lucide-react"
import { InstituteDirectoryPreview } from "@/components/institute/institute-directory-preview"

export default function InstitutePage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-[hsl(211,54%,24%)] py-16 text-white sm:py-20">
        <div className="container-custom max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">Institute</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">研究院概览</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-sky-50/90 sm:text-lg">
            北京大学人工智能研究院综合服务系统的公开入口，连接研究院信息、服务目录和后续目录功能。
          </p>
        </div>
      </section>

      <InstituteDirectoryPreview />

      <section aria-labelledby="institute-scope-title" className="bg-slate-50 py-16 sm:py-20">
        <div className="container-custom max-w-5xl">
          <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-start">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-100 text-primary">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h2 id="institute-scope-title" className="text-3xl font-extrabold tracking-tight text-slate-900">
                服务范围
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                当前页面提供研究院公共入口与服务说明；可公开的人员、团队、研究和更新内容将在确认后逐步汇集。
              </p>
              <Link
                href="/services"
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                前往服务目录
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
