import type { Metadata } from "next"

import { ClassWorkAccessGuard } from "@/components/class-work/class-work-access-guard"
import { ExternalNewsReviewDesk } from "@/components/class-work/external-news-review-desk"

export const metadata: Metadata = { title: "官网新闻审阅 · 班级工作" }

export default function ExternalNewsReviewPage() {
  return (
    <main className="aia-scope container-custom max-w-7xl py-10 sm:py-14">
      <p className="aia-kicker">班级工作 · 来源审阅</p>
      <h1 className="aia-serif mt-4 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))] sm:text-4xl">官网新闻审阅</h1>
      <p className="aia-text-muted mt-3 max-w-2xl text-sm leading-6">核对机器人从 AIA 官网生成的内网草稿。接受后仍需由发布管理员完成第二阶段审批。</p>
      <ClassWorkAccessGuard category="news" capability="review">
        <ExternalNewsReviewDesk />
      </ClassWorkAccessGuard>
    </main>
  )
}
