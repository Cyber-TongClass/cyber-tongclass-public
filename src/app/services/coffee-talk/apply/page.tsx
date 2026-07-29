import type { Metadata } from "next"
import { Suspense } from "react"

import { CoffeeTalkApplyClient } from "@/components/coffee-talk/coffee-talk-apply-client"
import { AiaPageHero } from "@/components/institute/editorial/page-hero"
import { SafeReturnLink } from "@/components/navigation/safe-return-link"

export const metadata: Metadata = {
  title: "填写申请意向 · Coffee Talk",
  robots: { index: false, follow: false },
}

export default function CoffeeTalkApplyPage() {
  return (
    <div className="min-h-screen">
      <AiaPageHero
        kicker="Coffee Talk · 申请"
        title="填写申请意向"
        lede="说明希望讨论的研究主题、可协调的时间与必要背景。申请资料取自个人账户，提交后可在「我的申请」中查看状态。"
      />
      <div className="container-custom max-w-3xl py-10 sm:py-12">
        <SafeReturnLink
          fallback="/services/coffee-talk"
          className="aia-link aia-mono text-xs uppercase tracking-[0.14em]"
        >
          ← 返回 Coffee Talk
        </SafeReturnLink>
        <div className="mt-8">
          <Suspense fallback={<p className="aia-text-muted py-6 text-sm" role="status">正在加载申请表…</p>}>
            <CoffeeTalkApplyClient />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
