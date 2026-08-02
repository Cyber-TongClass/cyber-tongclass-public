import type { Metadata } from "next"
import { MemberOnlyGuard } from "@/components/auth/member-only-guard"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function IntranetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MemberOnlyGuard
      title="内网模块需登录后访问"
      description="请先使用学号登录后再访问内网内容和内部资源。"
      allowedIdentityTypes={["graduate"]}
    >
      {children}
    </MemberOnlyGuard>
  )
}
