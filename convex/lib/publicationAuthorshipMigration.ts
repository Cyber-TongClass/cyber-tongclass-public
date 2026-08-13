export type LegacyPublication = { _id: string; authors: string[] }
export type LegacyPersonBinding = { _id: string; kind: string }
export type ExistingLegacyAuthorship = {
  _id: string
  naturalKey: string
  role: string
  authorOrder: number
  isPrimary?: boolean
}

export type MigrationDecision =
  | { kind: "insert"; value: Record<string, unknown> }
  | { kind: "patch"; id: string; value: Record<string, unknown> }
  | { kind: "unchanged"; naturalKey: string }
  | { kind: "skipped"; authorOrder: number; reason: "external_or_unlinked" | "malformed_metadata" }
  | { kind: "conflict"; authorOrder: number; reason: "missing_binding" | "multiple_bindings" | "not_teacher" }

const marker = /\s*\[tc-author:([^\]]*)\]\s*$/i

export function parseLegacyPublicationAccount(snapshot: string) {
  const match = String(snapshot || "").match(marker)
  if (!match) return { kind: "external" as const }
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]))
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { kind: "malformed" as const }
    if (parsed.isTongClass !== true || typeof parsed.userId !== "string" || !parsed.userId.trim()) {
      return { kind: "external" as const }
    }
    return { kind: "account" as const, userId: parsed.userId.trim(), corresponding: parsed.corresponding === true }
  } catch {
    return { kind: "malformed" as const }
  }
}

export function classifyLegacyPublicationAuthors(
  publication: LegacyPublication,
  peopleByAccountId: ReadonlyMap<string, readonly LegacyPersonBinding[]>,
  existingByNaturalKey: ReadonlyMap<string, ExistingLegacyAuthorship>,
  now: number,
): MigrationDecision[] {
  return publication.authors.map((snapshot, authorOrder): MigrationDecision => {
    const metadata = parseLegacyPublicationAccount(snapshot)
    if (metadata.kind === "external") return { kind: "skipped", authorOrder, reason: "external_or_unlinked" }
    if (metadata.kind === "malformed") return { kind: "skipped", authorOrder, reason: "malformed_metadata" }
    const bindings = peopleByAccountId.get(metadata.userId) || []
    if (bindings.length === 0) return { kind: "conflict", authorOrder, reason: "missing_binding" }
    if (bindings.length > 1) return { kind: "conflict", authorOrder, reason: "multiple_bindings" }
    const person = bindings[0]
    if (person.kind !== "teacher") return { kind: "conflict", authorOrder, reason: "not_teacher" }
    const naturalKey = `${publication._id}:${person._id}`
    const desired = {
      role: metadata.corresponding ? "corresponding_author" : "author",
      authorOrder,
      isPrimary: authorOrder === 0,
      updatedAt: now,
    }
    const existing = existingByNaturalKey.get(naturalKey)
    if (!existing) {
      return {
        kind: "insert",
        value: {
          naturalKey,
          publicationId: publication._id,
          personId: person._id,
          ...desired,
          createdAt: now,
        },
      }
    }
    if (existing.role === desired.role && existing.authorOrder === desired.authorOrder && Boolean(existing.isPrimary) === desired.isPrimary) {
      return { kind: "unchanged", naturalKey }
    }
    return { kind: "patch", id: existing._id, value: desired }
  })
}
