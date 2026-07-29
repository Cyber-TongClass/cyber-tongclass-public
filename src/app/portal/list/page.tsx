import type { Metadata } from "next"

import { PortalClient } from "@/components/portal/portal-client"

export const metadata: Metadata = {
  title: "内网",
  description:
    "北京大学人工智能研究院内网入口 — 在同一研究院外壳下，按账户身份呈现通知、Coffee Talk、通班与管理模块。",
  robots: { index: false, follow: false },
}

export default function PortalListPage() {
  return <PortalClient />
}
