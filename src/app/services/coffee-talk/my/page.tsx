import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { CoffeeTalkMyClient } from "@/components/coffee-talk/coffee-talk-my-client"

export default function MyCoffeeTalkApplicationsPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/services/coffee-talk"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回 Coffee Talk
        </Link>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" aria-labelledby="coffee-talk-my-heading">
          <p className="text-sm font-semibold text-primary">Coffee Talk</p>
          <h1 id="coffee-talk-my-heading" className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">我的申请</h1>
          <p className="mt-3 leading-7 text-slate-600">这里仅显示当前登录账户提交的申请状态。</p>
          <div className="mt-7"><CoffeeTalkMyClient /></div>
        </section>
      </div>
    </div>
  )
}
