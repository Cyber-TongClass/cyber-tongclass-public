import { AiaOAApprovalInboxClient } from "@/components/oa/aia-oa-approval-inbox-client"
import { AiaOAServiceBackLink } from "@/components/oa/aia-oa-shared"

export default function AiaOAApprovalsPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 sm:py-16">
      <div className="container-custom max-w-4xl">
        <AiaOAServiceBackLink />
        <section className="mt-6" aria-labelledby="aia-oa-approvals-heading">
          <p className="text-sm font-semibold text-primary">OA 与审批</p>
          <h1 id="aia-oa-approvals-heading" className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">审批处理台</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">处理权限由服务端按当前账户、绑定关系和事项范围校验。</p>
          <div className="mt-7"><AiaOAApprovalInboxClient /></div>
        </section>
      </div>
    </main>
  )
}
