"use client"

import { FileSpreadsheet, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { getTongClassStoredSessionToken, useManageUpsertOAForm } from "@/lib/api"
import {
  createFixedSpreadsheetImportDraftPayload,
  createSpreadsheetImportDraftPayload,
  OA_SPREADSHEET_LIMITS,
  XLSX_MIME,
  type OASpreadsheetImportMode,
  type OASpreadsheetSheet,
} from "@/lib/oa-spreadsheet-import"

type SpreadsheetAnalysis = {
  fileName: string
  sheets: OASpreadsheetSheet[]
}

function columnTypeLabel(type: string) {
  if (type === "number") return "数字"
  if (type === "date") return "日期"
  return "文本"
}

export function OASpreadsheetNewFormImport({ creatorId }: { creatorId: string }) {
  const router = useRouter()
  const upsertForm = useManageUpsertOAForm()
  const [analysis, setAnalysis] = useState<SpreadsheetAnalysis | null>(null)
  const [sheetIndex, setSheetIndex] = useState(0)
  const [busy, setBusy] = useState<"analyze" | OASpreadsheetImportMode | "fixed" | null>(null)
  const [error, setError] = useState("")
  const sheet = analysis?.sheets[sheetIndex]

  const analyze = async (file: File) => {
    setError("")
    setAnalysis(null)
    setSheetIndex(0)
    if (!file.name.toLocaleLowerCase("en-US").endsWith(".xlsx")) throw new Error("请选择 .xlsx 文件")
    if (file.size <= 0) throw new Error("Excel 文件不能为空")
    if (file.size > OA_SPREADSHEET_LIMITS.maxSourceBytes) throw new Error("Excel 文件不能超过 10 MiB")
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) throw new Error("请先登录")

    setBusy("analyze")
    try {
      const response = await fetch("/api/oa/spreadsheets/analyze", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": XLSX_MIME,
          "x-oa-file-name": encodeURIComponent(file.name),
        },
        body: file,
      })
      const payload = await response.json().catch(() => ({})) as {
        ok?: boolean
        fileName?: string
        sheets?: OASpreadsheetSheet[]
        message?: string
      }
      if (!response.ok || !payload.ok || !payload.fileName || !payload.sheets?.length) {
        throw new Error(payload.message || "Excel 表头分析失败")
      }
      setAnalysis({ fileName: payload.fileName, sheets: payload.sheets })
    } finally {
      setBusy(null)
    }
  }

  const handleFile = async (file?: File) => {
    if (!file) return
    try {
      await analyze(file)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Excel 表头分析失败")
    }
  }

  const createDraft = async (mode: OASpreadsheetImportMode) => {
    if (!analysis || !sheet) return
    setBusy(mode)
    setError("")
    try {
      const nonce = `${Date.now().toString(36)}-${crypto.randomUUID()}`
      const draft = createSpreadsheetImportDraftPayload(
        analysis.fileName,
        creatorId,
        nonce,
        sheet.name,
        sheet.columns,
        mode,
      )
      const formId = String(await upsertForm(draft))
      router.push(`/forms/manage/${formId}`)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Excel 表单草稿创建失败")
      setBusy(null)
    }
  }

  const createFixedDraft = async () => {
    if (!analysis || !sheet) return
    setBusy("fixed")
    setError("")
    try {
      const nonce = `${Date.now().toString(36)}-${crypto.randomUUID()}`
      const draft = createFixedSpreadsheetImportDraftPayload(analysis.fileName, creatorId, nonce, sheet)
      const formId = String(await upsertForm(draft))
      router.push(`/forms/manage/${formId}`)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "复杂 Excel 表单草稿创建失败")
      setBusy(null)
    }
  }

  return (
    <div className="border aia-border-rule bg-[hsl(var(--aia-paper))] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-[hsl(var(--aia-red))]" aria-hidden="true" />
            <h3 className="aia-serif text-lg font-semibold text-[hsl(var(--aia-ink))]">从 Excel 表头生成</h3>
          </div>
          <p className="aia-text-muted mt-2 text-sm leading-6">
            上传 .xlsx 后先预览工作表与表头，再选择生成一个可增删行的表格，或把每个表头变成独立问题。
          </p>
        </div>
        <label className="aia-focus inline-flex cursor-pointer items-center border aia-border-rule px-4 py-2 text-sm font-medium text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]">
          {busy === "analyze" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {busy === "analyze" ? "正在识别…" : "选择 .xlsx"}
          <input
            type="file"
            accept=".xlsx"
            className="sr-only"
            disabled={busy !== null}
            onChange={(event) => {
              void handleFile(event.target.files?.[0])
              event.currentTarget.value = ""
            }}
          />
        </label>
      </div>

      {error ? <p role="alert" className="mt-4 text-sm text-[hsl(var(--aia-red))]">{error}</p> : null}

      {analysis && sheet ? (
        <div className="mt-5 border-t aia-border-rule pt-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="aia-mono text-[10px] uppercase tracking-[0.16em] aia-text-muted">{analysis.fileName}</p>
              <p className="mt-1 text-sm text-[hsl(var(--aia-ink))]">
                {sheet.layout === "fixed_form"
                  ? `识别到固定版式表单：${sheet.fields?.length || 0} 个独立问题，${sheet.tables?.length || 0} 个可重复表格。`
                  : `识别到 ${analysis.sheets.length} 个有效工作表，当前表头位于第 ${sheet.headerRow} 行，共 ${sheet.columns.length} 列。`}
              </p>
            </div>
            {analysis.sheets.length > 1 ? (
              <label className="text-xs text-[hsl(var(--aia-ink))]">
                工作表
                <select
                  value={sheetIndex}
                  onChange={(event) => setSheetIndex(Number(event.target.value))}
                  className="aia-focus ml-2 border aia-border-rule bg-transparent px-3 py-2 text-sm"
                >
                  {analysis.sheets.map((item, index) => <option key={`${item.name}-${index}`} value={index}>{item.name}</option>)}
                </select>
              </label>
            ) : null}
          </div>

          {sheet.layout === "fixed_form" ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="border aia-border-rule p-4">
                <p className="aia-mono text-[10px] uppercase tracking-[0.14em] aia-text-muted">独立问题</p>
                <ol className="mt-3 space-y-2 text-sm text-[hsl(var(--aia-ink))]">
                  {(sheet.fields || []).map((field) => <li key={field.id}>{field.label}<span className="aia-text-muted"> · 第 {field.row} 行</span></li>)}
                </ol>
              </div>
              <div className="border aia-border-rule p-4">
                <p className="aia-mono text-[10px] uppercase tracking-[0.14em] aia-text-muted">可重复表格</p>
                <ol className="mt-3 space-y-3 text-sm text-[hsl(var(--aia-ink))]">
                  {(sheet.tables || []).map((table) => (
                    <li key={table.id}><strong>{table.label}</strong><span className="aia-text-muted block text-xs">{table.columns.map((column) => column.label).join("、")}</span></li>
                  ))}
                </ol>
              </div>
            </div>
          ) : <div className="mt-4 overflow-x-auto border aia-border-rule">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-[hsl(var(--aia-paper-strong))]">
                  <th className="border-b aia-border-rule px-3 py-2 font-medium">列</th>
                  <th className="border-b aia-border-rule px-3 py-2 font-medium">表头</th>
                  <th className="border-b aia-border-rule px-3 py-2 font-medium">建议类型</th>
                </tr>
              </thead>
              <tbody>
                {sheet.columns.map((column) => (
                  <tr key={column.id} className="border-b aia-border-rule last:border-b-0">
                    <td className="aia-mono px-3 py-2 text-xs aia-text-muted">{column.columnIndex}</td>
                    <td className="px-3 py-2 text-[hsl(var(--aia-ink))]">{column.label}</td>
                    <td className="px-3 py-2 text-xs aia-text-muted">{columnTypeLabel(column.type)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}

          {sheet.layout === "fixed_form" ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void createFixedDraft()}
              className="aia-focus mt-5 w-full border border-[hsl(var(--aia-red))] bg-[hsl(var(--aia-red))] px-4 py-3 text-left text-sm font-semibold text-white transition-opacity disabled:cursor-wait disabled:opacity-60"
            >
              按原版式结构生成表单
              <span className="mt-1 block text-xs font-normal text-white/80">独立填写区生成问题，费用和行程明细生成可增删行表格；创建后可继续校对。</span>
            </button>
          ) : <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void createDraft("table")}
              className="aia-focus border border-[hsl(var(--aia-red))] bg-[hsl(var(--aia-red))] px-4 py-3 text-left text-sm font-semibold text-white transition-opacity disabled:cursor-wait disabled:opacity-60"
            >
              生成多行表格
              <span className="mt-1 block text-xs font-normal text-white/80">填写人可以增删多行；导出时每一行成为一条 Excel 数据。</span>
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void createDraft("fields")}
              className="aia-focus border aia-border-rule px-4 py-3 text-left text-sm font-semibold text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] disabled:cursor-wait disabled:opacity-60"
            >
              每个表头生成一个问题
              <span className="aia-text-muted mt-1 block text-xs font-normal">适合每位填写人只提交一行数据的场景。</span>
            </button>
          </div>}
        </div>
      ) : null}
    </div>
  )
}
