import type { OADocumentManifestField } from "@/lib/oa-document-templates"

export interface VersionedSubmission {
  id: string
  documentTemplateVersionId?: string | null
}

export function routeSubmissionsByTemplateVersion<T extends VersionedSubmission>(submissions: readonly T[]) {
  const grouped = new Map<string, T[]>()
  for (const submission of submissions) {
    const versionId = submission.documentTemplateVersionId?.trim()
    if (!versionId) throw new Error(`申请 ${submission.id} 缺少提交时的文档模板版本`)
    const values = grouped.get(versionId) || []
    values.push(submission)
    grouped.set(versionId, values)
  }
  return grouped
}

function scalarCell(value: unknown) {
  if (value === null || value === undefined) return ""
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value) && value.every((item) => typeof item === "string" || typeof item === "number")) return value.join("；")
  throw new Error("导出答案包含不受支持的对象值")
}

export function buildSubmissionExportTable<T extends { id: string; answers: Record<string, unknown> }>(fields: readonly OADocumentManifestField[], submissions: readonly T[]) {
  const header = ["申请编号", ...fields.map((field) => field.label)]
  const rows = submissions.map((submission) => [submission.id, ...fields.map((field) => scalarCell(submission.answers[field.fieldId]))])
  return { header, rows }
}

export function safeExportFilename(value: string, fallback = "申请材料") {
  const normalized = value.normalize("NFKC").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/\s+/g, " ").trim().replace(/[. ]+$/g, "")
  return (normalized || fallback).slice(0, 120)
}

