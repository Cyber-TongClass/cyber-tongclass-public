import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { CoffeeTalkTeacherManageClient } from "@/components/coffee-talk/coffee-talk-teacher-manage-client"

export default function CoffeeTalkTeacherManagePage() {
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
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" aria-labelledby="coffee-talk-manage-heading">
          <p className="text-sm font-semibold text-primary">Coffee Talk</p>
          <h1 id="coffee-talk-manage-heading" className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">教师处理台</h1>
          <p className="mt-3 leading-7 text-slate-600">仅显示明确绑定到当前教师账户的申请；可处理操作由服务端按当前状态授权。</p>
          <div className="mt-7"><CoffeeTalkTeacherManageClient /></div>
        </section>
      </div>
    </div>
  )
}
