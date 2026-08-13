"use client"

import type { OADocumentSuggestion } from "@/lib/oa-document-templates"
import { cn } from "@/lib/utils"

const tone = {
  confirmed: "border-emerald-600/70 bg-emerald-500/10",
  unresolved: "border-amber-500/80 bg-amber-400/15",
  conflict: "border-[hsl(var(--aia-red))] bg-[hsl(var(--aia-red))]/10",
  ignored: "border-[hsl(var(--aia-rule))] bg-transparent opacity-50",
  deleted: "border-[hsl(var(--aia-rule))] bg-transparent opacity-30 line-through",
} as const

export function OADocumentCanvas({
  suggestions,
  activeRegionId,
  onActivate,
}: {
  suggestions: OADocumentSuggestion[]
  activeRegionId?: string
  onActivate: (regionId: string) => void
}) {
  return (
    <section aria-label="Word 文档结构预览" className="min-h-[42rem] bg-neutral-200/60 p-4 sm:p-8">
      <div className="mx-auto min-h-[56rem] max-w-[46rem] border aia-border-rule bg-white px-8 py-10 shadow-sm sm:px-14">
        <p className="aia-mono border-b aia-border-rule pb-3 text-[10px] uppercase tracking-[0.15em] aia-text-muted">
          结构化预览 · 非原始 Word HTML
        </p>
        <h2 className="aia-serif mt-8 text-center text-2xl font-semibold text-[hsl(var(--aia-ink))]">表单文档预览</h2>
        <p className="aia-text-muted mx-auto mt-3 max-w-lg text-center text-xs leading-5">
          平台根据表格、下划线、标签与控件推断填写区域。点击高亮区域可修改问题与输出方式。
        </p>
        <div className="mt-10 space-y-5">
          {suggestions.length === 0 ? (
            <p className="border border-dashed aia-border-rule px-4 py-12 text-center text-sm aia-text-muted">
              暂未识别到填写区域。可在右侧手动添加问题。
            </p>
          ) : suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              data-region-id={suggestion.id}
              aria-label={`填写区域 ${index + 1}：${suggestion.label}`}
              aria-pressed={activeRegionId === suggestion.id}
              onMouseEnter={() => onActivate(suggestion.id)}
              onFocus={() => onActivate(suggestion.id)}
              onClick={() => onActivate(suggestion.id)}
              className={cn(
                "aia-focus group flex w-full items-start gap-4 border-l-4 px-4 py-3 text-left transition-[outline,background-color,border-color]",
                tone[suggestion.reviewState],
                activeRegionId === suggestion.id && "outline outline-2 outline-offset-2 outline-[hsl(var(--aia-ink))]",
              )}
            >
              <span className="aia-mono mt-0.5 shrink-0 text-[10px] aia-text-muted">{String(index + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[hsl(var(--aia-ink))]">{suggestion.label}</span>
                <span className="aia-mono mt-1 block truncate text-[10px] aia-text-muted">{suggestion.path}</span>
              </span>
              <span className="h-5 min-w-28 border-b border-dotted border-current text-xs aia-text-muted" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
