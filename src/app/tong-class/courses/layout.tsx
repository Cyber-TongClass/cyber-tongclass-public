import { MemberOnlyGuard } from "@/components/auth/member-only-guard"

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MemberOnlyGuard
      title="课程模块需登录后访问"
      description="请先登录后再查看课程目录、课程详情和课程测评内容。"
    >
      {children}
    </MemberOnlyGuard>
  )
}
