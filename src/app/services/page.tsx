import { ServiceDirectory } from "@/components/institute/service-directory"

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
