import Link from "next/link"
import { ArrowRight, BellRing, FileClock } from "lucide-react"

export default function UpdatesPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-[hsl(211,54%,24%)] py-16 text-white sm:py-20">
        <div className="container-custom max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">Updates</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">更新与公告</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-sky-50/90 sm:text-lg">
            研究院的公开动态、公告和后续服务更新将在此集中呈现。
          </p>
        </div>
      </section>

      <section aria-labelledby="updates-status-title" className="bg-slate-50 py-16 sm:py-20">
        <div className="container-custom max-w-3xl">
          <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-100 text-primary">
              <BellRing className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 id="updates-status-title" className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">
              信息发布入口正在完善
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              为确保信息准确，这里暂不展示未核验的动态。后续将接入经确认的研究院公告与更新内容。
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/research"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                查看研究入口
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                联系研究院
                <FileClock className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
