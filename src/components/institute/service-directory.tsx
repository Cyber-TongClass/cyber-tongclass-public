import type { LucideIcon } from "lucide-react"
import { ArrowUpRight, BookOpenCheck, Coffee, Network } from "lucide-react"
import Link from "next/link"

import { AiaSectionHeading } from "@/components/institute/editorial/section-heading"
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
      className="aia-focus group flex min-h-full flex-col border aia-border-rule p-6 transition-colors hover:border-[hsl(var(--aia-red))]"
    >
      <Icon
        className="h-5 w-5 text-[hsl(var(--aia-muted))] transition-colors group-hover:text-[hsl(var(--aia-red))]"
        aria-hidden="true"
      />
      <h3 className="aia-serif mt-6 text-xl font-semibold text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
        {title}
      </h3>
      <p className="aia-text-muted mt-3 flex-1 text-sm leading-6">{description}</p>
      <span className="aia-kicker mt-6 inline-flex items-center gap-1.5">
        {action}
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </Link>
  )
}

export function ServiceDirectory({ index }: { index?: string }) {
  return (
    <section aria-labelledby="service-directory-title" className="border-b aia-border-rule">
      <div className="container-custom py-16 sm:py-20">
        <AiaSectionHeading
          kicker="服务 · Services"
          index={index}
          title="服务目录"
          description="从学术交流到信息入口，所有服务以清楚、可访问的路径呈现。需要预约的功能将在准备完成后单独开放。"
          href="/services/oa"
          hrefLabel="全部服务"
          headingId="service-directory-title"
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
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
          <ReservationPlaceholderCard />
        </div>
      </div>
    </section>
  )
}
