"use client"

import * as React from "react"
import Link from "next/link"
import { CalendarDays, Clock, MapPin, Newspaper, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEvents, useNews } from "@/lib/api"
import {
  AUDIENCE_OPTIONS,
  filterUpdates,
  getAudienceLabel,
  getAvailableTags,
  mergeUpdates,
  type Audience,
} from "@/lib/updates"

export default function UpdatesPage() {
  const newsData = useNews()
  const eventsData = useEvents()
  const [selectedAudiences, setSelectedAudiences] = React.useState<Audience[]>([])
  const [selectedTags, setSelectedTags] = React.useState<string[]>([])

  const updates = React.useMemo(
    () => mergeUpdates((newsData || []) as any[], (eventsData || []) as any[]),
    [eventsData, newsData],
  )
  const availableTags = React.useMemo(() => getAvailableTags(updates), [updates])
  const filteredUpdates = React.useMemo(
    () => filterUpdates(updates, { audiences: selectedAudiences, tags: selectedTags }),
    [selectedAudiences, selectedTags, updates],
  )
  const isLoading = newsData === undefined || eventsData === undefined

  const toggleAudience = (audience: Audience) => {
    setSelectedAudiences((current) => (
      current.includes(audience) ? current.filter((value) => value !== audience) : [...current, audience]
    ))
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => (
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]
    ))
  }

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)]">
      <section className="relative overflow-hidden bg-primary">
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 select-none whitespace-nowrap text-[5rem] font-extrabold tracking-[0.15em] text-white/5 md:text-[8rem] lg:text-[10rem]" aria-hidden="true">
            UPDATES
          </div>
          <div className="relative flex items-center gap-3">
            <Newspaper className="h-8 w-8 text-white/80" />
            <h1 className="text-5xl font-extrabold tracking-tight text-white md:text-7xl">动态</h1>
          </div>
          <p className="relative mt-4 max-w-2xl text-lg text-white/70">集中查看通班新闻与活动，并按面向人群和自定义分类筛选。</p>
        </div>
      </section>

      <section className="sticky top-16 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-medium text-slate-700">可见范围</span>
            <Button
              type="button"
              size="sm"
              variant={selectedAudiences.length === 0 ? "default" : "outline"}
              onClick={() => setSelectedAudiences([])}
            >
              全部
            </Button>
            {AUDIENCE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={selectedAudiences.includes(option.value) ? "default" : "outline"}
                onClick={() => toggleAudience(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {availableTags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 flex items-center gap-1 text-sm font-medium text-slate-700"><Tag className="h-3.5 w-3.5" />分类</span>
              {availableTags.map((tag) => (
                <Button
                  key={tag}
                  type="button"
                  size="sm"
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500">正在加载动态…</div>
        ) : filteredUpdates.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarDays className="mx-auto mb-4 h-12 w-12 text-slate-400" />
            <h2 className="text-lg font-extrabold text-slate-900">未找到相关动态</h2>
            <p className="mt-2 text-slate-500">尝试调整可见范围或分类筛选条件。</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">共 {filteredUpdates.length} 条动态</p>
            {filteredUpdates.map((item) => (
              <Link key={`${item.type}-${item.id}`} href={item.href} className="group block">
                <article className="flex gap-4 border-l-[3px] border-transparent bg-white p-4 shadow-sm transition-all hover:border-primary hover:bg-slate-50 md:p-5">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="hidden h-28 w-40 shrink-0 rounded-md object-cover sm:block" />
                  ) : (
                    <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:flex">
                      {item.type === "news" ? <Newspaper className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-primary px-2.5 py-0.5 font-medium text-white">{item.type === "news" ? "新闻" : "活动"}</span>
                      {item.category ? <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600">{item.category}</span> : null}
                      <span className="flex items-center gap-1 text-slate-500"><Clock className="h-3 w-3" />{item.dateLabel}</span>
                    </div>
                    <h2 className="text-lg font-extrabold text-slate-900 transition-colors group-hover:text-primary">{item.title}</h2>
                    {item.summary ? <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.summary}</p> : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      {item.audiences.map((audience) => (
                        <span key={audience} className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700">{getAudienceLabel(audience)}</span>
                      ))}
                      {item.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-700">{tag}</span>
                      ))}
                      {item.location ? <span className="ml-auto flex items-center gap-1 text-slate-500"><MapPin className="h-3 w-3" />{item.location}</span> : null}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
