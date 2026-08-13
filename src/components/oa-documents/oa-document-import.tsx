"use client"

import { useRef, useState } from "react"
import { FileUp } from "lucide-react"

import { DOCX_MIME, DOC_MIME, normalizeWordSourceType } from "@/lib/oa-document-templates"

export function OADocumentImport({ onSelect }: { onSelect: (file: File) => Promise<void> }) {
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
    <section className="border border-dashed aia-border-rule px-6 py-10 text-center" aria-labelledby="word-import-title">
      <FileUp className="mx-auto h-7 w-7 text-[hsl(var(--aia-red))]" aria-hidden="true" />
      <h2 id="word-import-title" className="aia-serif mt-4 text-xl font-semibold text-[hsl(var(--aia-ink))]">从 Word 导入原始表单</h2>
      <p className="aia-text-muted mx-auto mt-2 max-w-xl text-sm leading-6">无需手动插入占位符。平台会分析表格、下划线、标签、选项与已有控件，再由你在批注工作台确认。</p>
      <input ref={input} type="file" accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword" className="sr-only" onChange={(event) => void select(event.target.files?.[0])} />
      <button type="button" disabled={state === "uploading"} onClick={() => input.current?.click()} className="aia-focus mt-5 border border-[hsl(var(--aia-ink))] px-4 py-2 text-sm font-medium disabled:opacity-50">
        {state === "uploading" ? "正在分析…" : "选择 .docx 或 .doc"}
      </button>
      <p className="aia-mono mt-3 text-[10px] aia-text-muted">{DOCX_MIME} · {DOC_MIME}</p>
      {state === "error" ? <p role="alert" className="mt-3 text-sm text-[hsl(var(--aia-red))]">{error}</p> : null}
    </section>
  )
}
