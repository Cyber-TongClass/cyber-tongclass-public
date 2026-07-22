import type { LucideIcon } from "lucide-react"
import { ArrowUpRight, BookOpenCheck, Coffee, MessageSquareText, Network } from "lucide-react"
import Link from "next/link"
import { ReservationPlaceholderCard } from "@/components/institute/reservation-placeholder-card"

type ServiceCardProps = {
  title: string
  description: string
  href: string
  icon: LucideIcon
  action: string
}

function ServiceCard({ title, description, href, icon: Icon, action }: ServiceCardProps) {
  return (
    <Link
      href={href}
      className="group flex min-h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-6 text-xl font-bold text-slate-900">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{description}</p>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
        {action}
        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
      </span>
    </Link>
  )
}

export function ServiceDirectory() {
  return (
    <section aria-labelledby="service-directory-title" className="bg-slate-50 py-16 sm:py-20">
      <div className="container-custom">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Services</p>
          <h2 id="service-directory-title" className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            服务目录
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            从学术交流到信息入口，所有服务以清楚、可访问的路径呈现。需要预约的功能将在准备完成后单独开放。
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          <ServiceCard
            title="Coffee Talk"
            description="了解面向研究交流与跨学科对话的 Coffee Talk 服务。"
            href="/services/coffee-talk"
            icon={Coffee}
            action="了解 Coffee Talk"
          />
          <ServiceCard
            title="研究支持"
            description="查看研究方向、项目入口与持续更新的科研信息。"
            href="/research"
            icon={BookOpenCheck}
            action="查看研究支持"
          />
          <ServiceCard
            title="研究团队"
            description="浏览研究组与协作网络的公开目录入口。"
            href="/groups"
            icon={Network}
            action="浏览研究团队"
          />
          <ServiceCard
            title="联系与咨询"
            description="获取研究院公共联系入口与服务说明。"
            href="/contact"
            icon={MessageSquareText}
            action="前往联系入口"
          />
          <ReservationPlaceholderCard />
        </div>
      </div>
    </section>
  )
}
