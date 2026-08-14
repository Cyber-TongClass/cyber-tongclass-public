import type { OAFormField } from "@/types"

import {
  anchorNaturalKey,
  countTemplateReviewStates,
  createStableDocumentFieldId,
  validateTemplateManifest,
  type OADocumentAnchor,
  type OADocumentAnswerType,
  type OADocumentManifestField,
  type OADocumentOutputMode,
  type OADocumentSuggestion,
  type OADocumentTemplateManifest,
} from "@/lib/oa-document-templates"

function outputMode(suggestion: OADocumentSuggestion): OADocumentOutputMode {
  if (suggestion.kind === "repeat_row") return "repeat_row"
  if (suggestion.inferredAnswerType === "single_choice" || suggestion.inferredAnswerType === "multiple_choice") {
    return "mark_choice"
  }
  return "replace"
}

function manifestField(suggestion: OADocumentSuggestion, fieldId: string): OADocumentManifestField {
  return {
    fieldId,
    label: suggestion.label.trim(),
    answerType: suggestion.inferredAnswerType,
    required: Boolean(suggestion.required),
    ...(suggestion.maxLength ? { maxLength: suggestion.maxLength } : {}),
    ...(suggestion.placeholder ? { placeholder: suggestion.placeholder.trim() } : {}),
    ...(suggestion.options?.length ? { options: suggestion.options.map((option) => option.trim()).filter(Boolean) } : {}),
    ...(suggestion.columns?.length ? { columns: suggestion.columns } : {}),
  }
}

function manifestAnchor(suggestion: OADocumentSuggestion, fieldId: string): OADocumentAnchor {
  const mode = outputMode(suggestion)
  return {
    fieldId,
    kind: suggestion.kind,
    partName: suggestion.partName,
    path: suggestion.path,
    contextHash: suggestion.contextHash,
    output: {
      mode,
      multiline: suggestion.inferredAnswerType === "textarea",
      ...(mode === "repeat_row" ? { preservePrototype: true } : {}),
    },
  }
}

export function hasBlockingDocumentReview(
  manifest: Pick<OADocumentTemplateManifest, "suggestions"> & Partial<Pick<OADocumentTemplateManifest, "syntaxVersion" | "fields" | "anchors">>,
) {
  const counts = countTemplateReviewStates(manifest.suggestions)
  if (counts.unresolved > 0 || counts.conflicts > 0) return true
  if ((manifest.syntaxVersion ?? 1) < 2) return false
  if (!manifest.fields || !manifest.anchors) return true
  const versionTwo = manifest as OADocumentTemplateManifest
  const fieldIds = new Set(versionTwo.fields.map((field) => field.fieldId))
  const anchors = new Map(versionTwo.anchors.map((anchor) => [anchor.fieldId, anchor]))
  return versionTwo.suggestions.some((suggestion) => {
    if (suggestion.reviewState !== "confirmed" || !suggestion.fieldId || !fieldIds.has(suggestion.fieldId)) return suggestion.reviewState === "confirmed"
    const anchor = anchors.get(suggestion.fieldId)
    return !anchor?.visual || !anchor.bindingCandidateId || !anchor.structural
      || !suggestion.bindingCandidateIds?.includes(anchor.bindingCandidateId)
  })
}

/**
 * Turns the administrator's annotation decisions into the canonical compile
 * manifest. Detection suggestions remain as an audit trail; only confirmed
 * suggestions become OA fields and Word anchors.
 */
export function buildReviewedDocumentManifest(manifest: OADocumentTemplateManifest): OADocumentTemplateManifest {
  if (hasBlockingDocumentReview(manifest)) {
    throw new Error(manifest.syntaxVersion >= 2
      ? "仍有待确认对象、冲突或缺少完整双锚点绑定，暂不能编译并启用模板"
      : "仍有待确认对象或冲突，暂不能编译并启用模板")
  }

  // Version two manifests are canonical server review results. The browser
  // must not reconstruct structural OOXML locators from editable client data.
  if (manifest.syntaxVersion >= 2) return validateTemplateManifest(manifest)

  const fields = new Map<string, OADocumentManifestField>()
  const anchors = new Map<string, OADocumentAnchor>()
  const suggestions = manifest.suggestions.map((suggestion) => {
    if (suggestion.reviewState !== "confirmed") return suggestion
    const fieldId = suggestion.fieldId || createStableDocumentFieldId(suggestion.label, suggestion.path)
    if (!fields.has(fieldId)) fields.set(fieldId, manifestField(suggestion, fieldId))
    const anchor = manifestAnchor(suggestion, fieldId)
    anchors.set(anchorNaturalKey(anchor), anchor)
    return { ...suggestion, fieldId }
  })

  return validateTemplateManifest({
    ...manifest,
    suggestions,
    fields: [...fields.values()],
    anchors: [...anchors.values()],
  })
}

function oaFieldType(answerType: OADocumentAnswerType): OAFormField["type"] {
  if (answerType === "textarea") return "textarea"
  if (answerType === "number") return "number"
  if (answerType === "date") return "date"
  if (answerType === "single_choice") return "radio"
  if (answerType === "multiple_choice") return "checkbox"
  if (answerType === "file") return "file"
  if (answerType === "table") return "table"
  return "text"
}

export function documentManifestToOAFormFields(manifest: OADocumentTemplateManifest): OAFormField[] {
  const anchorByField = new Map<string, OADocumentAnchor>()
  for (const anchor of manifest.anchors) if (!anchorByField.has(anchor.fieldId)) anchorByField.set(anchor.fieldId, anchor)
  return manifest.fields.map((field) => {
    const anchor = anchorByField.get(field.fieldId)
    return {
      id: field.fieldId,
      type: oaFieldType(field.answerType),
      label: field.label,
      required: field.required,
      ...(field.maxLength ? { maxLength: field.maxLength } : {}),
      ...(field.placeholder ? { placeholder: field.placeholder } : {}),
      ...(field.options?.length
        ? { options: field.options.map((option) => ({ label: option, value: option })) }
        : {}),
      ...(field.columns?.length ? { columns: field.columns } : {}),
      ...(anchor ? { documentOutput: { ...anchor.output } } : {}),
      ...(field.answerType === "file" ? { maxFiles: 1, maxFileSizeMB: 20 } : {}),
    }
  })
}

/** Existing non-Word fields keep their position; matched bindings are refreshed and new fields append. */
export function mergeDocumentManifestFields(existing: OAFormField[], manifest: OADocumentTemplateManifest) {
  const imported = documentManifestToOAFormFields(manifest)
  const importedById = new Map(imported.map((field) => [field.id, field]))
  const merged = existing.map((field) => {
    const binding = importedById.get(field.id)
    if (!binding) return field
    importedById.delete(field.id)
    return { ...field, ...binding }
  })
  return [...merged, ...importedById.values()]
}
