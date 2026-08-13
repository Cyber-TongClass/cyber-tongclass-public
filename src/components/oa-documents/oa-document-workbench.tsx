"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, FileCheck2, MousePointer2, Pencil, Save } from "lucide-react"

import { getTongClassStoredSessionToken } from "@/lib/api"
import { hasBlockingDocumentReview } from "@/lib/oa-document-template-client"
import type {
  OADocumentBindingCandidate,
  OADocumentSuggestion,
  OADocumentTemplateManifest,
  OADocumentVisualAnchor,
} from "@/lib/oa-document-templates"
import { createStableDocumentFieldId } from "@/lib/oa-document-templates"
import { OADocumentAnnotationPanel } from "./oa-document-annotation-panel"
import { OADocumentCanvas } from "./oa-document-canvas"
import { OADocumentFieldEditor } from "./oa-document-field-editor"

interface PreviewPage {
  page: number
  width: number
  height: number
  rotation: number
  imageUrl?: string
}

interface PreviewMetadata {
  ok: boolean
  message?: string
  pageCount: number
  pages: PreviewPage[]
  suggestions: Array<Pick<OADocumentSuggestion, "id" | "visual" | "bindingCandidateIds">>
  candidates: PreviewCandidate[]
}

type PreviewCandidate = Pick<OADocumentBindingCandidate, "id" | "label" | "description" | "writeTarget" | "visual">

interface ReviewPayload {
  ok?: boolean
  code?: string
  message?: string
  manifest?: OADocumentTemplateManifest
  candidates?: PreviewCandidate[]
}

function newSuggestion(index: number, visual: OADocumentVisualAnchor): OADocumentSuggestion {
  const id = `drawn_${Date.now()}_${index}`
  return {
    id,
    kind: "label_blank",
    label: "新问题",
    inferredAnswerType: "text",
    confidence: "medium",
    reviewState: "unresolved",
    evidence: ["框选新增"],
    conflictIds: [],
    partName: "",
    path: "",
    contextHash: "",
    visual,
  }
}

function positiveOverlap(left: OADocumentVisualAnchor, right: OADocumentVisualAnchor) {
  return left.page === right.page
    && Math.min(left.x + left.width, right.x + right.width) > Math.max(left.x, right.x)
    && Math.min(left.y + left.height, right.y + right.height) > Math.max(left.y, right.y)
}

function selectedCandidatesFromManifest(manifest: OADocumentTemplateManifest) {
  const selected: Record<string, string> = {}
  for (const suggestion of manifest.suggestions) {
    if (!suggestion.fieldId) continue
    const candidateId = manifest.anchors.find((anchor) => anchor.fieldId === suggestion.fieldId)?.bindingCandidateId
    if (candidateId) selected[suggestion.id] = candidateId
  }
  return selected
}

function reviewCounts(suggestions: OADocumentSuggestion[]) {
  return suggestions.reduce((counts, suggestion) => {
    if (suggestion.reviewState === "confirmed") counts.confirmed += 1
    else if (suggestion.reviewState === "ignored") counts.ignored += 1
    else if (suggestion.reviewState === "deleted") counts.deleted += 1
    else if (suggestion.reviewState === "unresolved") counts.unresolved += 1
    if (suggestion.reviewState === "conflict" || suggestion.conflictIds.length > 0) counts.conflicts += 1
    return counts
  }, { confirmed: 0, unresolved: 0, ignored: 0, deleted: 0, conflicts: 0 })
}

export function OADocumentWorkbench({
  versionId,
  initialManifest,
  onSave,
  onChange,
  onCompile,
  compiling = false,
}: {
  versionId: string
  initialManifest: OADocumentTemplateManifest
  onSave: (manifest: OADocumentTemplateManifest) => void | Promise<void>
  onChange?: (manifest: OADocumentTemplateManifest) => void
  onCompile?: (manifest: OADocumentTemplateManifest) => Promise<void>
  compiling?: boolean
}) {
  const [manifest, setManifest] = useState(initialManifest)
  const [activeRegionId, setActiveRegionId] = useState(initialManifest.suggestions[0]?.id)
  const [mode, setMode] = useState<"select" | "draw">("select")
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(0)
  const [previewPageUrl, setPreviewPageUrl] = useState("")
  const [candidates, setCandidates] = useState<PreviewCandidate[]>([])
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string>>(() => selectedCandidatesFromManifest(initialManifest))
  const [previewLoading, setPreviewLoading] = useState(true)
  const [previewError, setPreviewError] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const revisionRef = useRef(0)
  const counts = useMemo(() => reviewCounts(manifest.suggestions), [manifest.suggestions])
  const active = manifest.suggestions.find((item) => item.id === activeRegionId)
  const blocking = hasBlockingDocumentReview(manifest)

  const commit = useCallback((next: OADocumentTemplateManifest) => {
    revisionRef.current += 1
    setManifest(next)
    onChange?.(next)
  }, [onChange])

  const activate = useCallback((id: string) => {
    setActiveRegionId(id)
    const selected = manifest.suggestions.find((item) => item.id === id)
    if (selected?.visual?.page) setPage(selected.visual.page)
  }, [manifest.suggestions])

  useEffect(() => {
    if (active?.visual?.page) setPage(active.visual.page)
  }, [active?.visual?.page])

  useEffect(() => {
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setMode("select")
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const metadataRevision = revisionRef.current
    const loadMetadata = async () => {
      setPreviewLoading(true)
      setPreviewError("")
      try {
        const sessionToken = getTongClassStoredSessionToken()
        if (!sessionToken) throw new Error("请先登录")
        const response = await fetch(`/api/oa/document-templates/${versionId}/preview`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
          cache: "no-store",
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => ({})) as Partial<PreviewMetadata>
        if (!response.ok || !payload.ok || !payload.pageCount || !payload.pages || !payload.suggestions || !payload.candidates) {
          throw new Error(payload.message || "文档预览加载失败")
        }
        const boundedCount = Math.min(100, Math.max(1, payload.pageCount))
        setPageCount(boundedCount)
        setPage((current) => Math.min(boundedCount, Math.max(1, current)))
        setCandidates(payload.candidates)
        if (metadataRevision === revisionRef.current) {
          setManifest((current) => ({
            ...current,
            suggestions: current.suggestions.map((suggestion) => {
              const metadata = payload.suggestions!.find((item) => item.id === suggestion.id)
              return metadata ? { ...suggestion, visual: metadata.visual, bindingCandidateIds: metadata.bindingCandidateIds } : suggestion
            }),
          }))
        }
      } catch (error) {
        if (!controller.signal.aborted) setPreviewError(error instanceof Error ? error.message : "文档预览加载失败")
      } finally {
        if (!controller.signal.aborted) setPreviewLoading(false)
      }
    }
    void loadMetadata()
    return () => controller.abort()
  }, [versionId])

  useEffect(() => {
    if (!pageCount) return
    const controller = new AbortController()
    let objectUrl = ""
    const loadPage = async () => {
      setPreviewLoading(true)
      setPreviewError("")
      setPreviewPageUrl("")
      try {
        const sessionToken = getTongClassStoredSessionToken()
        if (!sessionToken) throw new Error("请先登录")
        const boundedPage = Math.min(pageCount, Math.max(1, page))
        const response = await fetch(`/api/oa/document-templates/${versionId}/preview/pages/${boundedPage}`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => ({})) as { message?: string }
          throw new Error(payload.message || "文档预览加载失败")
        }
        const blob = await response.blob()
        objectUrl = URL.createObjectURL(blob)
        if (!controller.signal.aborted) setPreviewPageUrl(objectUrl)
      } catch (error) {
        if (!controller.signal.aborted) setPreviewError(error instanceof Error ? error.message : "文档预览加载失败")
      } finally {
        if (!controller.signal.aborted) setPreviewLoading(false)
      }
    }
    void loadPage()
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [page, pageCount, versionId])

  const candidateIdsForVisual = useCallback((visual: OADocumentVisualAnchor) => candidates
    .filter((candidate) => positiveOverlap(candidate.visual, visual))
    .map((candidate) => candidate.id), [candidates])

  const removeFieldBinding = useCallback((draft: OADocumentTemplateManifest, suggestion: OADocumentSuggestion) => {
    if (!suggestion.fieldId) return draft
    return {
      ...draft,
      fields: draft.fields.filter((field) => field.fieldId !== suggestion.fieldId),
      anchors: draft.anchors.filter((anchor) => anchor.fieldId !== suggestion.fieldId),
    }
  }, [])

  const updateSuggestion = (next: OADocumentSuggestion) => {
    commit({ ...manifest, suggestions: manifest.suggestions.map((item) => item.id === next.id ? next : item) })
  }

  const handleDraw = (visual: OADocumentVisualAnchor) => {
    const suggestion = { ...newSuggestion(manifest.suggestions.length, visual), bindingCandidateIds: candidateIdsForVisual(visual) }
    commit({ ...manifest, suggestions: [...manifest.suggestions, suggestion] })
    setActiveRegionId(suggestion.id)
    setMode("select")
  }

  const handleVisualChange = (id: string, visual: OADocumentVisualAnchor) => {
    const suggestion = manifest.suggestions.find((item) => item.id === id)
    if (!suggestion) return
    const detached = removeFieldBinding(manifest, suggestion)
    const next = {
      ...suggestion,
      visual,
      bindingCandidateIds: candidateIdsForVisual(visual),
      reviewState: "unresolved" as const,
    }
    setSelectedCandidates((current) => {
      const copy = { ...current }
      delete copy[id]
      return copy
    })
    commit({ ...detached, suggestions: detached.suggestions.map((item) => item.id === id ? next : item) })
  }

  const deleteSuggestion = (id: string) => {
    const suggestion = manifest.suggestions.find((item) => item.id === id)
    if (!suggestion) return
    const detached = removeFieldBinding(manifest, suggestion)
    setSelectedCandidates((current) => {
      const copy = { ...current }
      delete copy[id]
      return copy
    })
    commit({
      ...detached,
      suggestions: detached.suggestions.map((item) => item.id === id ? { ...item, reviewState: "deleted" } : item),
    })
  }

  const decide = (id: string, reviewState: "confirmed" | "ignored" | "deleted") => {
    if (reviewState === "deleted") return deleteSuggestion(id)
    const suggestion = manifest.suggestions.find((item) => item.id === id)
    if (!suggestion) return
    const candidateId = selectedCandidates[id]
    if (reviewState === "confirmed" && !candidateId) {
      setMessage("请先选择一个 Word 可写位置。")
      return
    }
    const detached = reviewState === "ignored" ? removeFieldBinding(manifest, suggestion) : manifest
    commit({
      ...detached,
      suggestions: detached.suggestions.map((item) => item.id === id
        ? {
            ...item,
            reviewState,
            fieldId: reviewState === "confirmed" ? (item.fieldId || createStableDocumentFieldId(item.label, candidateId)) : item.fieldId,
          }
        : item),
    })
  }

  const chooseCandidate = (candidateId: string) => {
    if (!active) return
    const detached = removeFieldBinding(manifest, active)
    setSelectedCandidates((current) => ({ ...current, [active.id]: candidateId }))
    commit({
      ...detached,
      suggestions: detached.suggestions.map((item) => item.id === active.id
        ? { ...item, reviewState: "unresolved", bindingCandidateIds: [...new Set([...(item.bindingCandidateIds || []), candidateId])] }
        : item),
    })
  }

  const reviewEdits = manifest.suggestions.map((suggestion) => ({
    suggestionId: suggestion.id,
    reviewState: suggestion.reviewState,
    label: suggestion.label,
    inferredAnswerType: suggestion.inferredAnswerType,
    ...(suggestion.required !== undefined ? { required: suggestion.required } : {}),
    ...(suggestion.maxLength !== undefined ? { maxLength: suggestion.maxLength } : {}),
    ...(suggestion.options ? { options: suggestion.options } : {}),
    ...(suggestion.visual ? { visual: suggestion.visual } : {}),
    ...(selectedCandidates[suggestion.id] ? { bindingCandidateId: selectedCandidates[suggestion.id] } : {}),
  }))

  const postReview = async () => {
    const requestRevision = revisionRef.current
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")
    const response = await fetch(`/api/oa/document-templates/${versionId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
      body: JSON.stringify({ edits: reviewEdits }),
    })
    const payload = await response.json().catch(() => ({})) as ReviewPayload
    if (!response.ok || !payload.ok || !payload.manifest) throw new Error(payload.message || "保存失败，请重试。")
    if (payload.candidates) setCandidates(payload.candidates)
    if (requestRevision === revisionRef.current) {
      setManifest(payload.manifest)
      setSelectedCandidates(selectedCandidatesFromManifest(payload.manifest))
      onChange?.(payload.manifest)
      await onSave(payload.manifest)
      return payload.manifest
    }
    setMessage("编辑内容已变化，本次保存结果未覆盖当前草稿，请再次保存。")
    return null
  }

  const save = async () => {
    setSaving(true)
    setMessage("")
    try {
      const canonical = await postReview()
      if (canonical) setMessage("批注已保存。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败，请重试。")
    } finally {
      setSaving(false)
    }
  }

  const compile = async () => {
    if (!onCompile || blocking) return
    setSaving(true)
    setMessage("")
    try {
      const canonical = await postReview()
      if (canonical) {
        await onCompile(canonical)
        setMessage("模板已编译并启用，字段已合并到收集表单。")
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "编译失败，请重试。")
    } finally {
      setSaving(false)
    }
  }

  const activeCandidateIds = active
    ? [...new Set([...(active.bindingCandidateIds || []), ...candidateIdsForVisual(active.visual || { page: 0, x: 0, y: 0, width: 0, height: 0, pageWidth: 1, pageHeight: 1, rotation: 0, coordinateSpace: "normalized-pdf" })])]
    : []
  const activeCandidates = candidates.filter((candidate) => activeCandidateIds.includes(candidate.id))

  return (
    <div className="border-y aia-border-rule bg-[hsl(var(--aia-paper))]">
      <header className="flex flex-wrap items-center gap-3 border-b aia-border-rule px-4 py-3 sm:px-6">
        <div>
          <p className="aia-kicker">Word 智能表单</p>
          <h1 className="aia-serif mt-1 text-xl font-semibold text-[hsl(var(--aia-ink))]">识别与批注工作台</h1>
        </div>
        <div className="ml-auto flex border aia-border-rule" aria-label="批注模式">
          <button type="button" aria-pressed={mode === "select"} onClick={() => setMode("select")} className={`aia-focus inline-flex items-center gap-1.5 px-3 py-2 text-xs ${mode === "select" ? "bg-[hsl(var(--aia-ink))] text-white" : ""}`}><MousePointer2 className="h-3.5 w-3.5" />选择</button>
          <button type="button" aria-pressed={mode === "draw"} onClick={() => setMode("draw")} className={`aia-focus inline-flex items-center gap-1.5 border-l aia-border-rule px-3 py-2 text-xs ${mode === "draw" ? "bg-[hsl(var(--aia-ink))] text-white" : ""}`}><Pencil className="h-3.5 w-3.5" />框选新增</button>
        </div>
        <div className="aia-mono flex flex-wrap gap-3 text-[10px] aia-text-muted" aria-live="polite">
          <span className="text-emerald-700">{counts.confirmed} 已确认</span><span className="text-amber-700">{counts.unresolved} 待确认</span><span className="text-[hsl(var(--aia-red))]">{counts.conflicts} 冲突</span>
        </div>
        <button type="button" onClick={() => void save()} disabled={saving || previewLoading} className="aia-focus inline-flex items-center gap-2 border border-[hsl(var(--aia-ink))] px-3 py-2 text-sm disabled:opacity-50">
          <Save className="h-4 w-4" aria-hidden="true" />{saving ? "保存中…" : "保存批注"}
        </button>
        {onCompile ? (
          <button type="button" onClick={() => void compile()} disabled={saving || compiling || blocking} className="aia-focus inline-flex items-center gap-2 bg-[hsl(var(--aia-ink))] px-3 py-2 text-sm text-[hsl(var(--aia-paper))] disabled:cursor-not-allowed disabled:opacity-40">
            <FileCheck2 className="h-4 w-4" aria-hidden="true" />{compiling ? "正在编译…" : "编译并启用"}
          </button>
        ) : null}
        {message ? <p role="status" className="w-full text-right text-xs aia-text-muted">{message}</p> : null}
      </header>
      <div className="grid lg:grid-cols-[5rem_minmax(0,1fr)_20rem]">
        <nav aria-label="文档页码" className="hidden border-r aia-border-rule px-2 py-4 lg:block">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.min(pageCount, Math.max(1, current - 1)))} className="aia-focus w-full p-2 disabled:opacity-30" aria-label="上一页"><ChevronLeft className="mx-auto h-4 w-4" /></button>
          <p className="aia-mono py-3 text-center text-xs">{String(page).padStart(2, "0")} / {String(pageCount || 1).padStart(2, "0")}</p>
          <button type="button" disabled={!pageCount || page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, Math.max(1, current + 1)))} className="aia-focus w-full p-2 disabled:opacity-30" aria-label="下一页"><ChevronRight className="mx-auto h-4 w-4" /></button>
        </nav>
        <div className="min-w-0">
          {previewLoading && !previewPageUrl ? <p role="status" className="min-h-[42rem] bg-neutral-200/70 p-8 text-sm aia-text-muted">正在加载文档预览…</p> : null}
          {previewError ? <p role="alert" className="min-h-[42rem] bg-neutral-200/70 p-8 text-sm text-[hsl(var(--aia-red))]">文档预览加载失败：{previewError}</p> : null}
          {previewPageUrl && !previewError ? (
            <OADocumentCanvas page={page} pageCount={pageCount} previewPageUrl={previewPageUrl} suggestions={manifest.suggestions} activeRegionId={activeRegionId} mode={mode} onActivate={activate} onDraw={handleDraw} onChange={handleVisualChange} onDelete={deleteSuggestion} onEdit={activate} />
          ) : null}
        </div>
        <OADocumentAnnotationPanel suggestions={manifest.suggestions} activeRegionId={activeRegionId} onActivate={activate} onAdd={() => setMode("draw")} onDecision={decide} canConfirm={(id) => Boolean(selectedCandidates[id])} />
      </div>
      <OADocumentFieldEditor suggestion={active} candidates={activeCandidates} selectedCandidateId={active ? selectedCandidates[active.id] : undefined} onCandidateChange={chooseCandidate} onChange={updateSuggestion} />
      {blocking ? (
        <p role="alert" className="border-t aia-border-rule bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6">
          仍有 {counts.unresolved} 个待确认对象与 {counts.conflicts} 个冲突，或存在未绑定 Word 位置的字段；全部处理后才能编译并启用模板。
        </p>
      ) : null}
    </div>
  )
}
