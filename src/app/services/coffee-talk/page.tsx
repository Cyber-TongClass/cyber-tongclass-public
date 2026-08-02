import type { Metadata } from "next"

import { CoffeeTalkEntryList } from "@/components/coffee-talk/coffee-talk-entry-list"
import { AiaPageHero } from "@/components/institute/editorial/page-hero"
import { AiaSectionHeading } from "@/components/institute/editorial/section-heading"

export const metadata: Metadata = {
  title: "Coffee Talk",
  description: "面向研究兴趣交流的申请入口。申请会在服务开放后按既定流程处理。",
  alternates: { canonical: "/services/coffee-talk" },
}

export default function CoffeeTalkPage() {
  return (
    <div className="min-h-screen">
      <AiaPageHero
        kicker="服务 · Coffee Talk"
        title="Coffee Talk"
        lede="面向研究兴趣交流的申请入口。申请会在服务开放后按既定流程处理。"
      />

      <section aria-labelledby="coffee-talk-entry-title" className="container-custom max-w-5xl py-12 sm:py-14">
        <AiaSectionHeading
          kicker="办理入口 · Entry"
          title="选择你要办理的事项"
          headingId="coffee-talk-entry-title"
          showRule={false}
        />
        <CoffeeTalkEntryList />
        <p className="aia-text-muted mt-8 text-sm leading-6">
          以上入口均需登录后访问；未登录账户将先进入登录流程，完成后自动回到对应页面。
        </p>
      </section>
    </div>
  )
}
