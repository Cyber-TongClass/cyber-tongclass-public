import type { Metadata } from "next"

import { ClassWorkAccessGuard } from "@/components/class-work/class-work-access-guard"
import { ContentSubmissionEditor } from "@/components/class-work/content-submission-editor"

export const metadata: Metadata = { title: "创建新闻 · 班级工作" }

export default function CreateClassWorkNewsPage() {
  return (
    <main className="container-custom max-w-7xl py-10 sm:py-14">
      <p className="aia-kicker">班级工作 · 新闻</p>
      <h1 className="aia-serif mt-4 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))] sm:text-4xl">创建新闻</h1>
      <p className="aia-text-muted mt-3 max-w-2xl text-sm leading-6">准备新闻内容和可见范围。提交后由具有审核与管理权的成员并行审核。</p>
      <ClassWorkAccessGuard category="news" capability="create">
        <ContentSubmissionEditor category="news" />
      </ClassWorkAccessGuard>
    </main>
  )
}
