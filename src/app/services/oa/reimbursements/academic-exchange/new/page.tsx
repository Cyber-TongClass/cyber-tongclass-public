import type { Metadata } from "next"

import { AcademicExchangeFormClient } from "@/components/reimbursements/academic-exchange-form-client"

export const metadata: Metadata = {
  title: "新增学术交流支持申请",
  description: "提交学术交流支持申请。",
  robots: { index: false, follow: false },
}

export default function NewAcademicExchangePage() {
  return <AcademicExchangeFormClient />
}
