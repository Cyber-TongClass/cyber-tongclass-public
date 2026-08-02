import type { Metadata } from "next"

import { ClassWorkAccessGuard } from "@/components/class-work/class-work-access-guard"
import { ContentSubmissionDetail } from "@/components/class-work/content-submission-detail"

export const metadata: Metadata = { title: "活动提交详情 · 班级工作" }

export default async function ClassWorkEventSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <main className="container-custom max-w-6xl py-10 sm:py-14">
      <ClassWorkAccessGuard category="events" capability="either">
        <ContentSubmissionDetail category="events" id={id} />
      </ClassWorkAccessGuard>
    </main>
  )
}
