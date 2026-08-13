export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
export const DOC_MIME = "application/msword"

export const OA_DOCUMENT_LIMITS = Object.freeze({
  maxSourceBytes: 25 * 1024 * 1024,
  maxZipEntries: 5_000,
  maxExtractedBytes: 200 * 1024 * 1024,
  maxXmlPartBytes: 10 * 1024 * 1024,
  maxCompressionRatio: 100,
  maxDetectedRegions: 500,
  maxSelectedSubmissions: 100,
})

export type OADocumentSourceType = "doc" | "docx"
export type OADocumentRegionKind =
  | "table_cell"
  | "underline"
  | "label_blank"
  | "checkbox_group"
  | "radio_group"
  | "content_control"
  | "bookmark"
  | "legacy_placeholder"
  | "repeat_row"
export type OADocumentSuggestionConfidence = "high" | "medium" | "low"
export type OADocumentSuggestionReviewState = "confirmed" | "unresolved" | "ignored" | "deleted" | "conflict"
export type OADocumentTemplateStatus =
  | "uploaded"
  | "analyzing"
  | "reviewing"
  | "compiled"
  | "active"
  | "failed"
  | "archived"
export type OADocumentAnswerType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "email"
  | "phone"
  | "single_choice"
  | "multiple_choice"
  | "file"
export type OADocumentOutputMode = "replace" | "append" | "mark_choice" | "repeat_row"
export type OADocumentWriteTarget = "table-cell" | "inline-run" | "paragraph-after" | "choice" | "repeat-row"
export type OADocumentPageRotation = 0 | 90 | 180 | 270

export interface OADocumentStructuralLocator {
  partName: string
  path: string
  contextHash: string
}

export interface OADocumentVisualAnchor {
  page: number
  x: number
  y: number
  width: number
  height: number
  pageWidth: number
  pageHeight: number
  rotation: OADocumentPageRotation
  coordinateSpace: "normalized-pdf"
}

export interface OADocumentStructuralAnchor extends OADocumentStructuralLocator {
  writeTarget: OADocumentWriteTarget
  styleSourcePath?: string
}

export interface OADocumentBindingCandidate extends OADocumentStructuralLocator {
  id: string
  label: string
  description: string
  writeTarget: OADocumentWriteTarget
  styleSourcePath?: string
  visual: OADocumentVisualAnchor
}

export interface OADocumentSuggestion extends OADocumentStructuralLocator {
  id: string
  kind: OADocumentRegionKind
  label: string
  inferredAnswerType: OADocumentAnswerType
  confidence: OADocumentSuggestionConfidence
  reviewState: OADocumentSuggestionReviewState
  evidence: string[]
  conflictIds: string[]
  fieldId?: string
  required?: boolean
  maxLength?: number
  options?: string[]
  visual?: OADocumentVisualAnchor
  bindingCandidateIds?: string[]
}

export interface OADocumentAnchor extends OADocumentStructuralLocator {
  fieldId: string
  kind: OADocumentRegionKind
  output: {
    mode: OADocumentOutputMode
    multiline?: boolean
    preservePrototype?: boolean
  }
  visual?: OADocumentVisualAnchor
  bindingCandidateId?: string
  structural?: OADocumentStructuralAnchor
}

export interface OADocumentManifestField {
  fieldId: string
  label: string
  answerType: OADocumentAnswerType
  required: boolean
  maxLength?: number
  options?: string[]
}

export interface OADocumentTemplateManifest {
  syntaxVersion: number
  compilerVersion: string
  fields: OADocumentManifestField[]
  anchors: OADocumentAnchor[]
  suggestions: OADocumentSuggestion[]
}

export interface OADocumentTemplateWarning {
  code: string
  message: string
  severity: "info" | "warning" | "error"
  partName?: string
  regionId?: string
}

export interface OADocumentTemplateCapabilities {
  canAnalyze: boolean
  canCompile: boolean
  canExportDocx: boolean
  canExportLegacyDoc: boolean
  canExportPdf: boolean
  unavailableReasons: string[]
  missingFonts: string[]
}

export interface OADocumentTemplateVersionSummary {
  id: string
  formId: string
  version: number
  sourceType: OADocumentSourceType
  sourceFileName: string
  sourceMimeType: string
  sourceSize: number
  sourceSha256: string
  compilerVersion: string
  syntaxVersion: number
  status: OADocumentTemplateStatus
  warnings: OADocumentTemplateWarning[]
  capabilities: OADocumentTemplateCapabilities
  createdAt: number
  updatedAt: number
}

const ANSWER_TYPES = new Set<OADocumentAnswerType>([
  "text", "textarea", "number", "date", "email", "phone", "single_choice", "multiple_choice", "file",
])
const REGION_KINDS = new Set<OADocumentRegionKind>([
  "table_cell", "underline", "label_blank", "checkbox_group", "radio_group", "content_control", "bookmark", "legacy_placeholder", "repeat_row",
])
const OUTPUT_MODES = new Set<OADocumentOutputMode>(["replace", "append", "mark_choice", "repeat_row"])
const WRITE_TARGETS = new Set<OADocumentWriteTarget>(["table-cell", "inline-run", "paragraph-after", "choice", "repeat-row"])
const PAGE_ROTATIONS = new Set<OADocumentPageRotation>([0, 90, 180, 270])

function hasDocxSignature(bytes?: Uint8Array) {
  return !!bytes && bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
}

function hasOleSignature(bytes?: Uint8Array) {
  const magic = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
  return !!bytes && bytes.length >= magic.length && magic.every((byte, index) => bytes[index] === byte)
}

export function normalizeWordSourceType(mimeType: string, filename: string, bytes?: Uint8Array): OADocumentSourceType {
  if (!filename || filename.includes("/") || filename.includes("\\") || filename.includes("\0") || filename === "." || filename === "..") {
    throw new Error("Word 文件名不安全")
  }
  const extension = filename.toLocaleLowerCase("en-US").endsWith(".docx")
    ? "docx"
    : filename.toLocaleLowerCase("en-US").endsWith(".doc") ? "doc" : null
  if (!extension) throw new Error("仅支持 .docx 或 .doc 文件")
  const mimeSource = mimeType === DOCX_MIME ? "docx" : mimeType === DOC_MIME ? "doc" : null
  if (!mimeSource) throw new Error("Word 文件 MIME 类型不受支持")
  if (mimeSource !== extension) throw new Error("Word 文件扩展名与 MIME 类型不一致")
  if (bytes && ((extension === "docx" && !hasDocxSignature(bytes)) || (extension === "doc" && !hasOleSignature(bytes)))) {
    throw new Error("Word 文件签名与声明格式不一致")
  }
  return extension
}

export function assertWordSourceSize(size: number) {
  if (!Number.isSafeInteger(size) || size <= 0) throw new Error("Word 文件不能为空")
  if (size > OA_DOCUMENT_LIMITS.maxSourceBytes) throw new Error("Word 文件不能超过 25 MiB")
}

export function assertSelectedSubmissionCount(count: number) {
  if (!Number.isSafeInteger(count) || count < 1) throw new Error("至少选择一条申请")
  if (count > OA_DOCUMENT_LIMITS.maxSelectedSubmissions) throw new Error("每批最多导出 100 条申请")
}

export function anchorNaturalKey(anchor: Pick<OADocumentAnchor, "partName" | "kind" | "path" | "contextHash">) {
  return `${anchor.partName}|${anchor.kind}|${anchor.path}|${anchor.contextHash}`
}

function fnv1a32(value: string) {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}

export function createStableDocumentFieldId(label: string, locator: string) {
  const slug = label
    .normalize("NFKD")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 36) || "answer"
  return `field_${slug}_${fnv1a32(`${label.normalize("NFKC")}|${locator}`)}`
}

export function countTemplateReviewStates(suggestions: Array<Pick<OADocumentSuggestion, "reviewState" | "conflictIds">>) {
  const result = { confirmed: 0, unresolved: 0, ignored: 0, deleted: 0, conflicts: 0 }
  for (const suggestion of suggestions) {
    if (suggestion.reviewState === "confirmed") result.confirmed += 1
    else if (suggestion.reviewState === "ignored") result.ignored += 1
    else if (suggestion.reviewState === "deleted") result.deleted += 1
    else result.unresolved += 1
    if (suggestion.reviewState === "conflict" || suggestion.conflictIds.length > 0) result.conflicts += 1
  }
  return result
}

function assertIdentifier(value: string, label: string) {
  if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,127}$/.test(value)) throw new Error(`${label}格式无效`)
}

function assertSafePartName(partName: string) {
  if (!partName || partName.startsWith("/") || partName.includes("\\") || partName.split("/").includes("..")) {
    throw new Error("锚点部件路径无效")
  }
  if (!/^(word\/|docProps\/|customXml\/)/.test(partName)) throw new Error("锚点必须位于受支持的 Word 部件")
}

function assertVisualAnchor(anchor: OADocumentVisualAnchor) {
  const coordinates = [anchor.x, anchor.y, anchor.width, anchor.height]
  if (!Number.isSafeInteger(anchor.page) || anchor.page < 1) throw new Error("可视锚点页码无效")
  if (![...coordinates, anchor.pageWidth, anchor.pageHeight].every(Number.isFinite)) throw new Error("可视锚点包含非有限数值")
  if (anchor.pageWidth <= 0 || anchor.pageHeight <= 0) throw new Error("可视锚点页面尺寸无效")
  if (anchor.coordinateSpace !== "normalized-pdf") throw new Error("可视锚点坐标空间无效")
  if (!PAGE_ROTATIONS.has(anchor.rotation)) throw new Error("可视锚点旋转角度无效")
  if (anchor.x < 0 || anchor.y < 0 || anchor.width <= 0 || anchor.height <= 0 || anchor.x + anchor.width > 1 || anchor.y + anchor.height > 1) {
    throw new Error("可视锚点矩形必须完整位于页面内")
  }
}

function assertStructuralAnchor(anchor: OADocumentStructuralAnchor) {
  assertSafePartName(anchor.partName)
  if (!anchor.path.trim() || !anchor.contextHash.trim()) throw new Error("锚点结构定位不完整")
  if (!WRITE_TARGETS.has(anchor.writeTarget)) throw new Error("锚点写入目标无效")
  if (anchor.styleSourcePath !== undefined && !anchor.styleSourcePath.trim()) throw new Error("锚点样式来源路径无效")
}

export function validateTemplateManifest(manifest: OADocumentTemplateManifest) {
  if (!Number.isSafeInteger(manifest.syntaxVersion) || manifest.syntaxVersion < 1) throw new Error("syntaxVersion 无效")
  if (!manifest.compilerVersion?.trim() || manifest.compilerVersion.length > 100) throw new Error("compilerVersion 无效")
  if (manifest.fields.length > OA_DOCUMENT_LIMITS.maxDetectedRegions || manifest.anchors.length > OA_DOCUMENT_LIMITS.maxDetectedRegions || manifest.suggestions.length > OA_DOCUMENT_LIMITS.maxDetectedRegions) {
    throw new Error("文档区域超过 500 个限制")
  }
  const fieldIds = new Set<string>()
  for (const field of manifest.fields) {
    assertIdentifier(field.fieldId, "字段 ID")
    if (fieldIds.has(field.fieldId)) throw new Error(`字段 ID 重复：${field.fieldId}`)
    fieldIds.add(field.fieldId)
    if (!field.label.trim() || field.label.length > 200) throw new Error(`字段 ${field.fieldId} 的标签无效`)
    if (!ANSWER_TYPES.has(field.answerType)) throw new Error(`字段 ${field.fieldId} 的答案类型无效`)
    if (field.maxLength !== undefined && (!Number.isSafeInteger(field.maxLength) || field.maxLength < 1 || field.maxLength > 100_000)) {
      throw new Error(`字段 ${field.fieldId} 的 maxLength 无效`)
    }
    if ((field.answerType === "single_choice" || field.answerType === "multiple_choice") && (!field.options || field.options.length < 1)) {
      throw new Error(`选项字段 ${field.fieldId} 缺少选项`)
    }
  }
  const anchorKeys = new Set<string>()
  const bindingCandidateIds = new Set<string>()
  const anchorCountsByField = new Map<string, number>()
  const anchorsByField = new Map<string, OADocumentAnchor>()
  for (const anchor of manifest.anchors) {
    if (!fieldIds.has(anchor.fieldId)) throw new Error(`锚点引用不存在的字段：${anchor.fieldId}`)
    if (!REGION_KINDS.has(anchor.kind)) throw new Error("锚点区域类型无效")
    if (!OUTPUT_MODES.has(anchor.output.mode)) throw new Error("锚点输出模式无效")
    assertSafePartName(anchor.partName)
    if (!anchor.path.trim() || !anchor.contextHash.trim()) throw new Error("锚点结构定位不完整")
    const key = anchorNaturalKey(anchor)
    if (anchorKeys.has(key)) throw new Error(`锚点自然键重复：${key}`)
    anchorKeys.add(key)
    anchorCountsByField.set(anchor.fieldId, (anchorCountsByField.get(anchor.fieldId) ?? 0) + 1)
    anchorsByField.set(anchor.fieldId, anchor)
    if (manifest.syntaxVersion >= 2) {
      if (!anchor.visual || !anchor.bindingCandidateId || !anchor.structural) throw new Error(`字段 ${anchor.fieldId} 缺少完整双锚点`)
      assertVisualAnchor(anchor.visual)
      assertIdentifier(anchor.bindingCandidateId, "候选 ID")
      if (bindingCandidateIds.has(anchor.bindingCandidateId)) throw new Error(`候选 ID 重复：${anchor.bindingCandidateId}`)
      bindingCandidateIds.add(anchor.bindingCandidateId)
      assertStructuralAnchor(anchor.structural)
      if (anchor.partName !== anchor.structural.partName || anchor.path !== anchor.structural.path || anchor.contextHash !== anchor.structural.contextHash) {
        throw new Error(`字段 ${anchor.fieldId} 的顶层结构定位必须与 structural 一致`)
      }
    }
  }
  if (manifest.syntaxVersion >= 2) {
    for (const fieldId of fieldIds) {
      if (anchorCountsByField.get(fieldId) !== 1) throw new Error(`字段 ${fieldId} 必须恰有一个锚点`)
    }
  }
  const suggestionIds = new Set<string>()
  for (const suggestion of manifest.suggestions) {
    assertIdentifier(suggestion.id, "建议 ID")
    if (suggestionIds.has(suggestion.id)) throw new Error(`建议 ID 重复：${suggestion.id}`)
    suggestionIds.add(suggestion.id)
    if (suggestion.visual) assertVisualAnchor(suggestion.visual)
    if (suggestion.bindingCandidateIds) {
      const suggestionCandidateIds = new Set<string>()
      for (const candidateId of suggestion.bindingCandidateIds) {
        assertIdentifier(candidateId, "候选 ID")
        if (suggestionCandidateIds.has(candidateId)) throw new Error(`建议 ${suggestion.id} 的候选 ID 重复：${candidateId}`)
        suggestionCandidateIds.add(candidateId)
      }
    }
    if (manifest.syntaxVersion >= 2 && suggestion.reviewState === "confirmed") {
      if (!suggestion.fieldId || !fieldIds.has(suggestion.fieldId)) throw new Error(`已确认建议 ${suggestion.id} 缺少有效字段`)
      const anchor = anchorsByField.get(suggestion.fieldId)
      if (!anchor?.bindingCandidateId || !suggestion.bindingCandidateIds?.includes(anchor.bindingCandidateId)) {
        throw new Error(`已确认建议 ${suggestion.id} 的候选 ID 必须绑定到字段 ${suggestion.fieldId} 的锚点`)
      }
    }
  }
  return manifest
}
