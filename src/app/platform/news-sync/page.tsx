import type { Metadata } from "next"

import { ExternalNewsSyncClient } from "@/components/platform/external-news-sync-client"

export const metadata: Metadata = {
  title: "官网新闻同步",
  description: "管理 AIA 官网新闻同步、审阅分配和运行健康状态。",
  robots: { index: false, follow: false },
}

export default function ExternalNewsSyncPage() {
  return (
    <main className="aia-scope container-custom max-w-7xl py-10 sm:py-14">
      <p className="aia-kicker">平台管理 · 新闻同步</p>
      <h1 className="aia-serif mt-4 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))] sm:text-4xl">官网新闻同步</h1>
      <p className="aia-text-muted mt-3 max-w-2xl text-sm leading-6">从四个固定的 AIA 官网栏目发现内容，先生成可编辑草稿，再经过来源审阅与发布审批两个独立阶段。</p>
      <ExternalNewsSyncClient />
    </main>
  )
}
