import { MemberOnlyGuard } from "@/components/auth/member-only-guard"

export default function IntranetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MemberOnlyGuard
      title="内网模块需登录后访问"
      description="请先使用学号登录后再访问内网内容和内部资源。"
    >
      {children}
    </MemberOnlyGuard>
  )
}
