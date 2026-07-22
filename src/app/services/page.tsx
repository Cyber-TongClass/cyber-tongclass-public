import { ServiceDirectory } from "@/components/institute/service-directory"
import Link from "next/link"

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-[hsl(211,54%,24%)] py-16 text-white sm:py-20">
        <div className="container-custom max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">Services</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">服务目录</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-sky-50/90 sm:text-lg">
            通过统一入口查找研究院服务。尚未开放的服务会明确标注状态，不会提供替代性的预约或提交流程。
          </p>
        </div>
      </section>

      <ServiceDirectory />

      <section aria-labelledby="oa-service-title" className="bg-white py-16 sm:py-20">
        <div className="container-custom max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">OA</p>
            <h2 id="oa-service-title" className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">OA 与审批</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              通过统一入口办理研究院表单、材料提交和审批事项。个人记录与处理权限均以当前登录账户为准。
            </p>
            <Link
              href="/services/oa"
              className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              进入 OA 与审批
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="service-notice-title" className="bg-white py-16 sm:py-20">
        <div className="container-custom max-w-5xl">
          <h2 id="service-notice-title" className="text-3xl font-extrabold tracking-tight text-slate-900">
            使用说明
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            服务链接仅通向已明确开放的页面。空间预约等筹备中事项会在开放后提供正式流程与必要说明。
          </p>
        </div>
      </section>
    </div>
  )
}
