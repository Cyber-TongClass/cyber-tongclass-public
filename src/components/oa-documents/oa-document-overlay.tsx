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

const visualHandles = [
  ["left-0 top-0 -translate-x-1/2 -translate-y-1/2", "top-left"],
  ["left-1/2 top-0 -translate-x-1/2 -translate-y-1/2", "top"],
  ["right-0 top-0 translate-x-1/2 -translate-y-1/2", "top-right"],
  ["right-0 top-1/2 translate-x-1/2 -translate-y-1/2", "right"],
  ["bottom-0 right-0 translate-x-1/2 translate-y-1/2", "bottom-right"],
  ["bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2", "bottom"],
  ["bottom-0 left-0 -translate-x-1/2 translate-y-1/2", "bottom-left"],
  ["left-0 top-1/2 -translate-x-1/2 -translate-y-1/2", "left"],
] as const

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
  active,
  selected,
  pageElement,
  onActivate,
  onSelect,
  onChange,
  onEdit,
  onDelete,
}: {
  id: string
  label: string
  state: OADocumentSuggestionReviewState
  visual: OADocumentVisualAnchor
  active: boolean
  selected: boolean
  pageElement: HTMLElement | null
  onActivate: (id: string) => void
  onSelect: (id: string) => void
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
    onSelect(id)
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, start: visual, handle }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const resizeHandleAtPointer = (event: PointerEvent<HTMLElement>): OADocumentResizeHandle | undefined => {
    if (!selected) return undefined
    const hit = event.currentTarget.getBoundingClientRect()
    if (!hit.width || !hit.height) return undefined
    const fx = (event.clientX - hit.left) / hit.width
    const fy = (event.clientY - hit.top) / hit.height
    const moveHalfWidth = Math.min(0.5, 14 / hit.width)
    const moveHalfHeight = Math.min(0.5, 14 / hit.height)
    if (Math.abs(fx - 0.5) <= moveHalfWidth && Math.abs(fy - 0.5) <= moveHalfHeight) return undefined
    const horizontal = fx < 0.5 - moveHalfWidth ? "left" : fx > 0.5 + moveHalfWidth ? "right" : ""
    const vertical = fy < 0.5 - moveHalfHeight ? "top" : fy > 0.5 + moveHalfHeight ? "bottom" : ""
    return (vertical && horizontal ? `${vertical}-${horizontal}` : vertical || horizontal) as OADocumentResizeHandle
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
      className="group/region pointer-events-none absolute"
      style={{
        left: `${visual.x * 100}%`,
        top: `${visual.y * 100}%`,
        width: `${visual.width * 100}%`,
        height: `${visual.height * 100}%`,
      }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 border-2 transition-[border-width,background-color] group-hover/region:border-[3px]",
          tone[state],
          (active || selected) && "border-[3px]",
        )}
      />
      <button
        type="button"
        aria-label={`填写区域：${label}`}
        aria-pressed={selected}
        onMouseEnter={() => onActivate(id)}
        onFocus={() => onActivate(id)}
        onClick={() => {
          onActivate(id)
          onSelect(id)
        }}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => startDrag(event, resizeHandleAtPointer(event))}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        className={cn(
          "aia-focus group pointer-events-auto absolute left-1/2 top-1/2 h-full w-full min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 touch-none bg-transparent",
          selected && "outline outline-2 outline-offset-2 outline-[hsl(var(--aia-ink))]",
        )}
      >
        <span aria-hidden="true" className="sr-only">拖动移动；从边缘或角落拖动可缩放</span>
      </button>
      {selected ? (
        <>
          <div
            role="toolbar"
            aria-label={`${label}操作`}
            className="pointer-events-auto absolute bottom-[calc(100%+0.5rem)] left-1/2 z-30 flex w-max -translate-x-1/2 items-center whitespace-nowrap border aia-border-rule bg-[hsl(var(--aia-paper))] shadow-md"
          >
            <button type="button" onClick={() => onEdit(id)} className="aia-focus inline-flex min-h-10 shrink-0 items-center gap-1.5 px-3 text-xs font-medium leading-none text-[hsl(var(--aia-ink))]">
              <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>编辑</span>
            </button>
            <button type="button" onClick={() => onDelete(id)} className="aia-focus inline-flex min-h-10 shrink-0 items-center gap-1.5 border-l aia-border-rule px-3 text-xs font-medium leading-none text-[hsl(var(--aia-red))]">
              <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>删除</span>
            </button>
          </div>
          {visualHandles.map(([position, handle]) => (
            <span
              key={handle}
              aria-hidden="true"
              className={cn("pointer-events-none absolute z-20 h-3 w-3 border border-white bg-[hsl(var(--aia-ink))]", position)}
            />
          ))}
        </>
      ) : null}
    </div>
  )
}
