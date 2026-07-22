import { MemberOnlyGuard } from "@/components/auth/member-only-guard"

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MemberOnlyGuard
      title="活动模块需登录后访问"
      description="请先登录后再查看活动列表、活动详情和相关内部信息。"
    >
      {children}
    </MemberOnlyGuard>
  )
}
