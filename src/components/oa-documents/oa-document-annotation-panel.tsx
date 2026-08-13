"use client"

import { Check, CircleAlert, EyeOff, Plus, Trash2 } from "lucide-react"

import type { OADocumentSuggestion } from "@/lib/oa-document-templates"
import { cn } from "@/lib/utils"

const labels = {
  confirmed: "已确认",
  unresolved: "待确认",
  conflict: "有冲突",
  ignored: "已忽略",
  deleted: "已删除",
} as const

const dots = {
  confirmed: "bg-emerald-600",
  unresolved: "bg-amber-500",
  conflict: "bg-[hsl(var(--aia-red))]",
  ignored: "bg-neutral-400",
  deleted: "bg-neutral-300",
} as const

export function OADocumentAnnotationPanel({
  suggestions,
  activeRegionId,
  onActivate,
  onAdd,
  onDecision,
}: {
  suggestions: OADocumentSuggestion[]
  activeRegionId?: string
  onActivate: (regionId: string) => void
  onAdd: () => void
  onDecision: (regionId: string, state: "confirmed" | "ignored" | "deleted") => void
}) {
  return (
    <aside aria-label="识别批注" className="border-l aia-border-rule bg-[hsl(var(--aia-paper))]">
      <div className="sticky top-0 z-10 border-b aia-border-rule bg-[hsl(var(--aia-paper))] px-4 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="aia-serif text-lg font-semibold text-[hsl(var(--aia-ink))]">识别对象</h2>
          <span className="aia-mono text-[10px] aia-text-muted">{suggestions.length} 项</span>
        </div>
        <button type="button" onClick={onAdd} className="aia-focus aia-mono mt-3 inline-flex items-center gap-1.5 text-xs text-[hsl(var(--aia-red))]">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />添加问题
        </button>
      </div>
      <ol className="max-h-[70vh] overflow-y-auto">
        {suggestions.map((suggestion, index) => (
          <li key={suggestion.id} className="border-b aia-border-rule">
            <button
              type="button"
              data-region-id={suggestion.id}
              onMouseEnter={() => onActivate(suggestion.id)}
              onFocus={() => onActivate(suggestion.id)}
              onClick={() => onActivate(suggestion.id)}
              className={cn(
                "aia-focus w-full px-4 py-4 text-left transition-colors hover:bg-[hsl(var(--aia-tag))]",
                activeRegionId === suggestion.id && "bg-[hsl(var(--aia-tag))]",
              )}
            >
              <span className="flex items-start gap-3">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dots[suggestion.reviewState])} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[hsl(var(--aia-ink))]">{suggestion.label}</span>
                  <span className="aia-mono mt-1 block text-[10px] aia-text-muted">
                    {String(index + 1).padStart(2, "0")} · {labels[suggestion.reviewState]}
                  </span>
                </span>
                {suggestion.reviewState === "conflict" ? <CircleAlert className="h-4 w-4 text-[hsl(var(--aia-red))]" aria-label="冲突" /> : null}
              </span>
            </button>
            {activeRegionId === suggestion.id ? (
              <div className="flex gap-1 px-4 pb-4 pl-9">
                <button type="button" onClick={() => onDecision(suggestion.id, "confirmed")} className="aia-focus p-2 text-emerald-700" aria-label="确认该问题"><Check className="h-4 w-4" /></button>
                <button type="button" onClick={() => onDecision(suggestion.id, "ignored")} className="aia-focus p-2 aia-text-muted" aria-label="忽略该问题"><EyeOff className="h-4 w-4" /></button>
                <button type="button" onClick={() => onDecision(suggestion.id, "deleted")} className="aia-focus p-2 text-[hsl(var(--aia-red))]" aria-label="删除该问题"><Trash2 className="h-4 w-4" /></button>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </aside>
  )
}
