import type { Metadata } from "next"

import { ClassWorkAccessGuard } from "@/components/class-work/class-work-access-guard"
import { ContentReviewDesk } from "@/components/class-work/content-review-desk"

export const metadata: Metadata = { title: "新闻审核台 · 班级工作" }

export default function ManageClassWorkNewsPage() {
  return (
    <main className="container-custom max-w-6xl py-10 sm:py-14">
      <p className="aia-kicker">班级工作 · 审核与管理</p>
      <h1 className="aia-serif mt-4 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))] sm:text-4xl">新闻审核台</h1>
      <p className="aia-text-muted mt-3 max-w-2xl text-sm leading-6">像处理 OA 一样查看提交、给出意见并完成新闻发布审核。</p>
      <ClassWorkAccessGuard category="news" capability="manage">
        <ContentReviewDesk category="news" />
      </ClassWorkAccessGuard>
    </main>
  )
}
