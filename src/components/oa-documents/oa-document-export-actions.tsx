"use client"

import { useState } from "react"
import { Download } from "lucide-react"

import { getTongClassStoredSessionToken } from "@/lib/api"

type SingleFormat = "docx" | "pdf"
type BatchFormat = "csv" | "xlsx" | "word" | "original" | "pdf"

const actionClass = "aia-focus inline-flex min-h-9 items-center gap-1.5 border aia-border-rule px-2.5 py-1.5 text-xs font-medium text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))] disabled:cursor-not-allowed disabled:opacity-40"

function contentDispositionFilename(header: string | null, fallback: string) {
  const encoded = header?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encoded) {
    try { return decodeURIComponent(encoded) } catch { return fallback }
  }
  return fallback
}

async function downloadArtifact(path: string, body: unknown, fallbackName: string) {
  const sessionToken = getTongClassStoredSessionToken()
  if (!sessionToken) throw new Error("请先登录")
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string }
    throw new Error(error.message || "导出失败，请稍后重试")
  }
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = contentDispositionFilename(response.headers.get("content-disposition"), fallbackName)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

export function OADocumentSingleExportActions({ submissionId }: { submissionId: string }) {
  const [busy, setBusy] = useState<SingleFormat | null>(null)
  const [message, setMessage] = useState("")
  const run = async (format: SingleFormat) => {
    setBusy(format); setMessage("")
    try {
      await downloadArtifact(`/api/oa/submissions/${encodeURIComponent(submissionId)}/document`, { format }, `申请材料.${format}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导出失败")
    } finally {
      setBusy(null)
    }
  }
  return (
    <div className="mt-4 border-t aia-border-rule pt-4" aria-label="原格式材料导出">
      <p className="aia-mono mb-2 text-[10px] uppercase tracking-[0.12em] aia-text-muted">原格式材料</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={actionClass} disabled={busy !== null} onClick={() => void run("docx")}>
          <Download className="h-3.5 w-3.5" aria-hidden="true" />{busy === "docx" ? "生成中…" : "下载 Word"}
        </button>
        <button type="button" className={actionClass} disabled={busy !== null} onClick={() => void run("pdf")}>
          <Download className="h-3.5 w-3.5" aria-hidden="true" />{busy === "pdf" ? "生成中…" : "下载 PDF"}
        </button>
      </div>
      {message ? <p role="status" className="mt-2 text-xs text-[hsl(var(--aia-red))]">{message}</p> : null}
    </div>
  )
}

const batchFormats: Array<[BatchFormat, string, string]> = [
  ["csv", "CSV", "申请汇总.csv"],
  ["xlsx", "Excel", "申请汇总.xlsx"],
  ["word", "Word / 汇总", "Word材料.zip"],
  ["original", "原格式 Word", "原格式材料.zip"],
  ["pdf", "PDF", "PDF材料.zip"],
]

export function OADocumentBatchExportActions({
  formId,
  submissionIds,
}: {
  formId: string
  submissionIds: string[]
}) {
  const [busy, setBusy] = useState<BatchFormat | null>(null)
  const [message, setMessage] = useState("")
  const run = async (format: BatchFormat, fallbackName: string) => {
    if (!submissionIds.length) { setMessage("请先选择至少一份提交"); return }
    setBusy(format); setMessage("")
    try {
      await downloadArtifact(
        `/api/oa/forms/${encodeURIComponent(formId)}/exports`,
        { submissionIds, format },
        fallbackName,
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导出失败")
    } finally {
      setBusy(null)
    }
  }
  return (
    <div className="border-y aia-border-rule bg-[hsl(var(--aia-tag))] px-3 py-3" aria-label="批量导出">
      <div className="flex flex-wrap items-center gap-2">
        <span className="aia-mono mr-1 text-[10px] uppercase tracking-[0.12em] aia-text-muted">已选 {submissionIds.length} 份</span>
        {batchFormats.map(([format, label, fallbackName]) => (
          <button key={format} type="button" className={actionClass} disabled={busy !== null || submissionIds.length === 0} onClick={() => void run(format, fallbackName)}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />{busy === format ? "生成中…" : label}
          </button>
        ))}
      </div>
      {message ? <p role="status" className="mt-2 text-xs text-[hsl(var(--aia-red))]">{message}</p> : null}
    </div>
  )
}
