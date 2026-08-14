"use client"

import { useRef, useState } from "react"
import { FileUp } from "lucide-react"

import { DOCX_MIME, DOC_MIME, normalizeWordSourceType } from "@/lib/oa-document-templates"
import { cn } from "@/lib/utils"

export function OADocumentImport({
  onSelect,
  compact = false,
}: {
  onSelect: (file: File) => Promise<void>
  compact?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle")
  const [error, setError] = useState("")
  const select = async (file?: File) => {
    if (!file) return
    try {
      normalizeWordSourceType(file.type, file.name)
      setState("uploading"); setError("")
      await onSelect(file)
      setState("idle")
    } catch (caught) {
      setState("error"); setError(caught instanceof Error ? caught.message : "导入失败")
    }
  }
  return (
    <section
      className={cn(
        "border border-dashed aia-border-rule text-center",
        compact ? "px-4 py-5" : "px-6 py-10",
      )}
      aria-labelledby="word-import-title"
    >
      <FileUp className={cn("mx-auto text-[hsl(var(--aia-red))]", compact ? "h-5 w-5" : "h-7 w-7")} aria-hidden="true" />
      <h2
        id="word-import-title"
        className={cn(
          "aia-serif font-semibold text-[hsl(var(--aia-ink))]",
          compact ? "mt-3 text-base" : "mt-4 text-xl",
        )}
      >
        从 Word 导入
      </h2>
      <p className={cn("aia-text-muted mx-auto", compact ? "mt-1 text-xs leading-5" : "mt-2 max-w-xl text-sm leading-6")}>
        {compact ? "保留原版式，分析后进入批注工作台。" : "无需手动插入占位符。平台会分析表格、下划线、标签、选项与已有控件，再由你在批注工作台确认。"}
      </p>
      <input ref={input} type="file" accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword" className="sr-only" onChange={(event) => void select(event.target.files?.[0])} />
      <button
        type="button"
        disabled={state === "uploading"}
        onClick={() => input.current?.click()}
        className={cn(
          "aia-focus border border-[hsl(var(--aia-ink))] px-4 text-sm font-medium disabled:opacity-50",
          compact ? "mt-4 min-h-11 w-full py-2" : "mt-5 py-2",
        )}
      >
        {state === "uploading" ? "正在分析…" : "选择 .docx 或 .doc"}
      </button>
      {!compact ? <p className="aia-mono mt-3 text-[10px] aia-text-muted">{DOCX_MIME} · {DOC_MIME}</p> : null}
      {state === "error" ? <p role="alert" className="mt-3 text-sm text-[hsl(var(--aia-red))]">{error}</p> : null}
    </section>
  )
}
