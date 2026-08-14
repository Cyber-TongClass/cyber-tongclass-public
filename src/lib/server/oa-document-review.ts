import {
  createStableDocumentFieldId,
  type OADocumentAnswerType,
  type OADocumentAnchor,
  type OADocumentBindingCandidate,
  type OADocumentManifestField,
  type OADocumentRegionKind,
  type OADocumentSuggestion,
  type OADocumentSuggestionReviewState,
  type OADocumentTemplateManifest,
  type OADocumentVisualAnchor,
} from "@/lib/oa-document-templates"
import type { OAPreviewLayout } from "@/lib/server/oa-preview-bundle"

export interface ReviewEdit {
  suggestionId: string
  reviewState: OADocumentSuggestionReviewState
  label: string
  inferredAnswerType: OADocumentAnswerType
  required?: boolean
  maxLength?: number
  placeholder?: string
  options?: string[]
  visual?: OADocumentVisualAnchor
  bindingCandidateId?: string
}

export class OADocumentReviewError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: 409 | 422) {
    super(message)
    this.name = "OADocumentReviewError"
  }
}

const ANSWER_TYPES = new Set<OADocumentAnswerType>([
  "text", "textarea", "number", "date", "email", "phone", "single_choice", "multiple_choice", "file",
])
const REVIEW_STATES = new Set<OADocumentSuggestionReviewState>(["confirmed", "unresolved", "ignored", "deleted", "conflict"])
const EDIT_KEYS = new Set(["suggestionId", "reviewState", "label", "inferredAnswerType", "required", "maxLength", "placeholder", "options", "visual", "bindingCandidateId"])
const VISUAL_KEYS = new Set(["page", "x", "y", "width", "height", "pageWidth", "pageHeight", "rotation", "coordinateSpace"])

function objectRecord(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new OADocumentReviewError("INVALID_REVIEW", message, 422)
  return value as Record<string, unknown>
}

function stringValue(value: unknown, label: string, maximum: number) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum || value.includes("\0")) {
    throw new OADocumentReviewError("INVALID_REVIEW", `${label}无效`, 422)
  }
  return value.trim()
}

function placeholderValue(value: unknown) {
  if (typeof value !== "string" || value.length > 500 || value.includes("\0")) {
    throw new OADocumentReviewError("INVALID_REVIEW", "提示文字无效", 422)
  }
  return value.trim()
}

function parseVisual(value: unknown): OADocumentVisualAnchor {
  const visual = objectRecord(value, "可视锚点无效")
  for (const key of Object.keys(visual)) if (!VISUAL_KEYS.has(key)) throw new OADocumentReviewError("INVALID_REVIEW", `可视锚点字段不允许：${key}`, 422)
  const numbers = ["page", "x", "y", "width", "height", "pageWidth", "pageHeight", "rotation"] as const
  for (const key of numbers) if (typeof visual[key] !== "number" || !Number.isFinite(visual[key])) throw new OADocumentReviewError("INVALID_REVIEW", `可视锚点 ${key} 无效`, 422)
  if (!Number.isSafeInteger(visual.page) || (visual.page as number) < 1) throw new OADocumentReviewError("INVALID_REVIEW", "可视锚点页码无效", 422)
  if (![0, 90, 180, 270].includes(visual.rotation as number) || visual.coordinateSpace !== "normalized-pdf") throw new OADocumentReviewError("INVALID_REVIEW", "可视锚点坐标空间无效", 422)
  const x = visual.x as number
  const y = visual.y as number
  const width = visual.width as number
  const height = visual.height as number
  if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 || y + height > 1 || (visual.pageWidth as number) <= 0 || (visual.pageHeight as number) <= 0) {
    throw new OADocumentReviewError("INVALID_REVIEW", "可视锚点矩形无效", 422)
  }
  return visual as unknown as OADocumentVisualAnchor
}

export function parseReviewEdits(input: unknown): ReviewEdit[] {
  const body = objectRecord(input, "审核请求无效")
  for (const key of Object.keys(body)) if (key !== "edits") throw new OADocumentReviewError("INVALID_REVIEW", `审核请求字段不允许：${key}`, 422)
  if (!Array.isArray(body.edits) || body.edits.length > 500) throw new OADocumentReviewError("INVALID_REVIEW", "审核编辑列表无效", 422)
  const seen = new Set<string>()
  return body.edits.map((raw, index) => {
    const value = objectRecord(raw, `第 ${index + 1} 条审核编辑无效`)
    for (const key of Object.keys(value)) if (!EDIT_KEYS.has(key)) throw new OADocumentReviewError("INVALID_REVIEW", `审核编辑字段不允许：${key}`, 422)
    const suggestionId = stringValue(value.suggestionId, "建议 ID", 128)
    if (seen.has(suggestionId)) throw new OADocumentReviewError("INVALID_REVIEW", `建议 ID 重复：${suggestionId}`, 422)
    seen.add(suggestionId)
    if (!REVIEW_STATES.has(value.reviewState as OADocumentSuggestionReviewState)) throw new OADocumentReviewError("INVALID_REVIEW", "审核状态无效", 422)
    const inferredAnswerType = value.inferredAnswerType as OADocumentAnswerType
    if (!ANSWER_TYPES.has(inferredAnswerType)) throw new OADocumentReviewError("INVALID_REVIEW", "答案类型无效", 422)
    const label = stringValue(value.label, "字段标签", 200)
    if (value.required !== undefined && typeof value.required !== "boolean") throw new OADocumentReviewError("INVALID_REVIEW", "required 无效", 422)
    if (value.maxLength !== undefined && (!Number.isSafeInteger(value.maxLength) || (value.maxLength as number) < 1 || (value.maxLength as number) > 100_000)) throw new OADocumentReviewError("INVALID_REVIEW", "maxLength 无效", 422)
    if (value.placeholder !== undefined && typeof value.placeholder !== "string") throw new OADocumentReviewError("INVALID_REVIEW", "提示文字无效", 422)
    if (value.options !== undefined && (!Array.isArray(value.options) || value.options.length < 1 || value.options.length > 100 || value.options.some((option) => typeof option !== "string" || !option.trim() || option.length > 500))) throw new OADocumentReviewError("INVALID_REVIEW", "options 无效", 422)
    if ((inferredAnswerType === "single_choice" || inferredAnswerType === "multiple_choice") && !value.options) throw new OADocumentReviewError("INVALID_REVIEW", "选项字段缺少 options", 422)
    return {
      suggestionId,
      reviewState: value.reviewState as OADocumentSuggestionReviewState,
      label,
      inferredAnswerType,
      ...(value.required !== undefined ? { required: value.required as boolean } : {}),
      ...(value.maxLength !== undefined ? { maxLength: value.maxLength as number } : {}),
      ...(value.placeholder !== undefined ? { placeholder: placeholderValue(value.placeholder) } : {}),
      ...(value.options !== undefined ? { options: (value.options as string[]).map((option) => option.trim()) } : {}),
      ...(value.visual !== undefined ? { visual: parseVisual(value.visual) } : {}),
      ...(value.bindingCandidateId !== undefined ? { bindingCandidateId: stringValue(value.bindingCandidateId, "候选 ID", 128) } : {}),
    }
  })
}

function positiveOverlap(left: OADocumentVisualAnchor, right: OADocumentVisualAnchor) {
  if (left.page !== right.page) return false
  return Math.min(left.x + left.width, right.x + right.width) > Math.max(left.x, right.x)
    && Math.min(left.y + left.height, right.y + right.height) > Math.max(left.y, right.y)
}

function assertPageGeometry(visual: OADocumentVisualAnchor, layout: OAPreviewLayout) {
  const page = layout.pages[visual.page - 1]
  if (!page || visual.pageWidth !== page.width || visual.pageHeight !== page.height || visual.rotation !== page.rotation) {
    throw new OADocumentReviewError("INVALID_REVIEW", "可视锚点页面几何与预览不一致", 422)
  }
}

function outputFor(candidate: OADocumentBindingCandidate) {
  if (candidate.writeTarget === "choice") return { mode: "mark_choice" as const }
  if (candidate.writeTarget === "repeat-row") return { mode: "repeat_row" as const, preservePrototype: true }
  if (candidate.writeTarget === "paragraph-after") return { mode: "append" as const, multiline: true }
  return { mode: "replace" as const }
}

function kindFor(candidate?: OADocumentBindingCandidate): OADocumentRegionKind {
  if (!candidate) return "label_blank"
  if (candidate.writeTarget === "table-cell") return "table_cell"
  if (candidate.writeTarget === "choice") return "checkbox_group"
  if (candidate.writeTarget === "repeat-row") return "repeat_row"
  return "label_blank"
}

function createDrawnSuggestion(edit: ReviewEdit, candidate?: OADocumentBindingCandidate): OADocumentSuggestion {
  const locator = candidate
    ? { partName: candidate.partName, path: candidate.path, contextHash: candidate.contextHash }
    : { partName: "", path: "", contextHash: "" }
  return {
    id: edit.suggestionId,
    kind: kindFor(candidate),
    label: edit.label,
    inferredAnswerType: edit.inferredAnswerType,
    confidence: "medium",
    reviewState: "unresolved",
    evidence: ["用户框选新增"],
    conflictIds: [],
    ...locator,
  }
}

function canonicalBinding(suggestion: OADocumentSuggestion, layout: OAPreviewLayout) {
  const candidateId = suggestion.bindingCandidateIds?.length === 1 ? suggestion.bindingCandidateIds[0] : undefined
  const candidate = candidateId ? layout.candidates.find((item) => item.id === candidateId) : undefined
  if (!candidate || !suggestion.visual || !positiveOverlap(suggestion.visual, candidate.visual)) {
    throw new OADocumentReviewError("BINDING_REQUIRED", `已确认字段“${suggestion.label}”必须绑定到一个同页重叠的 Word 写入位置`, 409)
  }
  assertPageGeometry(suggestion.visual, layout)
  return candidate
}

export function buildReviewedManifest(stored: OADocumentTemplateManifest, layout: OAPreviewLayout, edits: ReviewEdit[]): OADocumentTemplateManifest {
  if (stored.syntaxVersion !== 2) throw new OADocumentReviewError("REANALYSIS_REQUIRED", "当前模板需要重新分析后才能审核", 409)
  const editById = new Map(edits.map((edit) => [edit.suggestionId, edit]))
  const candidates = new Map(layout.candidates.map((candidate) => [candidate.id, candidate]))
  const storedIds = new Set(stored.suggestions.map((suggestion) => suggestion.id))
  const drawn = edits
    .filter((edit) => !storedIds.has(edit.suggestionId))
    .map((edit) => {
      if (!/^drawn_[A-Za-z0-9_-]+$/.test(edit.suggestionId)) {
        throw new OADocumentReviewError("INVALID_REVIEW", `建议不存在：${edit.suggestionId}`, 422)
      }
      return createDrawnSuggestion(edit, edit.bindingCandidateId ? candidates.get(edit.bindingCandidateId) : undefined)
    })
  const suggestions = [...stored.suggestions, ...drawn].map((suggestion) => {
    const edit = editById.get(suggestion.id)
    if (!edit) return { ...suggestion }
    let visual = edit.visual
    let bindingCandidateIds = edit.bindingCandidateId ? [edit.bindingCandidateId] : []
    let locator = { partName: suggestion.partName, path: suggestion.path, contextHash: suggestion.contextHash }
    if (edit.reviewState === "confirmed") {
      const candidate = edit.bindingCandidateId ? candidates.get(edit.bindingCandidateId) : undefined
      if (!candidate || !visual || !positiveOverlap(visual, candidate.visual)) {
        throw new OADocumentReviewError("BINDING_REQUIRED", `已确认字段“${edit.label}”必须绑定到一个同页重叠的 Word 写入位置`, 409)
      }
      assertPageGeometry(visual, layout)
      locator = { partName: candidate.partName, path: candidate.path, contextHash: candidate.contextHash }
    } else {
      if (visual) assertPageGeometry(visual, layout)
      if (edit.bindingCandidateId && !candidates.has(edit.bindingCandidateId)) throw new OADocumentReviewError("INVALID_REVIEW", "绑定候选不存在", 422)
    }
    const fieldId = suggestion.fieldId || createStableDocumentFieldId(edit.label, `${locator.partName}|${locator.path}|${suggestion.kind}`)
    return {
      ...suggestion,
      ...locator,
      label: edit.label,
      inferredAnswerType: edit.inferredAnswerType,
      reviewState: edit.reviewState,
      fieldId,
      conflictIds: edit.reviewState === "conflict" ? suggestion.conflictIds : [],
      ...(edit.required !== undefined ? { required: edit.required } : { required: undefined }),
      ...(edit.maxLength !== undefined ? { maxLength: edit.maxLength } : { maxLength: undefined }),
      ...(edit.placeholder ? { placeholder: edit.placeholder } : { placeholder: undefined }),
      ...(edit.options !== undefined ? { options: edit.options } : { options: undefined }),
      ...(visual ? { visual } : { visual: undefined }),
      ...(bindingCandidateIds.length ? { bindingCandidateIds } : { bindingCandidateIds: undefined }),
    } satisfies OADocumentSuggestion
  })
  const fields: OADocumentManifestField[] = []
  const anchors: OADocumentAnchor[] = []
  for (const suggestion of suggestions) {
    if (suggestion.reviewState !== "confirmed") continue
    const candidate = canonicalBinding(suggestion, layout)
    const fieldId = suggestion.fieldId!
    fields.push({
      fieldId,
      label: suggestion.label,
      answerType: suggestion.inferredAnswerType,
      required: suggestion.required === true,
      ...(suggestion.maxLength !== undefined ? { maxLength: suggestion.maxLength } : {}),
      ...(suggestion.placeholder ? { placeholder: suggestion.placeholder } : {}),
      ...(suggestion.options?.length ? { options: suggestion.options } : {}),
    })
    const structural = {
      partName: candidate.partName,
      path: candidate.path,
      contextHash: candidate.contextHash,
      writeTarget: candidate.writeTarget,
      ...(candidate.styleSourcePath ? { styleSourcePath: candidate.styleSourcePath } : {}),
    }
    anchors.push({
      fieldId,
      kind: suggestion.kind,
      partName: candidate.partName,
      path: candidate.path,
      contextHash: candidate.contextHash,
      output: outputFor(candidate),
      visual: suggestion.visual,
      bindingCandidateId: candidate.id,
      structural,
    })
  }
  return { ...stored, syntaxVersion: 2, suggestions, fields, anchors }
}
