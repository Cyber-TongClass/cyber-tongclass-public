import type { Metadata } from "next"

import { AcademicExchangeListClient } from "@/components/reimbursements/academic-exchange-list-client"

export const metadata: Metadata = {
  title: "学术交流支持",
  description: "研究院账户统一使用的学术交流支持申请入口。",
  robots: { index: false, follow: false },
}

export default function AcademicExchangePage() {
  return <AcademicExchangeListClient />
}
