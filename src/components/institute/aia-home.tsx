import { ArrowRight, Compass, Layers3, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { AIAHero } from "@/components/institute/aia-hero"
import { InstituteDirectoryPreview } from "@/components/institute/institute-directory-preview"
import { ServiceDirectory } from "@/components/institute/service-directory"

export function AIAHome() {
  return (
    <div className="min-h-screen bg-white">
      <AIAHero />

      <section aria-labelledby="gateway-overview-title" className="bg-white py-16 sm:py-20">
        <div className="container-custom">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Gateway overview</p>
              <h2 id="gateway-overview-title" className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                面向研究院协作的统一入口
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
                AIA Academic Gateway 以服务、目录与研究信息为起点，帮助使用者快速定位公开信息与后续服务入口。
              </p>
            </div>
            <Link
              href="/services"
              className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md border border-primary px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              浏览全部服务
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-6">
              <Compass className="h-6 w-6 text-primary" aria-hidden="true" />
              <h3 className="mt-5 text-xl font-bold text-slate-900">清晰导航</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">以研究院、研究、服务和更新入口组织公共信息。</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-6">
              <Layers3 className="h-6 w-6 text-primary" aria-hidden="true" />
              <h3 className="mt-5 text-xl font-bold text-slate-900">持续扩展</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">先提供稳定的静态入口，后续可逐步接入经确认的目录与服务数据。</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-6">
              <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
              <h3 className="mt-5 text-xl font-bold text-slate-900">稳健服务</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">未开放的功能明确标注状态，不以模拟预约或消息流程替代正式服务。</p>
            </article>
          </div>
        </div>
      </section>

      <ServiceDirectory />
      <InstituteDirectoryPreview />
    </div>
  )
}
