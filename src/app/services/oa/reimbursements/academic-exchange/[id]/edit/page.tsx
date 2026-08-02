import type { Metadata } from "next"

import { AcademicExchangeEditClient } from "@/components/reimbursements/academic-exchange-edit-client"

export const metadata: Metadata = {
  title: "补充学术交流支持申请",
  description: "根据审核意见补充并重新提交学术交流支持申请。",
  robots: { index: false, follow: false },
}

export default function EditAcademicExchangePage() {
  return <AcademicExchangeEditClient />
}
