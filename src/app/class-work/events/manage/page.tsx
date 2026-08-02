import type { Metadata } from "next"

import { ClassWorkAccessGuard } from "@/components/class-work/class-work-access-guard"
import { ContentReviewDesk } from "@/components/class-work/content-review-desk"

export const metadata: Metadata = { title: "活动审核台 · 班级工作" }

export default function ManageClassWorkEventsPage() {
  return (
    <main className="container-custom max-w-6xl py-10 sm:py-14">
      <p className="aia-kicker">班级工作 · 审核与管理</p>
      <h1 className="aia-serif mt-4 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))] sm:text-4xl">活动审核台</h1>
      <p className="aia-text-muted mt-3 max-w-2xl text-sm leading-6">集中处理活动提交，核对时间、地点、说明和成员可见范围。</p>
      <ClassWorkAccessGuard category="events" capability="manage">
        <ContentReviewDesk category="events" />
      </ClassWorkAccessGuard>
    </main>
  )
}
