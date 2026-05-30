"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Calendar, MapPin, Clock, ExternalLink } from "lucide-react"
import { useParams } from "next/navigation"
import { useEventById } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer"
import type { Event } from "@/types"

const eventTypeStyles = {
  "学术讲座": { bg: "bg-blue-500/10", text: "text-blue-600" },
  "学术会议": { bg: "bg-purple-500/10", text: "text-purple-600" },
  "学生活动": { bg: "bg-green-500/10", text: "text-green-600" },
  "通知公告": { bg: "bg-amber-500/10", text: "text-amber-600" },
  其他: { bg: "bg-slate-500/10", text: "text-slate-600" },
} as const

const colorToType: Record<string, keyof typeof eventTypeStyles> = {
  "#0F4C81": "学术讲座",
  "#DC143C": "学术会议",
  "#2E7D32": "学生活动",
  "#F57C00": "通知公告",
}

function getEventType(event: Event): keyof typeof eventTypeStyles {
  return colorToType[event.color] ?? "其他"
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  })
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>()
  const event = useEventById(params.id)

  if (event === undefined) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-500">加载中...</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <Button variant="ghost" asChild className="mb-6 -ml-3 gap-2">
            <Link href="/events">
              <ArrowLeft className="h-4 w-4" />
              返回活动列表
            </Link>
          </Button>
          <div className="max-w-3xl mx-auto text-center py-16">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">活动不存在</h2>
            <p className="text-slate-600">该活动可能已被删除或 ID 无效。</p>
          </div>
        </div>
      </div>
    )
  }

  const eventType = getEventType(event)
  const colorStyle = eventTypeStyles[eventType]

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <Button variant="ghost" asChild className="mb-6 -ml-3 gap-2">
          <Link href="/events">
            <ArrowLeft className="h-4 w-4" />
            返回活动列表
          </Link>
        </Button>

        <article className="max-w-4xl mx-auto">
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${colorStyle.bg} ${colorStyle.text}`}>
                {eventType}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 mb-6">{event.title}</h1>

            <div className="flex flex-wrap gap-6 text-slate-600 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>{formatDate(event.date)}</span>
              </div>
              {event.time && (
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span>{event.time}</span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <span>{event.location}</span>
                </div>
              )}

              <div className="flex items-center gap-2 ml-auto">
                {event.url && (
                  <Button asChild>
                    <a href={event.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      访问链接
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </header>

          {event.description && (
            <div className="bg-white p-6 shadow-sm">
              <MarkdownRenderer content={event.description} className="text-base" />
            </div>
          )}

          <div className="mt-8">
            <Button variant="outline" asChild>
              <Link href="/events">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回活动列表
              </Link>
            </Button>
          </div>
        </article>
      </div>
    </div>
  )
}
