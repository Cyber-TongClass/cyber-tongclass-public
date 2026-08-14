import type { OADocumentSuggestion, OADocumentVisualAnchor } from "@/lib/oa-document-templates"

export type OADocumentBindingCandidate = {
  id: string
  label: string
  visual: OADocumentVisualAnchor
}

type BindingSuggestion = Pick<OADocumentSuggestion, "id" | "label" | "bindingCandidateIds" | "visual" | "reviewState">

function positiveOverlap(left: OADocumentVisualAnchor, right: OADocumentVisualAnchor) {
  return left.page === right.page
    && Math.min(left.x + left.width, right.x + right.width) > Math.max(left.x, right.x)
    && Math.min(left.y + left.height, right.y + right.height) > Math.max(left.y, right.y)
}

export function normalizeDocumentBindingLabel(value: string) {
  return value.normalize("NFKC").replace(/[\s·：:（）()、，,。._-]+/g, "").toLocaleLowerCase("zh-CN")
}

function acceptUniqueClaims(
  proposals: Map<string, string[]>,
  resolved: Record<string, string>,
  reservedCandidateIds: Set<string>,
) {
  const claimCounts = new Map<string, number>()
  for (const candidateIds of proposals.values()) {
    for (const candidateId of candidateIds) claimCounts.set(candidateId, (claimCounts.get(candidateId) || 0) + 1)
  }
  for (const [suggestionId, candidateIds] of proposals) {
    if (candidateIds.length !== 1) continue
    const candidateId = candidateIds[0]
    if (claimCounts.get(candidateId) === 1 && !reservedCandidateIds.has(candidateId)) {
      resolved[suggestionId] = candidateId
    }
  }
  for (const candidateIds of proposals.values()) {
    for (const candidateId of candidateIds) reservedCandidateIds.add(candidateId)
  }
}

/**
 * Reconciles browser-visible suggestions with server-issued write candidates.
 * Each stage is one-to-one and fail-closed: explicit IDs, then geometry, then a
 * unique normalized label. Lower-priority heuristics cannot steal a candidate
 * already claimed or contested by a stronger signal.
 */
export function resolveDocumentCandidateBindings(
  suggestions: BindingSuggestion[],
  candidates: OADocumentBindingCandidate[],
) {
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]))
  const reviewableSuggestions = suggestions.filter((suggestion) => suggestion.reviewState !== "ignored" && suggestion.reviewState !== "deleted")
  const resolved: Record<string, string> = {}
  const reservedCandidateIds = new Set<string>()
  const handledSuggestionIds = new Set<string>()

  const explicit = new Map<string, string[]>()
  for (const suggestion of reviewableSuggestions) {
    if (!suggestion.bindingCandidateIds?.length) continue
    handledSuggestionIds.add(suggestion.id)
    explicit.set(suggestion.id, [...new Set(suggestion.bindingCandidateIds.filter((id) => candidateById.has(id)))])
  }
  acceptUniqueClaims(explicit, resolved, reservedCandidateIds)

  const overlapping = new Map<string, string[]>()
  for (const suggestion of reviewableSuggestions) {
    if (handledSuggestionIds.has(suggestion.id) || !suggestion.visual) continue
    const matches = candidates
      .filter((candidate) => !reservedCandidateIds.has(candidate.id) && positiveOverlap(suggestion.visual!, candidate.visual))
      .map((candidate) => candidate.id)
    if (!matches.length) continue
    handledSuggestionIds.add(suggestion.id)
    overlapping.set(suggestion.id, matches)
  }
  acceptUniqueClaims(overlapping, resolved, reservedCandidateIds)

  const labels = new Map<string, string[]>()
  for (const suggestion of reviewableSuggestions) {
    if (handledSuggestionIds.has(suggestion.id)) continue
    const normalizedLabel = normalizeDocumentBindingLabel(suggestion.label)
    const matches = candidates
      .filter((candidate) => !reservedCandidateIds.has(candidate.id) && normalizeDocumentBindingLabel(candidate.label) === normalizedLabel)
      .map((candidate) => candidate.id)
    if (matches.length) labels.set(suggestion.id, matches)
  }
  acceptUniqueClaims(labels, resolved, reservedCandidateIds)

  return resolved
}
