import type { Metadata } from "next"

import { CoffeeTalkMyClient } from "@/components/coffee-talk/coffee-talk-my-client"
import { AiaPageHero } from "@/components/institute/editorial/page-hero"
import { SafeReturnLink } from "@/components/navigation/safe-return-link"

export const metadata: Metadata = {
  title: "我的申请 · Coffee Talk",
  robots: { index: false, follow: false },
}

export default function MyCoffeeTalkApplicationsPage() {
  return (
    <div className="min-h-screen">
      <AiaPageHero
        kicker="Coffee Talk · 进度"
        title="我的申请"
        lede="这里仅显示当前登录账户提交的申请状态。"
      />
      <div className="container-custom max-w-3xl py-10 sm:py-12">
        <SafeReturnLink
          fallback="/services/coffee-talk"
          className="aia-link aia-mono text-xs uppercase tracking-[0.14em]"
        >
          ← 返回 Coffee Talk
        </SafeReturnLink>
        <div className="mt-8">
          <CoffeeTalkMyClient />
        </div>
      </div>
    </div>
  )
}
