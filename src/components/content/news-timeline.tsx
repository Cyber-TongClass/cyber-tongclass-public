"use client"

import * as React from "react"
import Link from "next/link"
import { Clock, Newspaper, Search } from "lucide-react"

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

export type NewsTimelineItem = {
  id: string
  title: string
  content: string
  sourceUrl?: string
  coverImageUrl?: string
  category: string
  publishedAt: number
}

type NewsTimelineProps = {
  items: NewsTimelineItem[] | undefined
  detailHref: (item: NewsTimelineItem) => string
  audienceControl?: React.ReactNode
}

export function NewsTimeline({ items, detailHref, audienceControl }: NewsTimelineProps) {
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
        .sort((a, b) => b.publishedAt - a.publishedAt),
    [items, searchQuery, selectedCategory],
  )

  const groupedNews = React.useMemo(() => {
    const groups: Record<string, NewsTimelineItem[]> = {}
    filteredNews.forEach((item) => {
      const publishedDate = new Date(item.publishedAt)
      const monthKey = `${publishedDate.getFullYear()}-${String(
        publishedDate.getMonth() + 1,
      ).padStart(2, "0")}`
      if (!groups[monthKey]) groups[monthKey] = []
      groups[monthKey].push(item)
    })
    return groups
  }, [filteredNews])

  const sortedMonths = React.useMemo(
    () => Object.keys(groupedNews).sort((a, b) => b.localeCompare(a)),
    [groupedNews],
  )

  const years = React.useMemo(() => {
    const yearSet = new Set<string>()
    sortedMonths.forEach((month) => yearSet.add(month.slice(0, 4)))
    return Array.from(yearSet).sort((a, b) => b.localeCompare(a))
  }, [sortedMonths])

  return (
    <>
      <section className="sticky top-16 z-40 border-b border-[hsl(var(--aia-rule))] bg-[hsl(var(--aia-paper))]">
        <div className="container-custom py-4">
          {audienceControl ? <div className="mb-4">{audienceControl}</div> : null}

          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative max-w-md flex-1">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--aia-muted))]"
              />
              <Input
                type="search"
                aria-label="搜索新闻标题"
                placeholder="搜索新闻标题..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="border-[hsl(var(--aia-rule))] bg-[hsl(var(--aia-paper))] pl-10 text-[hsl(var(--aia-ink))] placeholder:text-[hsl(var(--aia-muted))] focus-visible:ring-[hsl(var(--aia-red))] focus-visible:ring-offset-[hsl(var(--aia-paper))]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[140px] border-[hsl(var(--aia-rule))] bg-[hsl(var(--aia-paper))] text-[hsl(var(--aia-ink))] focus:ring-[hsl(var(--aia-red))] focus:ring-offset-[hsl(var(--aia-paper))]">
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent className="border-[hsl(var(--aia-rule))] bg-[hsl(var(--aia-paper))] text-[hsl(var(--aia-ink))]">
                  {categories.map((category) => (
                    <SelectItem className="focus:bg-[hsl(var(--aia-tag))] focus:text-[hsl(var(--aia-red))]" key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedCategory !== "all" || searchQuery ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[hsl(var(--aia-muted))] hover:bg-[hsl(var(--aia-tag))] hover:text-[hsl(var(--aia-red))]"
                  onClick={() => {
                    setSelectedCategory("all")
                    setSearchQuery("")
                  }}
                >
                  清除筛选
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 text-sm text-[hsl(var(--aia-muted))]">
            {items === undefined ? "正在加载新闻..." : <>显示 {filteredNews.length} 条新闻</>}
          </div>
        </div>
      </section>

      <section className="bg-[hsl(var(--aia-warm))] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {items === undefined ? (
            <div className="py-16 text-center" role="status">
              <Newspaper className="mx-auto mb-4 h-12 w-12 animate-pulse text-[hsl(var(--aia-muted))]" />
              <p className="text-[hsl(var(--aia-muted))]">加载中...</p>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="py-16 text-center">
              <Newspaper className="mx-auto mb-4 h-12 w-12 text-[hsl(var(--aia-muted))]" />
              <h3 className="mb-2 text-lg font-extrabold text-[hsl(var(--aia-ink))]">未找到匹配新闻</h3>
              <p className="text-[hsl(var(--aia-muted))]">尝试调整筛选条件或搜索关键词</p>
            </div>
          ) : (
            <div className="space-y-20">
              {years.map((year) => (
                <div
                  key={year}
                  className="grid grid-cols-[72px_1fr] gap-6 md:grid-cols-[96px_1fr] md:gap-10"
                >
                  <div className="select-none pt-1 text-5xl font-extrabold leading-none text-[hsl(var(--aia-rule))] md:text-6xl">
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
                              <span className="text-xl font-extrabold uppercase tracking-widest text-[hsl(var(--aia-red))]">
                                {MONTH_ABBRS[monthIndex]}
                              </span>
                              <span className="ml-1 text-xs text-[hsl(var(--aia-muted))]">
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
                                    <div className="group border-l-[3px] border-transparent bg-[hsl(var(--aia-paper))] p-6 shadow-sm transition-all duration-200 hover:border-[hsl(var(--aia-red))] hover:bg-[hsl(var(--aia-tag))]">
                                      <div className="flex flex-col gap-4 md:flex-row md:items-start">
                                        <div className="min-w-0 flex-1">
                                          <div className="mb-2 flex items-center gap-3">
                                            <span className="rounded-full bg-[hsl(var(--aia-red))] px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-white">
                                              {item.category}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-[hsl(var(--aia-muted))]">
                                              <Clock className="h-3 w-3" />
                                              {new Date(item.publishedAt).toLocaleDateString("zh-CN")}
                                            </span>
                                          </div>
                                          <h3 className="line-clamp-1 text-lg font-extrabold text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
                                            {item.title}
                                          </h3>
                                          <p className="mt-2 line-clamp-2 text-sm text-[hsl(var(--aia-muted))]">
                                            {item.content}
                                          </p>
                                        </div>
                                        {item.coverImageUrl ? (
                                          <div className="h-24 w-full overflow-hidden rounded-md bg-[hsl(var(--aia-tag))] md:h-24 md:w-40 md:shrink-0">
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
