import type { Metadata } from "next"

import { AcademicExchangeDetailClient } from "@/components/reimbursements/academic-exchange-detail-client"

export const metadata: Metadata = {
  title: "学术交流支持申请详情",
  description: "查看本人提交的学术交流支持申请及审核进度。",
  robots: { index: false, follow: false },
}

export default function AcademicExchangeDetailPage() {
  return <AcademicExchangeDetailClient />
}
