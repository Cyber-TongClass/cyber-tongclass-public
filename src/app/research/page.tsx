import Link from "next/link"
import { ArrowRight, BrainCircuit, UsersRound } from "lucide-react"

export default function ResearchPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-[hsl(211,54%,24%)] py-16 text-white sm:py-20">
        <div className="container-custom max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">Research</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">研究</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-sky-50/90 sm:text-lg">
            汇集研究主题、协作入口与后续发布的科研信息，帮助访问者从公开信息开始了解研究院工作。
          </p>
        </div>
      </section>

      <section aria-labelledby="research-entry-title" className="bg-white py-16 sm:py-20">
        <div className="container-custom max-w-5xl">
          <div className="grid gap-5 md:grid-cols-2">
            <article className="rounded-xl border border-slate-200 p-7 shadow-sm">
              <BrainCircuit className="h-7 w-7 text-primary" aria-hidden="true" />
              <h2 id="research-entry-title" className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900">
                研究主题与项目
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                研究主题、项目摘要和相关成果将在数据与发布流程准备就绪后陆续展示。
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 p-7 shadow-sm">
              <UsersRound className="h-7 w-7 text-primary" aria-hidden="true" />
              <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900">协作入口</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                通过研究团队目录了解面向公开访问的协作单元与后续服务信息。
              </p>
              <Link
                href="/groups"
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                浏览研究团队
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          </div>
        </div>
      </section>
    </div>
  )
}
