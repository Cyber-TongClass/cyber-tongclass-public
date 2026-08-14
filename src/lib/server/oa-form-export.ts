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

function cell(value: unknown) {
  if (value === null || value === undefined) return ""
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) return value.map((item) => {
    if (typeof item === "string" || typeof item === "number") return String(item)
    if (item && typeof item === "object" && typeof (item as { fileName?: unknown }).fileName === "string") return (item as { fileName: string }).fileName
    return ""
  }).filter(Boolean).join("；")
  return ""
}

export function buildAuthorizedTable(accesses: AuthorizedExportAccess[]) {
  type SnapshotField = NonNullable<NonNullable<AuthorizedExportAccess["submission"]["formSnapshot"]>["fields"]>[number]
  const fields = new Map<string, SnapshotField>()
  for (const access of accesses) {
    for (const field of access.submission.formSnapshot?.fields || []) if (!fields.has(field.id)) fields.set(field.id, field)
  }
  if (!fields.size) {
    for (const field of accesses[0]?.version?.manifest.fields || []) {
      fields.set(field.fieldId, { id: field.fieldId, label: field.label, type: field.answerType })
    }
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

export function buildCsvArtifact(accesses: AuthorizedExportAccess[]) {
  const { header, rows } = buildAuthorizedTable(accesses)
  const title = safeExportFilename(accesses[0]?.form.title || "OA表单")
  return { bytes: Buffer.from(`\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`, "utf8"), fileName: `${title}-汇总.csv`, contentType: "text/csv; charset=utf-8" }
}

export function buildXlsxArtifact(accesses: AuthorizedExportAccess[]) {
  const { header, rows } = buildAuthorizedTable(accesses)
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
