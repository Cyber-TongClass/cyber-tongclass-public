import { normalizeFormSlug, type OAFormUpsertPayload } from "@/lib/oa-forms"

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export const OA_SPREADSHEET_LIMITS = {
  maxSourceBytes: 10 * 1024 * 1024,
  maxSheets: 50,
  maxRows: 50,
  maxColumns: 256,
  maxHeaderChars: 200,
} as const

export type OASpreadsheetImportMode = "table" | "fields"
export type OASpreadsheetColumnType = "text" | "number" | "date"

export type OASpreadsheetColumn = {
  id: string
  columnIndex: number
  label: string
  type: OASpreadsheetColumnType
}

export type OASpreadsheetSheet = {
  name: string
  headerRow: number
  columns: OASpreadsheetColumn[]
}

function normalizedHeader(value: string) {
  return value.normalize("NFKC").replace(/[\u00a0\u3000]/g, " ").replace(/\s+/g, " ").trim()
}

function safeHeaderId(label: string, columnIndex: number) {
  const suffix = label.normalize("NFKC").toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "column"
  return `xlsx_${columnIndex}_${suffix}`
}

export function assertSpreadsheetSourceSize(size: number) {
  if (!Number.isSafeInteger(size) || size <= 0) throw new Error("Excel 文件不能为空")
  if (size > OA_SPREADSHEET_LIMITS.maxSourceBytes) throw new Error("Excel 文件不能超过 10 MiB")
}

export function normalizeSpreadsheetSource(mimeType: string, fileName: string, bytes: Uint8Array): "xlsx" {
  const normalizedName = fileName.normalize("NFKC").trim()
  const leafName = normalizedName.split(/[\\/]/).pop() || ""
  if (!normalizedName || leafName !== normalizedName || /[\u0000-\u001f]/.test(normalizedName)) throw new Error("Excel 文件名不安全")
  if (!normalizedName.toLocaleLowerCase("en-US").endsWith(".xlsx")) throw new Error("仅支持 .xlsx 文件")
  if (mimeType !== XLSX_MIME) throw new Error("Excel 文件 MIME 类型不受支持")
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
    throw new Error("Excel 文件签名与声明格式不一致")
  }
  return "xlsx"
}

export function inferSpreadsheetColumnType(label: string): OASpreadsheetColumnType {
  const value = normalizedHeader(label)
  if (/(?:电话|手机|编号|证件|代码|邮编|学号|账号)/.test(value)) return "text"
  if (/(?:日期|时间|年月|起止)/.test(value)) return "date"
  if (/^(?:序号|数量|人数|金额|分数|总数|计数)$/.test(value)) return "number"
  return "text"
}

export function normalizeSpreadsheetHeaders(labels: string[]): OASpreadsheetColumn[] {
  if (!Array.isArray(labels) || labels.length < 2) throw new Error("Excel 表头至少需要两个字段")
  if (labels.length > OA_SPREADSHEET_LIMITS.maxColumns) throw new Error(`Excel 表头不能超过 ${OA_SPREADSHEET_LIMITS.maxColumns} 列`)
  const seen = new Set<string>()
  return labels.map((rawLabel, index) => {
    const label = normalizedHeader(rawLabel)
    if (!label) throw new Error(`Excel 表头第 ${index + 1} 列为空白`)
    if (label.length > OA_SPREADSHEET_LIMITS.maxHeaderChars) throw new Error(`Excel 表头第 ${index + 1} 列文字过长`)
    const naturalKey = label.toLocaleLowerCase("en-US")
    if (seen.has(naturalKey)) throw new Error(`Excel 表头包含重复字段：${label}`)
    seen.add(naturalKey)
    return { id: safeHeaderId(label, index + 1), columnIndex: index + 1, label, type: inferSpreadsheetColumnType(label) }
  })
}

function titleFromFileName(fileName: string) {
  const leafName = fileName.normalize("NFKC").split(/[\\/]/).pop()?.trim() || ""
  return leafName.replace(/\.xlsx$/i, "").trim() || "未命名 Excel 表单"
}

export function createSpreadsheetImportDraftPayload(
  fileName: string,
  creatorId: string,
  nonce: string,
  sheetName: string,
  columns: OASpreadsheetColumn[],
  mode: OASpreadsheetImportMode,
): OAFormUpsertPayload {
  const title = titleFromFileName(fileName)
  const normalizedSheetName = normalizedHeader(sheetName)
  if (!creatorId.trim()) throw new Error("Excel 表单创建者无效")
  if (!normalizedSheetName) throw new Error("Excel 工作表名称无效")
  const normalizedColumns = normalizeSpreadsheetHeaders(columns.map((column) => column.label))
  const safeNonce = normalizeFormSlug(nonce)
  const fields = mode === "table"
    ? [{
        id: "xlsx_table",
        type: "table" as const,
        label: `${normalizedSheetName}明细`,
        required: false,
        helpText: `字段来自 Excel 工作表“${normalizedSheetName}”，可按行添加或删除。`,
        columns: normalizedColumns.map(({ id, label, type }) => ({ id, label, type, required: false })),
      }]
    : normalizedColumns.map(({ id, label, type }) => ({ id, type, label, required: false }))
  return {
    title,
    slug: `xlsx-import-${safeNonce}-${normalizeFormSlug(title)}`,
    description: `由 Excel 工作表“${normalizedSheetName}”的表头自动生成。请检查字段类型后补充可见范围与审批流程。`,
    category: "教学服务",
    kind: "form",
    visibility: "members",
    status: "draft",
    allowMultipleSubmissions: true,
    fields,
    resultFields: [],
    targetScope: { userIds: [creatorId] },
  }
}
