"use client"

import { useRef, useState, type PointerEvent } from "react"

import { clientRectToVisualAnchor } from "@/lib/oa-document-geometry"
import type { OADocumentSuggestion, OADocumentVisualAnchor } from "@/lib/oa-document-templates"
import { OADocumentOverlay } from "./oa-document-overlay"

type DrawState = { pointerId: number; startX: number; startY: number }

export interface OADocumentCanvasProps {
  page?: number
  pageCount?: number
  previewPageUrl?: string
  suggestions: OADocumentSuggestion[]
  activeRegionId?: string
  mode?: "select" | "draw"
  onActivate: (id: string) => void
  onDraw?: (visual: OADocumentVisualAnchor) => void
  onChange?: (id: string, visual: OADocumentVisualAnchor) => void
  onDelete?: (id: string) => void
  onEdit?: (id: string) => void
}

export function OADocumentCanvas({
  page = 1,
  pageCount = 1,
  previewPageUrl,
  suggestions,
  activeRegionId,
  mode = "select",
  onActivate,
  onDraw,
  onChange,
  onDelete,
  onEdit,
}: OADocumentCanvasProps) {
  const pageRef = useRef<HTMLDivElement>(null)
  const draw = useRef<DrawState | null>(null)
  const [draft, setDraft] = useState<OADocumentVisualAnchor | null>(null)
  const [pageSize, setPageSize] = useState({ width: 595.28, height: 841.89 })

  const visualFromPointer = (startX: number, startY: number, clientX: number, clientY: number) => {
    const bounds = pageRef.current?.getBoundingClientRect()
    if (!bounds) return null
    const left = Math.min(startX, clientX)
    const top = Math.min(startY, clientY)
    return clientRectToVisualAnchor(
      { page, pageWidth: pageSize.width, pageHeight: pageSize.height, rotation: 0 },
      { left, top, width: Math.abs(clientX - startX), height: Math.abs(clientY - startY) },
      bounds,
    )
  }

  const beginDraw = (event: PointerEvent<HTMLDivElement>) => {
    if (mode !== "draw" || event.target !== event.currentTarget) return
    draw.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveDraw = (event: PointerEvent<HTMLDivElement>) => {
    const current = draw.current
    if (!current || current.pointerId !== event.pointerId) return
    setDraft(visualFromPointer(current.startX, current.startY, event.clientX, event.clientY))
  }

  const finishDraw = (event: PointerEvent<HTMLDivElement>) => {
    if (draw.current?.pointerId !== event.pointerId) return
    const next = draft || visualFromPointer(draw.current.startX, draw.current.startY, event.clientX, event.clientY)
    draw.current = null
    setDraft(null)
    if (next) onDraw?.(next)
  }

  const visible = suggestions.filter((suggestion) => suggestion.visual?.page === page
    && suggestion.reviewState !== "ignored" && suggestion.reviewState !== "deleted")

  return (
    <section aria-label={`Word 文档 PDF 预览，第 ${page} 页，共 ${pageCount} 页`} className="min-h-[42rem] bg-neutral-200/70 p-4 sm:p-8">
      <div
        ref={pageRef}
        onPointerDown={beginDraw}
        onPointerMove={moveDraw}
        onPointerUp={finishDraw}
        onPointerCancel={finishDraw}
        className="relative mx-auto max-w-[52rem] overflow-visible border aia-border-rule bg-white shadow-md"
        style={{ aspectRatio: `${pageSize.width} / ${pageSize.height}`, cursor: mode === "draw" ? "crosshair" : "default" }}
      >
        {previewPageUrl ? (
          <>
            {/* Blob-backed authenticated previews cannot be routed through Next Image optimization. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewPageUrl}
              alt={`原 Word 文档转换后的第 ${page} 页`}
              draggable={false}
              onLoad={(event) => {
                if (event.currentTarget.naturalWidth > 0 && event.currentTarget.naturalHeight > 0) {
                  setPageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })
                }
              }}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
            />
          </>
        ) : (
          <p role="status" className="absolute inset-0 grid place-items-center px-8 text-center text-sm aia-text-muted">
            PDF 页面预览尚未就绪，请重新分析此 Word 模板。
          </p>
        )}
        {visible.map((suggestion) => (
          <OADocumentOverlay
            key={suggestion.id}
            id={suggestion.id}
            label={suggestion.label}
            state={suggestion.reviewState}
            visual={suggestion.visual!}
            selected={activeRegionId === suggestion.id}
            pageElement={pageRef.current}
            onActivate={onActivate}
            onChange={onChange || (() => undefined)}
            onDelete={onDelete || (() => undefined)}
            onEdit={onEdit || (() => undefined)}
          />
        ))}
        {draft ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute border-2 border-dashed border-[hsl(var(--aia-red))] bg-[hsl(var(--aia-red))]/10"
            style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, width: `${draft.width * 100}%`, height: `${draft.height * 100}%` }}
          />
        ) : null}
      </div>
    </section>
  )
}
