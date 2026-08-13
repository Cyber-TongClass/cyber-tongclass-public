"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight, Check, RefreshCw, Save, Undo2, X } from "lucide-react"

import { MarkdownSplitEditor } from "@/components/markdown/markdown-split-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  useAdoptExternalNewsSnapshot,
  useDecideExternalNewsReview,
  useExternalNewsReviewDraft,
  useSaveExternalNewsReviewDraft,
} from "@/lib/api"

function formatTime(value?: number) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

export function ExternalNewsDraftEditor({ taskId, onComplete }: { taskId: string; onComplete?: () => void }) {
  const draft = useExternalNewsReviewDraft(taskId)
  const saveDraft = useSaveExternalNewsReviewDraft()
  const adoptSnapshot = useAdoptExternalNewsSnapshot()
  const decideReview = useDecideExternalNewsReview()
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [content, setContent] = useState("")
  const [coverImageUrl, setCoverImageUrl] = useState("")
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!draft) return
    setTitle(draft.title)
    setCategory(draft.category)
    setContent(draft.content)
    setCoverImageUrl(draft.coverImageUrl || "")
    setComment("")
    setMessage("")
    setError("")
  }, [draft])

  async function save() {
    setBusy("save")
    setError("")
    setMessage("")
    try {
      await saveDraft({ taskId, title, content, category, coverImageUrl })
      setMessage("已保存内网草稿。官网后续变化不会覆盖本次编辑。")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败，请稍后重试。")
    } finally {
      setBusy(null)
    }
  }

  async function adopt() {
    if (!window.confirm("确认采用官网最新内容？这会替换当前标题、正文、分类与封面地址。")) return
    setBusy("adopt")
    setError("")
    try {
      await adoptSnapshot({ taskId })
      setMessage("已采用官网最新快照，你仍可继续修改。")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "采用官网更新失败。")
    } finally {
      setBusy(null)
    }
  }

  async function decide(decision: "accept" | "request_changes" | "reject") {
    if ((decision === "request_changes" || decision === "reject") && !comment.trim()) {
      setError("退回修改或拒绝时必须填写意见。")
      return
    }
    setBusy(decision)
    setError("")
    setMessage("")
    try {
      if (decision === "accept") await saveDraft({ taskId, title, content, category, coverImageUrl })
      await decideReview({ taskId, decision, ...(comment.trim() ? { comment: comment.trim() } : {}) })
      setMessage(decision === "accept" ? "已接受，稿件进入发布审核。" : decision === "reject" ? "已拒绝该同步稿。" : "已退回修改。")
      onComplete?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "审阅操作失败，请稍后重试。")
    } finally {
      setBusy(null)
    }
  }

  if (!draft) return <p role="status" className="aia-text-muted py-10 text-sm">正在读取外网新闻草稿…</p>
  const editable = draft.taskStatus === "pending" || draft.taskStatus === "changes_requested"

  return (
    <section aria-label="外网新闻草稿编辑器" className="border-t aia-border-rule pt-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b aia-border-rule pb-5">
        <div>
          <p className="aia-kicker">Source review · 来源审阅</p>
          <h2 className="aia-serif mt-2 text-2xl font-semibold">编辑内网新闻草稿</h2>
          <p className="aia-mono mt-2 text-xs aia-text-muted">来源日期 {formatTime(draft.sourcePublishedAt)} · 内网更新 {formatTime(draft.internalUpdatedAt)}</p>
        </div>
        <a href={draft.sourceUrl} target="_blank" rel="noreferrer" className="aia-link aia-focus inline-flex min-h-11 items-center gap-1 text-sm font-medium">
          查看官网原文<ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      {draft.sourceUpdateAvailable ? (
        <div className="my-5 flex flex-wrap items-center justify-between gap-3 border-y aia-border-rule bg-[hsl(var(--aia-tag))] px-4 py-3">
          <p className="text-sm"><strong>官网内容已更新</strong>{draft.sourceSnapshot ? ` · 抓取于 ${formatTime(draft.sourceSnapshot.fetchedAt)}` : ""}</p>
          <Button type="button" variant="outline" className="rounded-none" disabled={busy !== null || !editable} onClick={() => void adopt()}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />采用官网更新
          </Button>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">标题
          <Input value={title} onChange={(event) => setTitle(event.target.value)} disabled={!editable || busy !== null} className="rounded-none" />
        </label>
        <label className="grid gap-2 text-sm font-medium">内网分类
          <Input value={category} onChange={(event) => setCategory(event.target.value)} disabled={!editable || busy !== null} className="rounded-none" />
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">封面图片地址（可选）
          <Input value={coverImageUrl} onChange={(event) => setCoverImageUrl(event.target.value)} disabled={!editable || busy !== null} className="rounded-none" />
        </label>
      </div>
      <div className="mt-6">
        <MarkdownSplitEditor id={`external-news-body-${taskId}`} value={content} onChange={setContent} disabled={!editable || busy !== null} minHeightClassName="min-h-[360px]" />
      </div>
      <label className="mt-6 grid gap-2 text-sm font-medium">审阅意见
        <Textarea value={comment} onChange={(event) => setComment(event.target.value)} disabled={!editable || busy !== null} placeholder="接受时可选；退回修改或拒绝时必填" className="min-h-24 rounded-none" />
      </label>

      {message ? <p role="status" className="mt-4 border-y aia-border-rule py-3 text-sm">{message}</p> : null}
      {error ? <p role="alert" className="mt-4 border-y aia-border-rule py-3 text-sm text-[hsl(var(--aia-red))]">{error}</p> : null}

      <div className="mt-6 flex flex-wrap justify-between gap-3 border-t aia-border-rule pt-5">
        <Button type="button" variant="outline" className="rounded-none" disabled={!editable || busy !== null} onClick={() => void save()}>
          <Save className="mr-2 h-4 w-4" aria-hidden="true" />{busy === "save" ? "正在保存…" : "保存草稿"}
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-none" disabled={!editable || busy !== null} onClick={() => void decide("request_changes")}>
            <Undo2 className="mr-2 h-4 w-4" aria-hidden="true" />退回修改
          </Button>
          <Button type="button" variant="outline" className="rounded-none text-[hsl(var(--aia-red))]" disabled={!editable || busy !== null} onClick={() => void decide("reject")}>
            <X className="mr-2 h-4 w-4" aria-hidden="true" />拒绝
          </Button>
          <Button type="button" className="rounded-none bg-[hsl(var(--aia-red))] hover:bg-[hsl(var(--aia-red-deep))]" disabled={!editable || busy !== null} onClick={() => void decide("accept")}>
            <Check className="mr-2 h-4 w-4" aria-hidden="true" />{busy === "accept" ? "正在提交…" : "接受并进入发布审批"}
          </Button>
        </div>
      </div>
    </section>
  )
}
