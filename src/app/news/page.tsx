"use client"

import * as React from "react"
import Link from "next/link"
import { Search, Newspaper, Clock } from "lucide-react"

const MONTH_ABBRS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useNews } from "@/lib/api"
import type { News } from "@/types"
import { NEWS_CATEGORY_OPTIONS } from "@/lib/news"

// 新闻分类
const categories = [
  { value: "all", label: "全部分类" },
  ...NEWS_CATEGORY_OPTIONS.map((category) => ({ value: category, label: category })),
]

export default function NewsPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("all")

  // Fetch news from Convex
  const newsData = useNews()
  const news: News[] = newsData || []
  const isLoading = !newsData

  // 筛选新闻
  const filteredNews = news
    .filter((item) => {
      // 搜索筛选
      if (
        searchQuery &&
        !item.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }
      // 分类筛选
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false
      }
      return true
    })
    .sort((a, b) => b.publishedAt - a.publishedAt)

  // 按时间轴分组
  const groupedNews = React.useMemo(() => {
    const groups: Record<string, typeof filteredNews> = {}
    filteredNews.forEach((item) => {
      const monthKey = new Date(item.publishedAt).toISOString().slice(0, 7) // YYYY-MM
      if (!groups[monthKey]) {
        groups[monthKey] = []
      }
      groups[monthKey].push(item)
    })
    return groups
  }, [filteredNews])

  const sortedMonths = Object.keys(groupedNews).sort((a, b) => b.localeCompare(a))

  const years = React.useMemo(() => {
    const yearSet = new Set<string>()
    sortedMonths.forEach((m) => yearSet.add(m.slice(0, 4)))
    return Array.from(yearSet).sort((a, b) => b.localeCompare(a))
  }, [sortedMonths])

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

      {/* Filters Section */}
      <section className="border-b border-slate-200 bg-white sticky top-16 z-40">
        <div className="container-custom py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
              <Input
                type="search"
                placeholder="搜索新闻标题..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {/* Category Filter */}
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {(selectedCategory !== "all" || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory("all")
                    setSearchQuery("")
                  }}
                >
                  清除筛选
                </Button>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-slate-500">
            显示 {filteredNews.length} 条新闻
          </div>
        </div>
      </section>

      {/* News Timeline */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-24 bg-slate-100">
        <div className="max-w-4xl mx-auto">
        {isLoading ? (
          <div className="text-center py-16">
            <Newspaper className="h-12 w-12 text-slate-400 mx-auto mb-4 animate-pulse" />
            <p className="text-slate-500">加载中...</p>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="text-center py-16">
            <Newspaper className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">
              未找到匹配新闻
            </h3>
            <p className="text-slate-500">
              尝试调整筛选条件或搜索关键词
            </p>
          </div>
        ) : (
          <div className="space-y-20">
            {years.map((year) => (
              <div key={year} className="grid grid-cols-[72px_1fr] md:grid-cols-[96px_1fr] gap-6 md:gap-10">
                {/* Year sidebar */}
                <div className="text-5xl md:text-6xl font-extrabold text-slate-300 leading-none pt-1 select-none">
                  {year}
                </div>

                {/* Month blocks */}
                <div className="space-y-12">
                  {sortedMonths
                    .filter((m) => m.startsWith(year))
                    .map((month) => {
                      const monthIndex = parseInt(month.slice(5, 7), 10) - 1
                      return (
                        <div key={month}>
                          <div className="mb-4">
                            <span className="text-xl font-extrabold uppercase tracking-widest text-[hsl(350,55%,35%)]">
                              {MONTH_ABBRS[monthIndex]}
                            </span>
                            <span className="text-xs text-slate-400 ml-1">
                              {groupedNews[month].length} 条
                            </span>
                          </div>

                          <div className="space-y-4">
                            {groupedNews[month].map((item) => (
                              <Link
                                key={item._id}
                                href={item.sourceUrl || `/news/${item._id}`}
                                target={item.sourceUrl ? "_blank" : undefined}
                                rel={item.sourceUrl ? "noopener noreferrer" : undefined}
                              >
                                <div className="group bg-white p-6 shadow-sm hover:bg-slate-50 border-l-[3px] border-transparent hover:border-primary transition-all duration-200">
                                  <div className="flex flex-col gap-4 md:flex-row md:items-start">
                                    <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <span className="px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase rounded-full bg-primary text-white">
                                        {item.category}
                                      </span>
                                      <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {new Date(item.publishedAt).toLocaleDateString("zh-CN")}
                                      </span>
                                    </div>
                                    <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                                      {item.title}
                                    </h3>
                                    <p className="text-sm text-slate-600 line-clamp-2 mt-2">
                                      {item.content}
                                    </p>
                                    </div>
                                    {item.coverImageUrl ? (
                                      <div className="h-24 w-full overflow-hidden rounded-md bg-slate-100 md:h-24 md:w-40 md:shrink-0">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={item.coverImageUrl}
                                          alt={item.title}
                                          className="h-full w-full object-cover"
                                        />
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </section>
    </div>
  )
}
