import type { Metadata } from "next"

import { CoffeeTalkTeacherManageClient } from "@/components/coffee-talk/coffee-talk-teacher-manage-client"
import { AiaPageHero } from "@/components/institute/editorial/page-hero"
import { SafeReturnLink } from "@/components/navigation/safe-return-link"

export const metadata: Metadata = {
  title: "教师处理台 · Coffee Talk",
  robots: { index: false, follow: false },
}

export default function CoffeeTalkTeacherManagePage() {
  return (
    <div className="min-h-screen">
      <AiaPageHero
        kicker="Coffee Talk · 教师"
        title="教师处理台"
        lede="仅显示明确绑定到当前教师账户的申请；可处理操作由服务端按当前状态授权。"
      />
      <div className="container-custom max-w-3xl py-10 sm:py-12">
        <SafeReturnLink
          fallback="/services/coffee-talk"
          className="aia-link aia-mono text-xs uppercase tracking-[0.14em]"
        >
          ← 返回 Coffee Talk
        </SafeReturnLink>
        <div className="mt-8">
          <CoffeeTalkTeacherManageClient />
        </div>
      </div>
    </div>
  )
}
