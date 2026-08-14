import type { OADocumentManifestField, OADocumentTemplateManifest } from "@/lib/oa-document-templates"
import { buildSubmissionExportTable, safeExportFilename } from "@/lib/server/oa-word-export-data"
import { fillWordTemplate, fillWordTemplateRepeatRows } from "@/lib/server/oa-word-fill"
import { convertFilledDocxToLegacyDoc, convertFilledDocxToPdf } from "@/lib/server/office-conversion"
import type { OfficeCapabilities } from "@/lib/server/office-capabilities"
import { buildSimpleXlsx } from "@/lib/server/simple-xlsx"
import { buildSimpleZip } from "@/lib/server/simple-zip"

export interface AuthorizedExportAccess {
  submission: {
    _id: string
    formId: string
    submitterName?: string
    studentId?: string
    submittedAt?: number
    answers: Record<string, unknown>
    formSnapshot?: {
      fields?: Array<{
        id: string
        label: string
        type: string
        columns?: Array<{ id: string; label: string; type: string; required?: boolean }>
      }>
    }
    documentTemplateVersionId?: string | null
  }
  form: { _id: string; title: string }
  version: null | {
    _id: string
    sourceType: "doc" | "docx"
    sourceFileName: string
    compiledStorageId?: string
    manifest: OADocumentTemplateManifest
  }
  compiledUrl?: string | null
}

export type ExportArtifact = { bytes: Buffer; fileName: string; contentType: string }
type SnapshotField = NonNullable<NonNullable<AuthorizedExportAccess["submission"]["formSnapshot"]>["fields"]>[number]

function trustedFileDisplayNames(fields: readonly OADocumentManifestField[], answers: Record<string, unknown>) {
  const result: Record<string, string | string[]> = {}
  for (const field of fields) {
    if (field.answerType !== "file") continue
    const value = answers[field.fieldId]
    if (!Array.isArray(value)) continue
    const names = value.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null
      const name = (item as { fileName?: unknown }).fileName
      return typeof name === "string" && name.trim() ? safeExportFilename(name.trim(), "附件") : null
    }).filter((name): name is string => !!name)
    if (names.length) result[field.fieldId] = names
  }
  return result
}

export function assertCompiledTemplate(access: AuthorizedExportAccess) {
  if (!access.version?.compiledStorageId || !access.compiledUrl) throw new Error("该申请提交时的 Word 模板尚未编译")
  if (!access.version.manifest?.fields?.length) throw new Error("Word 模板没有已确认字段")
  return access.version
}

export function fillAuthorizedSubmission(template: Uint8Array | Buffer, access: AuthorizedExportAccess) {
  const version = assertCompiledTemplate(access)
  return fillWordTemplate(template, {
    fields: version.manifest.fields,
    answers: access.submission.answers,
    fileDisplayNames: trustedFileDisplayNames(version.manifest.fields, access.submission.answers),
  })
}

function baseDocumentName(access: AuthorizedExportAccess) {
  return safeExportFilename(`${access.form.title}-${access.submission.submitterName || access.submission.studentId || String(access.submission._id).slice(-8)}`)
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function wordRun(value: unknown, bold = false) {
  return `<w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="宋体"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r>`
}

function wordParagraph(value: unknown, bold = false) {
  return `<w:p><w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/></w:pPr>${wordRun(value, bold)}</w:p>`
}

function genericAnswer(value: unknown) {
  if (value === undefined || value === null || value === "") return "—"
  if (Array.isArray(value)) return value.map((item) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const record = item as Record<string, unknown>
      if (typeof record.fileName === "string") return record.fileName
      return Object.values(record).map((cellValue) => String(cellValue ?? "")).filter(Boolean).join("，")
    }
    return String(item)
  }).filter(Boolean).join("；") || "—"
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).map((item) => String(item ?? "")).filter(Boolean).join("，") || "—"
  return String(value)
}

function wordTable(field: SnapshotField, value: unknown) {
  const columns = field.columns || []
  const rows = Array.isArray(value) ? value.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as Array<Record<string, unknown>> : []
  const cellXml = (text: unknown, bold = false) => `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${wordParagraph(text, bold)}</w:tc>`
  const rowXml = (values: unknown[], bold = false) => `<w:tr>${values.map((item) => cellXml(item, bold)).join("")}</w:tr>`
  return `${wordParagraph(field.label, true)}<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="B8B8B8"/><w:left w:val="single" w:sz="4" w:color="B8B8B8"/><w:bottom w:val="single" w:sz="4" w:color="B8B8B8"/><w:right w:val="single" w:sz="4" w:color="B8B8B8"/><w:insideH w:val="single" w:sz="4" w:color="D9D9D9"/><w:insideV w:val="single" w:sz="4" w:color="D9D9D9"/></w:tblBorders></w:tblPr>${rowXml(columns.map((column) => column.label), true)}${rows.map((row) => rowXml(columns.map((column) => genericAnswer(row[column.id])))).join("")}</w:tbl>`
}

export function buildGenericDocxArtifact(access: AuthorizedExportAccess): ExportArtifact {
  const fields = access.submission.formSnapshot?.fields || []
  const body = [
    `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="260"/></w:pPr><w:r><w:rPr><w:b/><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="宋体"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:t>${escapeXml(access.form.title)}</w:t></w:r></w:p>`,
    wordParagraph(`申请人：${access.submission.submitterName || "—"}`),
    wordParagraph(`学号 / 工号：${access.submission.studentId || "—"}`),
    wordParagraph(`提交时间：${access.submission.submittedAt ? new Date(access.submission.submittedAt).toLocaleString("zh-CN") : "—"}`),
    ...fields.map((field) => field.type === "table"
      ? wordTable(field, access.submission.answers[field.id])
      : `${wordParagraph(field.label, true)}${wordParagraph(genericAnswer(access.submission.answers[field.id]))}`),
    `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>`,
  ].join("")
  const bytes = buildSimpleZip([
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: "word/document.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>` },
  ])
  return { bytes, fileName: `${baseDocumentName(access)}.docx`, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
}

export async function buildSingleDocumentArtifact(args: {
  access: AuthorizedExportAccess
  templateBytes: Uint8Array | Buffer
  format: "docx" | "doc" | "pdf"
  capabilities: OfficeCapabilities
}) {
  const filled = fillAuthorizedSubmission(args.templateBytes, args.access)
  const base = baseDocumentName(args.access)
  if (args.format === "docx") return { bytes: filled.bytes, fileName: `${base}.docx`, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
  if (args.format === "pdf") {
    if (!args.capabilities.canExportPdf) throw new Error(args.capabilities.unavailableReasons[0] || "PDF 导出能力不可用")
    const converted = await convertFilledDocxToPdf(filled.bytes, `${base}.docx`, { capabilities: args.capabilities })
    return { bytes: converted.bytes, fileName: `${base}.pdf`, contentType: "application/pdf" }
  }
  if (!args.capabilities.canExportLegacyDoc) throw new Error(args.capabilities.unavailableReasons[0] || "旧版 Word 导出能力不可用")
  const converted = await convertFilledDocxToLegacyDoc(filled.bytes, `${base}.docx`, { capabilities: args.capabilities })
  return { bytes: converted.bytes, fileName: `${base}.doc`, contentType: "application/msword" }
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) return value.map((item) => {
    if (typeof item === "string" || typeof item === "number") return String(item)
    if (item && typeof item === "object" && typeof (item as { fileName?: unknown }).fileName === "string") return (item as { fileName: string }).fileName
    if (item && typeof item === "object") return Object.values(item as Record<string, unknown>).map((value) => cell(value)).filter(Boolean).join("，")
    return ""
  }).filter(Boolean).join("；")
  return ""
}

export function buildAuthorizedTable(accesses: AuthorizedExportAccess[], selectedFieldIds?: string[]) {
  const fields = new Map<string, SnapshotField>()
  for (const access of accesses) {
    for (const field of access.submission.formSnapshot?.fields || []) if (!fields.has(field.id)) fields.set(field.id, field)
  }
  if (!fields.size) {
    for (const field of accesses[0]?.version?.manifest.fields || []) {
      fields.set(field.fieldId, { id: field.fieldId, label: field.label, type: field.answerType })
    }
  }
  if (selectedFieldIds) {
    const selected = new Set(selectedFieldIds)
    const unknown = selectedFieldIds.find((fieldId) => !fields.has(fieldId))
    if (unknown) throw new Error("选择的导出字段无效")
    for (const fieldId of [...fields.keys()]) if (!selected.has(fieldId)) fields.delete(fieldId)
  }

  const provenance = (access: AuthorizedExportAccess) => [
    String(access.submission._id),
    access.submission.submitterName || "",
    access.submission.studentId || "",
    access.submission.submittedAt ? new Date(access.submission.submittedAt).toISOString() : "",
  ]
  const tableFields = [...fields.values()].filter((field) => field.type === "table")
  const repeatableTable = tableFields.length === 1 && tableFields[0].columns?.length ? tableFields[0] : null
  if (repeatableTable?.columns) {
    const scalarFields = [...fields.values()].filter((field) => field.id !== repeatableTable.id)
    const header = ["申请编号", "申请人", "学号", "提交时间", ...scalarFields.map((field) => field.label), ...repeatableTable.columns.map((column) => column.label)]
    const rows = accesses.flatMap((access) => {
      const answer = access.submission.answers[repeatableTable.id]
      if (!Array.isArray(answer)) return []
      return answer.flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return []
        const record = item as Record<string, unknown>
        return [[
          ...provenance(access),
          ...scalarFields.map((field) => cell(access.submission.answers[field.id])),
          ...repeatableTable.columns!.map((column) => cell(record[column.id])),
        ]]
      })
    })
    return { header, rows }
  }

  const header = ["申请编号", "申请人", "学号", "提交时间", ...[...fields.values()].map((field) => field.label)]
  const rows = accesses.map((access) => [
    ...provenance(access),
    ...fields.keys().map((fieldId) => cell(access.submission.answers[fieldId])),
  ])
  return { header, rows }
}

function csvCell(value: string) {
  const formulaSafe = /^[=+\-@]/.test(value) ? `'${value}` : value
  return `"${formulaSafe.replace(/"/g, '""')}"`
}

export function buildCsvArtifact(accesses: AuthorizedExportAccess[], selectedFieldIds?: string[]) {
  const { header, rows } = buildAuthorizedTable(accesses, selectedFieldIds)
  const title = safeExportFilename(accesses[0]?.form.title || "OA表单")
  return { bytes: Buffer.from(`\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`, "utf8"), fileName: `${title}-汇总.csv`, contentType: "text/csv; charset=utf-8" }
}

export function buildXlsxArtifact(accesses: AuthorizedExportAccess[], selectedFieldIds?: string[]) {
  const { header, rows } = buildAuthorizedTable(accesses, selectedFieldIds)
  const title = safeExportFilename(accesses[0]?.form.title || "OA表单")
  return {
    bytes: buildSimpleZip(buildSimpleXlsx([header, ...rows], { sheetName: "申请汇总", title: `${title}汇总`, creator: "北京大学人工智能研究院" })),
    fileName: `${title}-汇总.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }
}

export function buildWordZipArtifact(documents: ExportArtifact[], title: string) {
  return {
    bytes: buildSimpleZip(documents.map((document) => ({ name: document.fileName, data: document.bytes }))),
    fileName: `${safeExportFilename(title)}-Word材料.zip`,
    contentType: "application/zip",
  }
}

export function buildRepeatRowArtifact(template: Uint8Array | Buffer, accesses: AuthorizedExportAccess[], repeatFieldId: string) {
  const version = assertCompiledTemplate(accesses[0])
  const filled = fillWordTemplateRepeatRows(template, {
    fields: version.manifest.fields,
    repeatFieldId,
    submissions: accesses.map((access) => ({ answers: access.submission.answers, fileDisplayNames: trustedFileDisplayNames(version.manifest.fields, access.submission.answers) })),
  })
  return { bytes: filled.bytes, fileName: `${safeExportFilename(accesses[0].form.title)}-汇总.docx`, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
}

export function exportTableFromManifest(accesses: AuthorizedExportAccess[]) {
  const fields = accesses[0]?.version?.manifest.fields || []
  return buildSubmissionExportTable(fields, accesses.map((access) => ({ id: String(access.submission._id), answers: access.submission.answers })))
}
