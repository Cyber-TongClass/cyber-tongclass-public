"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, FileCheck2, Save } from "lucide-react"

import type { OADocumentSuggestion, OADocumentTemplateManifest } from "@/lib/oa-document-templates"
import { countTemplateReviewStates, createStableDocumentFieldId } from "@/lib/oa-document-templates"
import { OADocumentAnnotationPanel } from "./oa-document-annotation-panel"
import { OADocumentCanvas } from "./oa-document-canvas"
import { OADocumentFieldEditor } from "./oa-document-field-editor"

function newSuggestion(index: number): OADocumentSuggestion {
  const id = `manual_${Date.now()}_${index}`
  return {
    id,
    kind: "label_blank",
    label: "新问题",
    inferredAnswerType: "text",
    confidence: "medium",
    reviewState: "unresolved",
    evidence: ["手动添加"],
    conflictIds: [],
    partName: "word/document.xml",
    path: `/manual/${id}`,
    contextHash: id,
  }
}

export function OADocumentWorkbench({
  initialManifest,
  onSave,
  onChange,
  onCompile,
  compiling = false,
}: {
  initialManifest: OADocumentTemplateManifest
  onSave: (manifest: OADocumentTemplateManifest) => Promise<void>
  onChange?: (manifest: OADocumentTemplateManifest) => void
  onCompile?: (manifest: OADocumentTemplateManifest) => Promise<void>
  compiling?: boolean
}) {
  const [manifest, setManifest] = useState(initialManifest)
  const [activeRegionId, setActiveRegionId] = useState(initialManifest.suggestions[0]?.id)
  const [page, setPage] = useState(1)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const counts = useMemo(() => countTemplateReviewStates(manifest.suggestions), [manifest.suggestions])
  const active = manifest.suggestions.find((item) => item.id === activeRegionId)

  const commit = (next: OADocumentTemplateManifest) => {
    setManifest(next)
    onChange?.(next)
  }
  const updateSuggestion = (next: OADocumentSuggestion) => {
    commit({ ...manifest, suggestions: manifest.suggestions.map((item) => item.id === next.id ? next : item) })
  }
  const decide = (id: string, reviewState: "confirmed" | "ignored" | "deleted") => {
    commit({
      ...manifest,
      suggestions: manifest.suggestions.map((item) => item.id === id
        ? { ...item, reviewState, fieldId: reviewState === "confirmed" ? (item.fieldId || createStableDocumentFieldId(item.label, item.path)) : item.fieldId }
        : item),
    })
  }
  const save = async () => {
    setSaving(true); setMessage("")
    try { await onSave(manifest); setMessage("批注已保存。") }
    catch (error) { setMessage(error instanceof Error ? error.message : "保存失败，请重试。") }
    finally { setSaving(false) }
  }
  const compile = async () => {
    if (!onCompile || counts.unresolved > 0 || counts.conflicts > 0) return
    setMessage("")
    try { await onCompile(manifest); setMessage("模板已编译并启用，字段已合并到收集表单。") }
    catch (error) { setMessage(error instanceof Error ? error.message : "编译失败，请重试。") }
  }

  return (
    <div className="border-y aia-border-rule bg-[hsl(var(--aia-paper))]">
      <header className="flex flex-wrap items-center gap-4 border-b aia-border-rule px-4 py-3 sm:px-6">
        <div>
          <p className="aia-kicker">Word 智能表单</p>
          <h1 className="aia-serif mt-1 text-xl font-semibold text-[hsl(var(--aia-ink))]">识别与批注工作台</h1>
        </div>
        <div className="aia-mono ml-auto flex flex-wrap gap-3 text-[10px] aia-text-muted" aria-live="polite">
          <span className="text-emerald-700">{counts.confirmed} 已确认</span><span className="text-amber-700">{counts.unresolved} 待确认</span><span className="text-[hsl(var(--aia-red))]">{counts.conflicts} 冲突</span>
        </div>
        <button type="button" onClick={save} disabled={saving} className="aia-focus inline-flex items-center gap-2 border border-[hsl(var(--aia-ink))] px-3 py-2 text-sm disabled:opacity-50">
          <Save className="h-4 w-4" aria-hidden="true" />{saving ? "保存中…" : "保存批注"}
        </button>
        {onCompile ? (
          <button
            type="button"
            onClick={() => void compile()}
            disabled={saving || compiling || counts.unresolved > 0 || counts.conflicts > 0}
            className="aia-focus inline-flex items-center gap-2 bg-[hsl(var(--aia-ink))] px-3 py-2 text-sm text-[hsl(var(--aia-paper))] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileCheck2 className="h-4 w-4" aria-hidden="true" />{compiling ? "正在编译…" : "编译并启用"}
          </button>
        ) : null}
        {message ? <p role="status" className="w-full text-right text-xs aia-text-muted">{message}</p> : null}
      </header>
      <div className="grid lg:grid-cols-[5rem_minmax(0,1fr)_20rem]">
        <nav aria-label="文档页码" className="hidden border-r aia-border-rule px-2 py-4 lg:block">
          <button type="button" onClick={() => setPage(Math.max(1, page - 1))} className="aia-focus w-full p-2" aria-label="上一页"><ChevronLeft className="mx-auto h-4 w-4" /></button>
          <p className="aia-mono py-3 text-center text-xs">{String(page).padStart(2, "0")}</p>
          <button type="button" onClick={() => setPage(page + 1)} className="aia-focus w-full p-2" aria-label="下一页"><ChevronRight className="mx-auto h-4 w-4" /></button>
        </nav>
        <OADocumentCanvas
          page={page}
          pageCount={1}
          previewPageUrl="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 595 842'%3E%3Crect width='595' height='842' fill='white'/%3E%3Ctext x='297.5' y='421' text-anchor='middle' fill='%23737373' font-size='14'%3EPDF preview pending%3C/text%3E%3C/svg%3E"
          suggestions={manifest.suggestions}
          activeRegionId={activeRegionId}
          mode="select"
          onActivate={setActiveRegionId}
          onDraw={() => undefined}
          onChange={() => undefined}
          onDelete={(id) => decide(id, "deleted")}
          onEdit={setActiveRegionId}
        />
        <OADocumentAnnotationPanel
          suggestions={manifest.suggestions}
          activeRegionId={activeRegionId}
          onActivate={setActiveRegionId}
          onAdd={() => {
            const suggestion = newSuggestion(manifest.suggestions.length)
            commit({ ...manifest, suggestions: [...manifest.suggestions, suggestion] })
            setActiveRegionId(suggestion.id)
          }}
          onDecision={decide}
        />
      </div>
      <OADocumentFieldEditor suggestion={active} onChange={updateSuggestion} />
      {(counts.unresolved > 0 || counts.conflicts > 0) ? (
        <p role="alert" className="border-t aia-border-rule bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6">
          仍有 {counts.unresolved} 个待确认对象与 {counts.conflicts} 个冲突；全部处理后才能编译并启用模板。
        </p>
      ) : null}
    </div>
  )
}
