import { normalizeFormSlug } from "@/lib/oa-forms"
import type { OAFormField } from "@/types"

export const WORD_IMPORT_PLACEHOLDER_FIELD_ID = "word_import_placeholder"

export function wordImportTitleFromFileName(fileName: string) {
  const leafName = fileName.normalize("NFKC").split(/[\\/]/).pop()?.trim() || ""
  return leafName.replace(/\.docx?$/i, "").trim() || "未命名 Word 表单"
}

export function createWordImportDraftPayload(fileName: string, creatorId: string, nonce: string) {
  const title = wordImportTitleFromFileName(fileName)
  const safeNonce = normalizeFormSlug(nonce)
  return {
    title,
    slug: `word-import-${safeNonce}-${normalizeFormSlug(title)}`,
    description: "由 Word 自动识别创建的临时草稿。确认字段后，请补充可见范围与审批流程。",
    category: "教学服务",
    kind: "form" as const,
    visibility: "members" as const,
    status: "draft" as const,
    allowMultipleSubmissions: true,
    fields: [
      {
        id: WORD_IMPORT_PLACEHOLDER_FIELD_ID,
        type: "text" as const,
        label: "等待 Word 识别",
        required: false,
        helpText: "系统将在确认批注后自动替换此临时字段。",
      },
    ],
    resultFields: [],
    targetScope: { userIds: [creatorId] },
  }
}

export function withoutWordImportPlaceholder(fields: OAFormField[]) {
  return fields.filter((field) => field.id !== WORD_IMPORT_PLACEHOLDER_FIELD_ID)
}
