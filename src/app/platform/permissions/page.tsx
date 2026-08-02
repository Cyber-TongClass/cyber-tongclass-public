import type { Metadata } from "next"

import { PlatformPermissionsClient } from "@/components/permissions/platform-permissions-client"

export const metadata: Metadata = {
  title: "权限管理",
  description: "管理研究院新闻、活动与报销工作权限。",
  robots: { index: false, follow: false },
}

export default function PlatformPermissionsPage() {
  return (
    <main className="aia-scope container-custom max-w-6xl py-10 sm:py-14">
      <p className="aia-kicker">平台管理 · 权限</p>
      <h1 className="aia-serif mt-4 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))] sm:text-4xl">
        权限管理
      </h1>
      <p className="aia-text-muted mt-3 max-w-2xl text-sm leading-6">
        为账号或可管理的人员组配置班级工作的创建、审核与管理能力。权限相互独立，可按工作类别分别调整。
      </p>

      <div className="mt-10">
        <PlatformPermissionsClient />
      </div>
    </main>
  )
}
