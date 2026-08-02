import type { Metadata } from "next"

import { ClassWorkAccessGuard } from "@/components/class-work/class-work-access-guard"
import { ContentSubmissionEditor } from "@/components/class-work/content-submission-editor"

export const metadata: Metadata = { title: "创建活动 · 班级工作" }

export default function CreateClassWorkEventPage() {
  return (
    <main className="container-custom max-w-7xl py-10 sm:py-14">
      <p className="aia-kicker">班级工作 · 活动</p>
      <h1 className="aia-serif mt-4 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))] sm:text-4xl">创建活动</h1>
      <p className="aia-text-muted mt-3 max-w-2xl text-sm leading-6">填写活动时间、地点和说明并指定可见范围；审核完成前不会公开。</p>
      <ClassWorkAccessGuard category="events" capability="create">
        <ContentSubmissionEditor category="events" />
      </ClassWorkAccessGuard>
    </main>
  )
}
