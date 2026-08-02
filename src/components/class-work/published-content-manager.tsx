"use client"

import { useMemo, useState } from "react"
import { Pencil, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  useAdminEvents,
  useAllNews,
  useDeleteEvent,
  useDeleteNews,
  useUpdateEvent,
  useUpdateNews,
  type ContentReviewCategory,
} from "@/lib/api"

type PublishedRow = {
  _id: string
  title: string
  category?: string
  content?: string
  sourceUrl?: string
  date?: string
  time?: string
  location?: string
  description?: string
  isPublished?: boolean
}

export function PublishedContentManager({ category }: { category: ContentReviewCategory }) {
  const news = useAllNews({ limit: 200, disabled: category !== "news" }) as PublishedRow[] | undefined
  const events = useAdminEvents({ limit: 200, disabled: category !== "events" }) as PublishedRow[] | undefined
  const updateNews = useUpdateNews()
  const updateEvent = useUpdateEvent()
  const deleteNews = useDeleteNews()
  const deleteEvent = useDeleteEvent()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<PublishedRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const rows = useMemo(
    () => category === "news" ? (news || []).filter((row) => row.isPublished !== false) : (events || []),
    [category, events, news],
  )
  const loading = category === "news" ? news === undefined : events === undefined
  const noun = category === "news" ? "新闻" : "活动"

  function beginEdit(row: PublishedRow) {
    setEditingId(row._id)
    setDraft({ ...row })
    setError("")
  }

  async function save() {
    if (!draft || !editingId || !draft.title.trim()) return
    setBusy(true)
    setError("")
    try {
      if (category === "news") {
        await updateNews({
          id: editingId,
          title: draft.title.trim(),
          category: draft.category?.trim() || "新闻",
          content: draft.content || "",
          sourceUrl: draft.sourceUrl || "",
        })
      } else {
        await updateEvent({
          id: editingId,
          title: draft.title.trim(),
          date: draft.date || "",
          time: draft.time || undefined,
          location: draft.location || undefined,
          description: draft.description || undefined,
        })
      }
      setEditingId(null)
      setDraft(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败，请稍后重试。")
    } finally {
      setBusy(false)
    }
  }

  async function remove(row: PublishedRow) {
    if (!window.confirm(`确认删除「${row.title}」？此操作不可撤销。`)) return
    setBusy(true)
    setError("")
    try {
      if (category === "news") await deleteNews(row._id)
      else await deleteEvent(row._id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "删除失败，请稍后重试。")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby={`${category}-published-title`} className="mt-12 border-t aia-border-rule pt-8">
      <p className="aia-kicker">Published · 发布后管理</p>
      <h2 id={`${category}-published-title`} className="aia-serif mt-2 text-2xl font-semibold">已发布{noun}</h2>
      <p className="aia-text-muted mt-2 text-sm leading-6">拥有审核与管理权的成员可在这里编辑或删除已经发布的内容。</p>
      {error ? <p role="alert" className="mt-4 text-sm text-[hsl(var(--aia-red))]">{error}</p> : null}
      {loading ? (
        <p role="status" className="aia-text-muted border-b aia-border-rule py-8 text-sm">正在加载已发布{noun}…</p>
      ) : rows.length === 0 ? (
        <p className="aia-text-muted border-b aia-border-rule py-8 text-sm">暂无已发布{noun}。</p>
      ) : (
        <div className="mt-5 divide-y divide-[hsl(var(--aia-rule))] border-y aia-border-rule">
          {rows.map((row) => (
            <article key={row._id} className="py-5">
              {editingId === row._id && draft ? (
                <div className="grid gap-4">
                  <Input value={draft.title} aria-label={`${noun}标题`} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
                  {category === "news" ? (
                    <>
                      <Input value={draft.category || ""} aria-label="新闻栏目" onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
                      <Textarea value={draft.content || ""} aria-label="新闻正文" onChange={(event) => setDraft({ ...draft, content: event.target.value })} />
                    </>
                  ) : (
                    <>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Input type="date" value={draft.date || ""} aria-label="活动日期" onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
                        <Input type="time" value={draft.time || ""} aria-label="活动时间" onChange={(event) => setDraft({ ...draft, time: event.target.value })} />
                        <Input value={draft.location || ""} aria-label="活动地点" onChange={(event) => setDraft({ ...draft, location: event.target.value })} />
                      </div>
                      <Textarea value={draft.description || ""} aria-label="活动说明" onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
                    </>
                  )}
                  <div className="flex gap-2">
                    <Button type="button" disabled={busy} onClick={() => void save()}>保存修改</Button>
                    <Button type="button" variant="outline" disabled={busy} onClick={() => { setEditingId(null); setDraft(null) }}>
                      <X className="mr-2 h-4 w-4" aria-hidden="true" />取消
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="aia-serif text-lg font-semibold">{row.title}</h3>
                    <p className="aia-mono mt-1 text-xs aia-text-muted">
                      {category === "news" ? row.category || "新闻" : `${row.date || "日期待定"}${row.location ? ` · ${row.location}` : ""}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => beginEdit(row)}>
                      <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />编辑
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void remove(row)}>
                      <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />删除
                    </Button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
