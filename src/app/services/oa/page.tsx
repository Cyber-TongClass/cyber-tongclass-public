import { AiaOAFormListClient } from "@/components/oa/aia-oa-form-list-client"

export default function AiaOAServicePage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 sm:py-16">
      <div className="container-custom max-w-5xl">
        <section className="rounded-2xl bg-[hsl(211,54%,24%)] px-6 py-10 text-white shadow-sm sm:px-10 sm:py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">Institute service</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">OA 与审批</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-sky-50/90 sm:text-lg">
            面向研究院账户统一发布申请、材料填报和审核事项。提交、处理意见与状态仅对相应账户开放。
          </p>
        </section>
        <section className="mt-8" aria-label="OA 事项目录"><AiaOAFormListClient /></section>
      </div>
    </main>
  )
}
