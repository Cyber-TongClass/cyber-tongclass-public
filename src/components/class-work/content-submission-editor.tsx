"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Send } from "lucide-react"

import { MarkdownSplitEditor } from "@/components/markdown/markdown-split-editor"
import { OaScopePicker } from "@/components/oa/oa-scope-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  useSubmitContentForReview,
  type ContentReviewCategory,
  type ContentSubmissionPayload,
} from "@/lib/api"
import type { OAUserScope } from "@/lib/oa-forms"

const fieldClassName = "aia-focus mt-2 h-11 rounded-none border-x-0 border-t-0 border-b aia-border-rule bg-transparent px-0 shadow-none"
const labels = {
  news: { noun: "新闻", eyebrow: "NEWS DESK" },
  events: { noun: "活动", eyebrow: "EVENTS DESK" },
} as const

export function ContentSubmissionEditor({ category }: { category: ContentReviewCategory }) {
  const router = useRouter()
  const submitForReview = useSubmitContentForReview()
  const [title, setTitle] = useState("")
  const [payload, setPayload] = useState<ContentSubmissionPayload>({})
  const [scope, setScope] = useState<OAUserScope>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const copy = labels[category]

  const update = (key: keyof ContentSubmissionPayload, value: string) => {
    setPayload((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setError(null)
    if (!title.trim()) {
      setError("请填写标题。")
      return
    }
    if (category === "news" && !payload.content?.trim()) {
      setError("请填写新闻正文。")
      return
    }
    if (category === "events" && !payload.date?.trim()) {
      setError("请填写活动日期。")
      return
    }

    setIsSubmitting(true)
    try {
      const request: Parameters<typeof submitForReview>[0] & { idempotencyKey: string } = {
        category,
        title: title.trim(),
        payload,
        targetScope: scope as Record<string, unknown>,
        idempotencyKey: crypto.randomUUID(),
      }
      const submissionId = await submitForReview(request)
      router.push(`/class-work/${category}/submissions/${submissionId}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "提交失败，请稍后重试。")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8">
      <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-8">
          <div>
            <label htmlFor={`${category}-title`} className="aia-mono text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--aia-ink))]">
              {copy.noun}标题
            </label>
            <Input id={`${category}-title`} value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClassName} placeholder={`输入${copy.noun}标题`} disabled={isSubmitting} />
          </div>

          {category === "news" ? (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="news-category" className="aia-mono text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--aia-ink))]">新闻栏目</label>
                  <Input id="news-category" value={payload.newsCategory || ""} onChange={(event) => update("newsCategory", event.target.value)} className={fieldClassName} placeholder="例如：学院新闻" disabled={isSubmitting} />
                </div>
                <div>
                  <label htmlFor="news-source-url" className="aia-mono text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--aia-ink))]">来源链接</label>
                  <Input id="news-source-url" type="url" value={payload.sourceUrl || ""} onChange={(event) => update("sourceUrl", event.target.value)} className={fieldClassName} placeholder="https://" disabled={isSubmitting} />
                </div>
              </div>
              <div>
                <label htmlFor="news-cover-image" className="aia-mono text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--aia-ink))]">封面图片链接</label>
                <Input id="news-cover-image" type="url" value={payload.coverImageUrl || ""} onChange={(event) => update("coverImageUrl", event.target.value)} className={fieldClassName} placeholder="https://" disabled={isSubmitting} />
              </div>
              <div>
                <p className="aia-mono mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--aia-ink))]">新闻正文</p>
                <MarkdownSplitEditor id="news-content" value={payload.content || ""} onChange={(value) => update("content", value)} disabled={isSubmitting} minHeightClassName="min-h-[320px]" />
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="event-date" className="aia-mono text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--aia-ink))]">活动日期</label>
                  <Input id="event-date" type="date" value={payload.date || ""} onChange={(event) => update("date", event.target.value)} className={fieldClassName} disabled={isSubmitting} />
                </div>
                <div>
                  <label htmlFor="event-time" className="aia-mono text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--aia-ink))]">开始时间</label>
                  <Input id="event-time" type="time" value={payload.time || ""} onChange={(event) => update("time", event.target.value)} className={fieldClassName} disabled={isSubmitting} />
                </div>
                <div>
                  <label htmlFor="event-end-date" className="aia-mono text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--aia-ink))]">结束日期</label>
                  <Input id="event-end-date" type="date" value={payload.endDate || ""} onChange={(event) => update("endDate", event.target.value)} className={fieldClassName} disabled={isSubmitting} />
                </div>
                <div>
                  <label htmlFor="event-end-time" className="aia-mono text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--aia-ink))]">结束时间</label>
                  <Input id="event-end-time" type="time" value={payload.endTime || ""} onChange={(event) => update("endTime", event.target.value)} className={fieldClassName} disabled={isSubmitting} />
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="event-location" className="aia-mono text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--aia-ink))]">活动地点</label>
                  <Input id="event-location" value={payload.location || ""} onChange={(event) => update("location", event.target.value)} className={fieldClassName} placeholder="线下地点或线上平台" disabled={isSubmitting} />
                </div>
                <div>
                  <label htmlFor="event-url" className="aia-mono text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--aia-ink))]">活动链接</label>
                  <Input id="event-url" type="url" value={payload.url || ""} onChange={(event) => update("url", event.target.value)} className={fieldClassName} placeholder="https://" disabled={isSubmitting} />
                </div>
              </div>
              <div>
                <p className="aia-mono mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--aia-ink))]">活动说明</p>
                <MarkdownSplitEditor id="event-description" value={payload.description || ""} onChange={(value) => update("description", value)} disabled={isSubmitting} minHeightClassName="min-h-[260px]" />
              </div>
            </>
          )}
        </div>

        <aside className="self-start border-t aia-border-rule pt-5 lg:sticky lg:top-24">
          <p className="aia-mono text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--aia-red))]">{copy.eyebrow}</p>
          <h2 className="aia-serif mt-3 text-xl font-semibold text-[hsl(var(--aia-ink))]">可见范围</h2>
          <p className="aia-text-muted mt-2 text-sm leading-6">审核通过后，仅匹配所选资格组、课题组、用户组或账号的成员可见。未选择时面向研究院全体成员。</p>
          <div className="mt-4">
            <OaScopePicker
              scope={scope}
              onChange={setScope}
              idPrefix={`${category}-audience`}
              ariaLabel={`${copy.noun}可见范围`}
              allowEmpty
              includeEveryoneOption
            />
          </div>
          <div className="mt-7 border-t aia-border-rule pt-5">
            <p className="aia-text-muted text-sm leading-6">提交后将进入并行审核，不会直接发布。审核结果会通过站内信通知你。</p>
            {error ? <p role="alert" className="mt-3 border-y aia-border-rule py-3 text-sm text-[hsl(var(--aia-red))]">{error}</p> : null}
            <Button type="submit" disabled={isSubmitting} className="mt-5 w-full rounded-none bg-[hsl(var(--aia-red))] hover:bg-[hsl(var(--aia-red-deep))]">
              {isSubmitting ? "正在提交…" : <><Send className="mr-2 h-4 w-4" aria-hidden="true" />提交审核<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></>}
            </Button>
          </div>
        </aside>
      </div>
    </form>
  )
}
