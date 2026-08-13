"use client"

import { useRef, type KeyboardEvent, type PointerEvent } from "react"
import { Pencil, Trash2 } from "lucide-react"

import {
  clampVisualAnchor,
  resizeVisualAnchor,
  type OADocumentResizeHandle,
} from "@/lib/oa-document-geometry"
import type { OADocumentSuggestionReviewState, OADocumentVisualAnchor } from "@/lib/oa-document-templates"
import { cn } from "@/lib/utils"

const tone: Record<OADocumentSuggestionReviewState, string> = {
  confirmed: "border-emerald-700 bg-emerald-300/25",
  unresolved: "border-amber-600 bg-amber-300/25",
  conflict: "border-[hsl(var(--aia-red))] bg-[hsl(var(--aia-red))]/20",
  ignored: "border-neutral-400 bg-neutral-200/20",
  deleted: "border-neutral-300 bg-transparent",
}

const handles: Array<{ id: OADocumentResizeHandle; className: string; cursor: string }> = [
  { id: "top-left", className: "-left-1.5 -top-1.5", cursor: "cursor-nwse-resize" },
  { id: "top", className: "left-1/2 -top-1.5 -translate-x-1/2", cursor: "cursor-ns-resize" },
  { id: "top-right", className: "-right-1.5 -top-1.5", cursor: "cursor-nesw-resize" },
  { id: "right", className: "-right-1.5 top-1/2 -translate-y-1/2", cursor: "cursor-ew-resize" },
  { id: "bottom-right", className: "-bottom-1.5 -right-1.5", cursor: "cursor-nwse-resize" },
  { id: "bottom", className: "-bottom-1.5 left-1/2 -translate-x-1/2", cursor: "cursor-ns-resize" },
  { id: "bottom-left", className: "-bottom-1.5 -left-1.5", cursor: "cursor-nesw-resize" },
  { id: "left", className: "-left-1.5 top-1/2 -translate-y-1/2", cursor: "cursor-ew-resize" },
]

type DragState = {
  pointerId: number
  startX: number
  startY: number
  start: OADocumentVisualAnchor
  handle?: OADocumentResizeHandle
}

export function OADocumentOverlay({
  id,
  label,
  state,
  visual,
  selected,
  pageElement,
  onActivate,
  onChange,
  onEdit,
  onDelete,
}: {
  id: string
  label: string
  state: OADocumentSuggestionReviewState
  visual: OADocumentVisualAnchor
  selected: boolean
  pageElement: HTMLElement | null
  onActivate: (id: string) => void
  onChange: (id: string, visual: OADocumentVisualAnchor) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  const drag = useRef<DragState | null>(null)

  const normalizedDelta = (event: PointerEvent<HTMLElement>) => {
    const bounds = pageElement?.getBoundingClientRect()
    if (!bounds?.width || !bounds.height || !drag.current) return null
    return {
      dx: (event.clientX - drag.current.startX) / bounds.width,
      dy: (event.clientY - drag.current.startY) / bounds.height,
    }
  }

  const startDrag = (event: PointerEvent<HTMLElement>, handle?: OADocumentResizeHandle) => {
    event.stopPropagation()
    onActivate(id)
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, start: visual, handle }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const current = drag.current
    const delta = normalizedDelta(event)
    if (!current || !delta || current.pointerId !== event.pointerId) return
    const next = current.handle
      ? resizeVisualAnchor(current.start, current.handle, delta.dx, delta.dy)
      : clampVisualAnchor({ ...current.start, x: current.start.x + delta.dx, y: current.start.y + delta.dy })
    onChange(id, next)
  }

  const stopDrag = (event: PointerEvent<HTMLElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-0.002, 0], ArrowRight: [0.002, 0], ArrowUp: [0, -0.002], ArrowDown: [0, 0.002],
    }
    const delta = deltas[event.key]
    if (!delta) return
    event.preventDefault()
    const [dx, dy] = delta
    onChange(id, event.shiftKey
      ? resizeVisualAnchor(visual, dx ? "right" : "bottom", dx, dy)
      : clampVisualAnchor({ ...visual, x: visual.x + dx, y: visual.y + dy }))
  }

  return (
    <div
      data-region-id={id}
      className="pointer-events-none absolute"
      style={{
        left: `${visual.x * 100}%`,
        top: `${visual.y * 100}%`,
        width: `${visual.width * 100}%`,
        height: `${visual.height * 100}%`,
      }}
    >
      <button
        type="button"
        aria-label={`填写区域：${label}`}
        aria-pressed={selected}
        onMouseEnter={() => onActivate(id)}
        onFocus={() => onActivate(id)}
        onClick={() => onActivate(id)}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => startDrag(event)}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        className={cn(
          "aia-focus group pointer-events-auto absolute -inset-2 min-h-11 min-w-11",
          selected && "outline outline-2 outline-offset-2 outline-[hsl(var(--aia-ink))]",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-2 border-2 transition-[border-width,background-color] group-hover:border-[3px]",
            tone[state],
            selected && "border-[3px]",
          )}
        />
      </button>
      {selected ? (
        <>
          <div className="pointer-events-auto absolute -top-11 right-0 z-30 flex border border-[hsl(var(--aia-ink))] bg-[hsl(var(--aia-paper))] shadow-md">
            <button type="button" onClick={() => onEdit(id)} className="aia-focus inline-flex items-center gap-1 px-2.5 py-1.5 text-xs">
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />编辑
            </button>
            <button type="button" onClick={() => onDelete(id)} className="aia-focus inline-flex items-center gap-1 border-l border-[hsl(var(--aia-rule))] px-2.5 py-1.5 text-xs text-[hsl(var(--aia-red))]">
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />删除
            </button>
          </div>
          {handles.map((handle) => (
            <button
              type="button"
              key={handle.id}
              aria-label={`${label} ${handle.id} 缩放手柄`}
              onPointerDown={(event) => startDrag(event, handle.id)}
              onPointerMove={moveDrag}
              onPointerUp={stopDrag}
              onPointerCancel={stopDrag}
              className={cn("pointer-events-auto absolute z-20 grid min-h-11 min-w-11 place-items-center bg-transparent", handle.className, handle.cursor)}
            >
              <span aria-hidden="true" className="pointer-events-none h-3 w-3 border border-white bg-[hsl(var(--aia-ink))]" />
            </button>
          ))}
        </>
      ) : null}
    </div>
  )
}
