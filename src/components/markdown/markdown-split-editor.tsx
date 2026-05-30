"use client"

import { type MouseEvent, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer"

interface MarkdownSplitEditorProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  sourceLabel?: string
  previewLabel?: string
  minHeightClassName?: string
  className?: string
  textareaClassName?: string
  previewClassName?: string
  disabled?: boolean
  showToolbar?: boolean
}

type ViewMode = "split" | "edit" | "preview"

export function MarkdownSplitEditor({
  id,
  value,
  onChange,
  placeholder = "支持 Markdown 与 LaTeX 输入（如 $E=mc^2$）",
  sourceLabel = "源代码",
  previewLabel = "渲染预览",
  minHeightClassName = "min-h-[220px]",
  className,
  textareaClassName,
  previewClassName,
  disabled = false,
  showToolbar = true,
}: MarkdownSplitEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("split")

  const withTextarea = (action: (textarea: HTMLTextAreaElement) => void) => {
    if (!textareaRef.current || disabled) return
    const textarea = textareaRef.current
    textarea.focus()
    action(textarea)
  }

  const replaceSelection = (
    prefix: string,
    suffix = "",
    placeholder = "text",
    selectPlaceholder = true
  ) => {
    withTextarea((textarea) => {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selected = value.slice(start, end)
      const insertValue = selected || placeholder
      const nextValue = `${value.slice(0, start)}${prefix}${insertValue}${suffix}${value.slice(end)}`
      onChange(nextValue)

      requestAnimationFrame(() => {
        const anchor = start + prefix.length
        if (selected || !selectPlaceholder) {
          const focus = anchor + insertValue.length
          textarea.setSelectionRange(focus, focus)
          return
        }
        textarea.setSelectionRange(anchor, anchor + placeholder.length)
      })
    })
  }

  const insertTemplate = (template: string, selectionStart: number, selectionEnd: number) => {
    withTextarea((textarea) => {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const nextValue = `${value.slice(0, start)}${template}${value.slice(end)}`
      onChange(nextValue)
      requestAnimationFrame(() => {
        textarea.setSelectionRange(start + selectionStart, start + selectionEnd)
      })
    })
  }

  const prefixSelectedLines = (prefix: string) => {
    withTextarea((textarea) => {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const lineStart = value.lastIndexOf("\n", start - 1) + 1
      const lineEndIndex = value.indexOf("\n", end)
      const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex
      const target = value.slice(lineStart, lineEnd)
      const nextBlock = target
        .split("\n")
        .map((line) => `${prefix}${line}`)
        .join("\n")
      const nextValue = `${value.slice(0, lineStart)}${nextBlock}${value.slice(lineEnd)}`

      onChange(nextValue)
      requestAnimationFrame(() => {
        textarea.setSelectionRange(lineStart, lineStart + nextBlock.length)
      })
    })
  }

  const applyHeading = (level: number) => {
    const marker = `${"#".repeat(level)} `
    prefixSelectedLines(marker)
  }

  const preserveSelection = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }

  const showSource = viewMode === "split" || viewMode === "edit"
  const showPreview = viewMode === "split" || viewMode === "preview"

  return (
    <div className={cn("space-y-3", className)}>
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-white/60 p-2">
          <Button type="button" size="sm" variant="outline" onMouseDown={preserveSelection} onClick={() => replaceSelection("**", "**", "bold")}>B</Button>
          <Button type="button" size="sm" variant="outline" onMouseDown={preserveSelection} onClick={() => replaceSelection("*", "*", "italic")}>I</Button>
          <Button type="button" size="sm" variant="outline" onMouseDown={preserveSelection} onClick={() => replaceSelection("~~", "~~", "delete")}>S</Button>
          <div className="mx-1 h-5 w-px bg-border" />
          <select
            aria-label="Insert heading"
            className="h-8 rounded-md border border-input bg-white px-2 text-sm"
            defaultValue=""
            onChange={(event) => {
              const level = Number(event.target.value)
              if (!level) return
              applyHeading(level)
              event.target.value = ""
            }}
            disabled={disabled}
          >
            <option value="">H1-H6</option>
            <option value="1">H1</option>
            <option value="2">H2</option>
            <option value="3">H3</option>
            <option value="4">H4</option>
            <option value="5">H5</option>
            <option value="6">H6</option>
          </select>
          <Button type="button" size="sm" variant="outline" onMouseDown={preserveSelection} onClick={() => insertTemplate("[text](https://)", 1, 5)}>Link</Button>
          <Button type="button" size="sm" variant="outline" onMouseDown={preserveSelection} onClick={() => insertTemplate("![alt](https://)", 2, 5)}>Image</Button>
          <Button type="button" size="sm" variant="outline" onMouseDown={preserveSelection} onClick={() => prefixSelectedLines("> ")}>Quote</Button>
          <div className="mx-1 h-5 w-px bg-border" />
          <div className="inline-flex items-center rounded-md border border-input">
            <Button type="button" size="sm" variant={viewMode === "edit" ? "secondary" : "ghost"} onClick={() => setViewMode("edit")}>Edit</Button>
            <Button type="button" size="sm" variant={viewMode === "split" ? "secondary" : "ghost"} onClick={() => setViewMode("split")}>Split</Button>
            <Button type="button" size="sm" variant={viewMode === "preview" ? "secondary" : "ghost"} onClick={() => setViewMode("preview")}>Preview</Button>
          </div>
        </div>
      )}

      <div className={cn("grid grid-cols-1 gap-4", viewMode === "split" && "lg:grid-cols-2")}>
        {showSource && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-900">{sourceLabel}</p>
            <Textarea
              ref={textareaRef}
              id={id}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
              className={cn(
                "resize-y border-slate-800 bg-slate-950/95 font-mono text-sm leading-6 text-slate-100 caret-slate-100 placeholder:text-slate-400",
                "selection:bg-primary/30 selection:text-slate-100 focus-visible:ring-slate-500",
                minHeightClassName,
                textareaClassName
              )}
              disabled={disabled}
              spellCheck={false}
            />
          </div>
        )}

        {showPreview && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-900">{previewLabel}</p>
            <div className={cn("overflow-auto rounded-md border bg-slate-100/20 p-4", minHeightClassName, previewClassName)}>
              <MarkdownRenderer content={value} emptyFallback="在左侧输入 Markdown 后，这里会实时预览。" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
