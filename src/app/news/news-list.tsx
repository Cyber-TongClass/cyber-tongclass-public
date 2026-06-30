"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, FileText, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useNews } from "@/lib/api"
import type { News } from "@/types"
import { NEWS_CATEGORY_OPTIONS } from "@/lib/news"

const categories = [
  { value: "all", label: "全部分类" },
  ...NEWS_CATEGORY_OPTIONS.map((category) => ({ value: category, label: category })),
]

export function NewsList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")

  // Fetch news from Convex
  const newsData = useNews()
  const news: News[] = useMemo(() => newsData || [], [newsData])

  const filteredNews = useMemo(() => {
    return news.filter((item) => {
      // Search filter
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false
      }
      return true
    })
  }, [news, searchQuery, selectedCategory])

  const sortedNews = useMemo(() => {
    return [...filteredNews].sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime()
      const dateB = new Date(b.publishedAt).getTime()
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB
    })
  }, [filteredNews, sortOrder])

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
          <Input
            placeholder="搜索新闻..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex h-10 w-full md:w-[160px] items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
            className="flex h-10 w-full md:w-[140px] items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="newest">最新优先</option>
            <option value="oldest">最早优先</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-slate-600">
        共 {sortedNews.length} 条新闻
      </div>

      {/* News list - Timeline style */}
      {sortedNews.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-px" />
          
          <div className="space-y-8">
            {sortedNews.map((item) => (
              <div key={item._id} className={`relative flex flex-col md:flex-row ${sortedNews.indexOf(item) % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                {/* Timeline dot */}
                <div className="absolute left-4 md:left-1/2 w-3 h-3 rounded-full bg-primary -translate-x-1/2 mt-6 z-10" />
                
                {/* Content */}
                <div className="ml-10 md:ml-0 md:w-[calc(50%-2rem)]">
                  <Link
                    href={item.sourceUrl || `/news/${item._id}`}
                    target={item.sourceUrl ? "_blank" : undefined}
                    rel={item.sourceUrl ? "noopener noreferrer" : undefined}
                  >
                    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer card-hover">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                          <span className="text-primary font-medium">{item.category}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.publishedAt).toLocaleDateString("zh-CN")}
                          </span>
                        </div>
                        <CardTitle className="text-xl line-clamp-2">{item.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                          {item.content}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
                
                {/* Spacer for alternate layout */}
                <div className="hidden md:block md:w-[calc(50%-2rem)]" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-slate-600 mb-4" />
          <h3 className="text-lg font-extrabold text-slate-900 mb-2">未找到新闻</h3>
          <p className="text-slate-600">请尝试调整搜索条件</p>
        </div>
      )}
    </div>
  )
}
