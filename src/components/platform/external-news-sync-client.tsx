"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Loader2, Play, Save } from "lucide-react"

import { OaScopePicker } from "@/components/oa/oa-scope-picker"
import { Button } from "@/components/ui/button"
import {
  useExternalNewsSyncOperations,
  useRunExternalNewsSyncNow,
  useSaveExternalNewsSyncSettings,
} from "@/lib/api"
import type { OAUserScope } from "@/lib/oa-forms"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/hooks/use-auth"

function formatTime(value?: number) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

const statusLabels = {
  running: "运行中",
  completed: "完成",
  partial_failure: "部分失败",
  failed: "失败",
} as const

export function ExternalNewsSyncClient() {
  const { isLoading, isSuperAdmin } = useAuth()
  const operations = useExternalNewsSyncOperations(!isLoading && isSuperAdmin)
  const saveSettings = useSaveExternalNewsSyncSettings()
  const runNow = useRunExternalNewsSyncNow()
  const [enabled, setEnabled] = useState(false)
  const [mode, setMode] = useState<"observation" | "draft">("observation")
  const [reviewerMode, setReviewerMode] = useState<"scope" | "all_reviewers">("all_reviewers")
  const [reviewerScope, setReviewerScope] = useState<OAUserScope>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!operations) return
    setEnabled(operations.settings.enabled)
    setMode(operations.settings.mode)
    setReviewerMode(operations.settings.reviewerMode)
    setReviewerScope(operations.settings.reviewerScope || {})
  }, [operations])

  async function save() {
    setBusy("save")
    setError("")
    setMessage("")
    try {
      const result = await saveSettings({ enabled, mode, reviewerMode, ...(reviewerMode === "scope" ? { reviewerScope } : {}) }) as { reviewerCount?: number }
      setMessage(`设置已保存，将向 ${result?.reviewerCount ?? 0} 位有效审阅人分配新稿。`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存同步设置失败。")
    } finally {
      setBusy(null)
    }
  }

  async function run() {
    if (!window.confirm(`确认立即运行一次${mode === "observation" ? "观察" : "草稿"}模式同步？`)) return
    setBusy("run")
    setError("")
    setMessage("")
    try {
      await runNow()
      setMessage("同步任务已进入后台运行，下方运行记录会自动更新。")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "启动同步失败。")
    } finally {
      setBusy(null)
    }
  }

  if (isLoading) return <p role="status" className="aia-text-muted py-12 text-sm">正在确认平台管理权限…</p>
  if (!isSuperAdmin) return <div role="alert" className="mt-10 border-y aia-border-rule py-8"><h2 className="aia-serif text-xl font-semibold">只有超级管理员可以管理官网新闻同步</h2><p className="aia-text-muted mt-2 text-sm">当前账号不能读取同步设置、健康状态或运行记录。</p></div>
  if (!operations) return <p role="status" className="aia-text-muted py-12 text-sm">正在读取同步配置与运行状态…</p>

  return (
    <div className="mt-10 space-y-12">
      <section aria-labelledby="external-news-settings" className="border-y aia-border-rule py-7">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
          <div>
            <p className="aia-kicker">Automation · 自动化</p>
            <h2 id="external-news-settings" className="aia-serif mt-2 text-2xl font-semibold">同步与草稿策略</h2>
            <p className="aia-text-muted mt-2 max-w-2xl text-sm leading-6">观察模式只记录官网变化；草稿模式会生成内网稿件并进入来源审阅。建议先确认四个栏目稳定，再切换草稿模式。</p>

            <label className="mt-6 flex min-h-11 cursor-pointer items-center justify-between gap-4 border-y aia-border-rule py-3 text-sm font-medium">
              启用每小时自动同步
              <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="aia-focus h-5 w-5 accent-[hsl(var(--aia-red))]" />
            </label>

            <fieldset className="mt-6">
              <legend className="aia-mono text-xs font-semibold uppercase tracking-[0.12em] aia-text-muted">运行模式</legend>
              <div className="mt-2 inline-flex border aia-border-rule">
                {([['observation', '观察模式'], ['draft', '草稿模式']] as const).map(([value, label]) => (
                  <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={cn("aia-focus min-h-11 px-4 text-sm", mode === value ? "bg-[hsl(var(--aia-ink))] text-white" : "hover:bg-[hsl(var(--aia-tag))]")}>{label}</button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="border-l aia-border-rule pl-0 lg:pl-7">
            <p className="aia-mono text-xs font-semibold uppercase tracking-[0.12em] aia-text-muted">Reviewer routing</p>
            <fieldset className="mt-3 space-y-2">
              <legend className="sr-only">审阅人分配方式</legend>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 border-b aia-border-rule text-sm"><input type="radio" checked={reviewerMode === "all_reviewers"} onChange={() => setReviewerMode("all_reviewers")} />所有具有新闻来源审阅权的账号</label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 border-b aia-border-rule text-sm"><input type="radio" checked={reviewerMode === "scope"} onChange={() => setReviewerMode("scope")} />指定人员或人员组</label>
            </fieldset>
            {reviewerMode === "scope" ? (
              <div className="mt-4"><OaScopePicker scope={reviewerScope} onChange={setReviewerScope} idPrefix="external-news-reviewer" ariaLabel="选择外网新闻审阅人" allowEmpty={false} /></div>
            ) : null}
            <p className="aia-text-muted mt-4 text-xs leading-5">当前有效预览：{operations.reviewerPreview.count} 人{operations.reviewerPreview.labels.length ? ` · ${operations.reviewerPreview.labels.slice(0, 5).join("、")}` : ""}</p>
          </div>
        </div>

        {message ? <p role="status" className="mt-5 border-y aia-border-rule py-3 text-sm">{message}</p> : null}
        {error ? <p role="alert" className="mt-5 border-y aia-border-rule py-3 text-sm text-[hsl(var(--aia-red))]">{error}</p> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" className="rounded-none" disabled={busy !== null} onClick={() => void save()}><Save className="mr-2 h-4 w-4" />{busy === "save" ? "正在保存…" : "保存设置"}</Button>
          <Button type="button" className="rounded-none bg-[hsl(var(--aia-red))] hover:bg-[hsl(var(--aia-red-deep))]" disabled={busy !== null} onClick={() => void run()}>{busy === "run" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}立即同步</Button>
        </div>
      </section>

      <section aria-labelledby="external-news-health">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b aia-border-rule pb-3">
          <div><p className="aia-kicker">Sources · 四个固定栏目</p><h2 id="external-news-health" className="aia-serif mt-2 text-2xl font-semibold">来源健康状态</h2></div>
          <p className="aia-mono text-xs aia-text-muted">来源地址固定，不接受自定义 URL 或选择器</p>
        </div>
        <div className="divide-y divide-[hsl(var(--aia-rule))] border-b aia-border-rule">
          {operations.sources.map((source, index) => (
            <article key={source.key} className="grid gap-3 py-5 md:grid-cols-[3rem_minmax(0,1fr)_repeat(3,minmax(8rem,auto))] md:items-center">
              <span className="aia-mono text-xs aia-text-muted">{String(index + 1).padStart(2, "0")}</span>
              <div><p className="font-semibold">{source.label}</p><a href={source.listUrl} target="_blank" rel="noreferrer" className="aia-link aia-focus mt-1 inline-flex items-center gap-1 text-xs">固定来源<ExternalLink className="h-3.5 w-3.5" /></a></div>
              <p className="text-xs"><span className="aia-text-muted block">最近尝试</span>{formatTime(source.health?.lastAttemptAt)}</p>
              <p className="text-xs"><span className="aia-text-muted block">最近成功</span>{formatTime(source.health?.lastSuccessAt)}</p>
              <p className="text-xs"><span className="aia-text-muted block">连续失败 / 发现</span>{source.health?.consecutiveFailures ?? 0} / {source.health?.lastDiscoveredCount ?? 0}{source.health?.lastFailureCode ? <span className="mt-1 block text-[hsl(var(--aia-red))]">{source.health.lastFailureCode}</span> : null}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="external-news-runs">
        <div className="border-b aia-border-rule pb-3"><p className="aia-kicker">Runs · 最近 20 次</p><h2 id="external-news-runs" className="aia-serif mt-2 text-2xl font-semibold">运行记录</h2></div>
        {operations.runs.length === 0 ? <p className="aia-text-muted border-b aia-border-rule py-8 text-sm">暂无同步运行记录。</p> : (
          <div className="overflow-x-auto border-b aia-border-rule"><table className="w-full min-w-[760px] text-left text-sm"><thead className="aia-mono text-xs uppercase tracking-[0.1em] aia-text-muted"><tr><th className="py-3 pr-4">启动时间</th><th className="py-3 pr-4">触发</th><th className="py-3 pr-4">模式</th><th className="py-3 pr-4">状态</th><th className="py-3 pr-4">发现</th><th className="py-3 pr-4">草稿</th><th className="py-3">失败</th></tr></thead><tbody>{operations.runs.map((run) => <tr key={run._id} className="border-t aia-border-rule"><td className="py-3 pr-4">{formatTime(run.startedAt)}</td><td className="py-3 pr-4">{run.trigger === "manual" ? "手动" : "定时"}</td><td className="py-3 pr-4">{run.mode === "draft" ? "草稿" : "观察"}</td><td className="py-3 pr-4">{statusLabels[run.status]}</td><td className="py-3 pr-4">{run.discoveredCount}</td><td className="py-3 pr-4">{run.draftCount}</td><td className="py-3">{run.failureCount}</td></tr>)}</tbody></table></div>
        )}
      </section>
    </div>
  )
}
