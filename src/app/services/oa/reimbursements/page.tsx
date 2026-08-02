import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { AiaPageHero } from "@/components/institute/editorial/page-hero"
import { AiaReimbursementWorkspaceClient } from "@/components/oa/aia-reimbursement-workspace-client"

export const metadata: Metadata = {
  title: "报销 · OA 与审批",
  description: "统一办理学术交流与自定义报销申请，并在 OA 中跟踪提交和审批。",
  robots: { index: false, follow: false },
}

export default function AiaReimbursementsPage() {
  return (
    <div className="min-h-screen">
      <AiaPageHero
        kicker="OA · 报销"
        title="报销"
        lede="固定申请与自定义报销表单共用研究院 OA 身份、可见范围和审批记录。"
      />
      <main className="container-custom max-w-5xl py-10 sm:py-12">
        <Link href="/services/oa#oa-forms" className="aia-link aia-focus inline-flex items-center gap-1 text-sm font-medium">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回 OA 与审批
        </Link>
        <div className="mt-8">
          <AiaReimbursementWorkspaceClient />
        </div>
      </main>
    </div>
  )
}
