import Link from "next/link"
import { ArrowRight, Mail, MessageSquareText } from "lucide-react"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-[hsl(211,54%,24%)] py-16 text-white sm:py-20">
        <div className="container-custom max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">Contact</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">联系与咨询</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-sky-50/90 sm:text-lg">
            研究院公共联系入口与服务说明将在此统一维护，方便访客选择合适的后续路径。
          </p>
        </div>
      </section>

      <section aria-labelledby="contact-status-title" className="bg-slate-50 py-16 sm:py-20">
        <div className="container-custom max-w-5xl">
          <div className="grid gap-5 md:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
              <Mail className="h-7 w-7 text-primary" aria-hidden="true" />
              <h2 id="contact-status-title" className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900">
                公共联系信息
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                经确认的联系渠道将在此发布。当前请先通过服务目录查看已开放的具体服务入口。
              </p>
              <Link
                href="/services"
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                查看服务目录
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
              <MessageSquareText className="h-7 w-7 text-primary" aria-hidden="true" />
              <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900">服务状态</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                本平台不会为筹备中的服务生成临时表单、日历或消息通道；相关状态会在服务目录中清楚显示。
              </p>
            </article>
          </div>
        </div>
      </section>
    </div>
  )
}
