import type { Metadata } from "next"

import { AiaPageHero } from "@/components/institute/editorial/page-hero"
import { AiaOAFormListClient } from "@/components/oa/aia-oa-form-list-client"

export const metadata: Metadata = {
  title: "OA 与审批",
  description: "研究院 OA 事项的统一办理台：事项填报、我的提交与审批处理在同一页面完成。",
  robots: { index: false, follow: false },
}

export default function AiaOAServicePage() {
  return (
    <div className="min-h-screen">
      <AiaPageHero
        kicker="OA · 审批"
        title="OA 与审批"
        lede="面向研究院账户统一发布申请、材料填报和审核事项。提交、处理意见与状态仅对相应账户开放。"
      />
      <div className="container-custom max-w-5xl py-10 sm:py-12">
        <AiaOAFormListClient />
      </div>
    </div>
  )
}
