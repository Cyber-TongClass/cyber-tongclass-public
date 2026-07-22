import Link from "next/link"
import { ArrowRight, ClipboardList, Coffee } from "lucide-react"

export default function CoffeeTalkPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 sm:py-16">
      <div className="container-custom max-w-5xl">
        <section className="rounded-2xl bg-[hsl(211,54%,24%)] px-6 py-10 text-white shadow-sm sm:px-10 sm:py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">Institute service</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Coffee Talk</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-sky-50/90 sm:text-lg">
            面向研究兴趣交流的申请入口。申请会在服务开放后按既定流程处理。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/services/coffee-talk/apply"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(211,54%,24%)]"
            >
              填写申请意向
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/services/coffee-talk/my"
              className="inline-flex min-h-11 items-center rounded-md border border-white/30 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(211,54%,24%)]"
            >
              查看申请状态
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2" aria-label="Coffee Talk 服务说明">
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Coffee className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold text-slate-950">交流意向</h2>
            <p className="mt-3 leading-7 text-slate-600">说明希望讨论的研究主题、可协调的时间与必要背景，方便后续联系。</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <ClipboardList className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold text-slate-950">处理进度</h2>
            <p className="mt-3 leading-7 text-slate-600">申请状态会在个人页面显示；只有获得相应处理后，才会提供下一步联系信息。</p>
          </article>
        </section>
      </div>
    </main>
  )
}
