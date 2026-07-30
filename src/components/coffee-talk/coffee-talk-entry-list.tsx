"use client"

import { AiaIndexRow } from "@/components/institute/editorial/index-row"
import { useAuth } from "@/lib/hooks/use-auth"

/** Lists public applicant destinations while protecting the teacher-only console. */
export function CoffeeTalkEntryList() {
  const { currentUser, isLoading } = useAuth()
  const isTeacher = currentUser?.identityType === "teacher"

  if (isLoading) {
    return (
      <p className="aia-text-muted mt-8 border-t aia-border-rule py-6 text-sm" role="status">
        正在确认可用入口…
      </p>
    )
  }

  return (
    <ul className="mt-8 border-t aia-border-rule">
      <AiaIndexRow
        index="01"
        href="/services/coffee-talk/apply"
        title="填写申请意向"
        meta="申请 · Apply"
        description="说明希望讨论的研究主题、可协调的时间与必要背景，方便后续联系。"
      />
      <AiaIndexRow
        index="02"
        href="/services/coffee-talk/my"
        title="查看申请状态"
        meta="进度 · Status"
        description="申请状态会在个人页面显示；只有获得相应处理后，才会提供下一步联系信息。"
      />
      {isTeacher ? (
        <AiaIndexRow
          index="01"
          href="/services/coffee-talk/manage"
          title="教师处理台"
          meta="教师 · Manage"
          description="集中处理发送至你账户的交流意向申请。"
        />
      ) : null}
    </ul>
  )
}
