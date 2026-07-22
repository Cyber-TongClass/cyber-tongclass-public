import { AiaOAMySubmissionsClient } from "@/components/oa/aia-oa-my-submissions-client"
import { AiaOAServiceBackLink } from "@/components/oa/aia-oa-shared"

export default function AiaOAMySubmissionsPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 sm:py-16">
      <div className="container-custom max-w-4xl">
        <AiaOAServiceBackLink />
        <section className="mt-6" aria-labelledby="aia-oa-my-submissions-heading">
          <p className="text-sm font-semibold text-primary">OA 与审批</p>
          <h1 id="aia-oa-my-submissions-heading" className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">我的提交</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">只显示当前登录账户的 OA 提交记录和处理结果。</p>
          <div className="mt-7"><AiaOAMySubmissionsClient /></div>
        </section>
      </div>
    </main>
  )
}
