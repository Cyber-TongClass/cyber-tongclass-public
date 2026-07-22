"use client"

import * as React from "react"

import {
  NewsTimeline,
  type NewsTimelineItem,
} from "@/components/content/news-timeline"
import { useNews } from "@/lib/api"
import type { News } from "@/types"

export default function NewsPage() {
  const newsData = useNews({ limit: 100 }) as News[] | undefined
  const items = React.useMemo<NewsTimelineItem[] | undefined>(
    () =>
      newsData?.map((item) => ({
        id: String(item._id),
        title: item.title,
        content: item.content,
        sourceUrl: item.sourceUrl,
        coverImageUrl: item.coverImageUrl,
        category: item.category,
        publishedAt: item.publishedAt,
      })),
    [newsData],
  )

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative">
          <div className="absolute left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 text-[5rem] md:text-[8rem] lg:text-[10rem] font-extrabold uppercase tracking-[0.15em] text-white/5 select-none pointer-events-none whitespace-nowrap leading-none" aria-hidden="true">
            NEWS
          </div>
          <div className="mb-4 relative">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight">
              新闻动态
            </h1>
          </div>
          <p className="text-lg text-white/70 max-w-2xl relative relative">
            了解通班的最新动态、回顾通班精彩纷呈的活动。
          </p>
        </div>
      </section>

      <NewsTimeline items={items} detailHref={(item) => `/tong-class/news/${item.id}`} />
    </div>
  )
}
