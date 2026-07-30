"use client"

import * as React from "react"
import Link from "next/link"
import { Clock, Newspaper, Search } from "lucide-react"

import type { NewsTimelineItem } from "@/components/content/news-timeline"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { NEWS_CATEGORY_OPTIONS } from "@/lib/news"
import { getSafeExternalUrl } from "@/lib/safe-external-url"

const MONTH_ABBRS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
]

const categories = [
  { value: "all", label: "全部分类" },
  ...NEWS_CATEGORY_OPTIONS.map((category) => ({ value: category, label: category })),
]

type TongClassNewsTimelineProps = {
  items: NewsTimelineItem[] | undefined
  detailHref: (item: NewsTimelineItem) => string
}

export function TongClassNewsTimeline({
  items,
  detailHref,
}: TongClassNewsTimelineProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("all")

  const filteredNews = React.useMemo(
    () =>
      (items ?? [])
        .filter((item) => {
          if (
            searchQuery &&
            !item.title.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            return false
          }
          if (selectedCategory !== "all" && item.category !== selectedCategory) {
            return false
          }
          return true
        })
        .sort((left, right) => right.publishedAt - left.publishedAt),
    [items, searchQuery, selectedCategory]
  )

  const groupedNews = React.useMemo(() => {
    const groups: Record<string, NewsTimelineItem[]> = {}
    filteredNews.forEach((item) => {
      const publishedDate = new Date(item.publishedAt)
      const monthKey = `${publishedDate.getFullYear()}-${String(
        publishedDate.getMonth() + 1
      ).padStart(2, "0")}`
      if (!groups[monthKey]) groups[monthKey] = []
      groups[monthKey].push(item)
    })
    return groups
  }, [filteredNews])

  const sortedMonths = React.useMemo(
    () => Object.keys(groupedNews).sort((left, right) => right.localeCompare(left)),
    [groupedNews]
  )

  const years = React.useMemo(() => {
    const yearSet = new Set<string>()
    sortedMonths.forEach((month) => yearSet.add(month.slice(0, 4)))
    return Array.from(yearSet).sort((left, right) => right.localeCompare(left))
  }, [sortedMonths])

  const resetFilters = () => {
    setSelectedCategory("all")
    setSearchQuery("")
  }

  return (
    <>
      <section className="sticky top-16 z-40 border-b border-slate-200 bg-white">
        <div className="container-custom py-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative max-w-md flex-1">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600"
              />
              <Input
                type="search"
                aria-label="搜索新闻标题"
                placeholder="搜索新闻标题..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedCategory !== "all" || searchQuery ? (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  清除筛选
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 text-sm text-slate-500">
            {items === undefined ? "正在加载新闻..." : <>显示 {filteredNews.length} 条新闻</>}
          </div>
        </div>
      </section>

      <section className="bg-slate-100 px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {items === undefined ? (
            <div className="py-16 text-center" role="status">
              <Newspaper
                className="mx-auto mb-4 h-12 w-12 animate-pulse text-slate-400"
                aria-hidden="true"
              />
              <p className="text-slate-500">加载中...</p>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="py-16 text-center">
              <Newspaper className="mx-auto mb-4 h-12 w-12 text-slate-400" aria-hidden="true" />
              <h3 className="mb-2 text-lg font-extrabold text-slate-900">未找到匹配新闻</h3>
              <p className="text-slate-500">尝试调整筛选条件或搜索关键词</p>
            </div>
          ) : (
            <div className="space-y-20">
              {years.map((year) => (
                <div
                  key={year}
                  className="grid grid-cols-[72px_1fr] gap-6 md:grid-cols-[96px_1fr] md:gap-10"
                >
                  <div className="select-none pt-1 text-5xl font-extrabold leading-none text-slate-300 md:text-6xl">
                    {year}
                  </div>

                  <div className="space-y-12">
                    {sortedMonths
                      .filter((month) => month.startsWith(year))
                      .map((month) => {
                        const monthIndex = Number.parseInt(month.slice(5, 7), 10) - 1

                        return (
                          <div key={month}>
                            <div className="mb-4">
                              <span className="text-xl font-extrabold uppercase tracking-widest text-primary">
                                {MONTH_ABBRS[monthIndex]}
                              </span>
                              <span className="ml-1 text-xs text-slate-400">
                                {groupedNews[month].length} 条
                              </span>
                            </div>

                            <div className="space-y-4">
                              {groupedNews[month].map((item) => {
                                const safeSourceUrl = getSafeExternalUrl(item.sourceUrl)
                                const href = safeSourceUrl ?? detailHref(item)

                                return (
                                  <Link
                                    key={item.id}
                                    href={href}
                                    target={safeSourceUrl ? "_blank" : undefined}
                                    rel={safeSourceUrl ? "noopener noreferrer" : undefined}
                                  >
                                    <article className="group border-l-[3px] border-transparent bg-white p-6 shadow-sm transition-all duration-200 hover:border-primary hover:bg-slate-50">
                                      <div className="flex flex-col gap-4 md:flex-row md:items-start">
                                        <div className="min-w-0 flex-1">
                                          <div className="mb-2 flex items-center gap-3">
                                            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-white">
                                              {item.category}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-slate-400">
                                              <Clock className="h-3 w-3" aria-hidden="true" />
                                              {new Date(item.publishedAt).toLocaleDateString("zh-CN")}
                                            </span>
                                          </div>
                                          <h3 className="line-clamp-1 text-lg font-extrabold text-slate-900 transition-colors group-hover:text-primary">
                                            {item.title}
                                          </h3>
                                          <p className="mt-2 line-clamp-2 text-sm text-slate-600">
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
                                    </article>
                                  </Link>
                                )
                              })}
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
    </>
  )
}
