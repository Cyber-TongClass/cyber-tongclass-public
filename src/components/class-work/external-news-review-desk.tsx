"use client"

import { useEffect, useState } from "react"
import { ArrowRight, RefreshCw } from "lucide-react"

import { ExternalNewsDraftEditor } from "@/components/class-work/external-news-draft-editor"
import { useExternalNewsReviewQueue } from "@/lib/api"
import { cn } from "@/lib/utils"

function formatTime(value?: number) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

export function ExternalNewsReviewDesk() {
  const queue = useExternalNewsReviewQueue()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedTaskId && queue?.[0]) setSelectedTaskId(queue[0].taskId)
    if (selectedTaskId && queue && !queue.some((item) => item.taskId === selectedTaskId)) setSelectedTaskId(queue[0]?.taskId ?? null)
  }, [queue, selectedTaskId])

  if (queue === undefined) return <p role="status" className="aia-text-muted py-12 text-sm">正在加载分配给你的官网新闻…</p>
  if (queue.length === 0) {
    return (
      <div className="mt-8 border-y aia-border-rule py-12">
        <p className="aia-serif text-xl font-semibold">当前没有待审阅的官网新闻</p>
        <p className="aia-text-muted mt-2 text-sm">机器人生成草稿并分配给你后，会出现在这里。</p>
      </div>
    )
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
      <aside aria-label="待审阅官网新闻" className="border-y aia-border-rule lg:sticky lg:top-24">
        <div className="flex items-center justify-between border-b aia-border-rule py-3">
          <p className="aia-mono text-xs uppercase tracking-[0.12em] aia-text-muted">Assigned · {queue.length}</p>
        </div>
        <ul>
          {queue.map((item, index) => (
            <li key={item.taskId} className="border-b aia-border-rule last:border-b-0">
              <button
                type="button"
                onClick={() => setSelectedTaskId(item.taskId)}
                aria-pressed={selectedTaskId === item.taskId}
                className={cn(
                  "aia-focus group w-full px-3 py-4 text-left transition-colors",
                  selectedTaskId === item.taskId ? "bg-[hsl(var(--aia-warm))]" : "hover:bg-[hsl(var(--aia-tag))]",
                )}
              >
                <span className="aia-mono text-[0.68rem] uppercase tracking-[0.12em] text-[hsl(var(--aia-red))]">{String(index + 1).padStart(2, "0")} · {item.category}</span>
                <span className="aia-serif mt-2 block font-semibold leading-snug">{item.title}</span>
                <span className="aia-text-muted mt-2 block text-xs">来源 {formatTime(item.sourcePublishedAt)} · 抓取 {formatTime(item.lastFetchedAt)}</span>
                <span className="mt-3 flex items-center justify-between text-xs">
                  <span className="aia-mono aia-text-muted">{item.taskStatus === "changes_requested" ? "待修改" : "待审阅"}</span>
                  {item.sourceUpdateAvailable ? <span className="inline-flex items-center gap-1 text-[hsl(var(--aia-red))]"><RefreshCw className="h-3.5 w-3.5" />官网已更新</span> : <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="min-w-0">
        {selectedTaskId ? <ExternalNewsDraftEditor taskId={selectedTaskId} onComplete={() => setSelectedTaskId(null)} /> : null}
      </div>
    </div>
  )
}
