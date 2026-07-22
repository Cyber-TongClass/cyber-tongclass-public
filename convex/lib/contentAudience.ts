const AUTHOR_META_PATTERN = /^(.*?)\s*\[tc-author:([^\]]+)\]\s*$/

export type PublicContentAudience = "undergrad" | "graduate"

type PublicationUserLinkSources = {
  authors: readonly string[]
  structuredAccountUserIds: readonly string[]
  ownerUserId?: string
}

type PublicationAudienceSources = PublicationUserLinkSources & {
  resolveIdentityType: (userId: string) => Promise<string | undefined>
}

function encodedAuthorUserId(value: string): string | undefined {
  const match = value.match(AUTHOR_META_PATTERN)
  if (!match) return undefined

  try {
    const decoded = JSON.parse(decodeURIComponent(match[2])) as unknown
    if (decoded === null || typeof decoded !== "object" || Array.isArray(decoded)) {
      return undefined
    }
    const userId = (decoded as { userId?: unknown }).userId
    if (typeof userId !== "string" || userId.trim().length === 0) return undefined
    return userId.trim()
  } catch {
    return undefined
  }
}

export function publicationAuthorDisplayName(value: string): string {
  const match = value.match(AUTHOR_META_PATTERN)
  return (match?.[1] ?? value).trim()
}

function addNonEmptyUserId(result: string[], seen: Set<string>, value?: string): void {
  if (typeof value !== "string") return
  const normalized = value.trim()
  if (!normalized || seen.has(normalized)) return
  seen.add(normalized)
  result.push(normalized)
}

export function collectPublicationUserIds(
  sources: PublicationUserLinkSources,
): string[] {
  const result: string[] = []
  const seen = new Set<string>()

  for (const author of sources.authors) {
    addNonEmptyUserId(result, seen, encodedAuthorUserId(author))
  }
  for (const accountUserId of sources.structuredAccountUserIds) {
    addNonEmptyUserId(result, seen, accountUserId)
  }
  if (result.length === 0) {
    addNonEmptyUserId(result, seen, sources.ownerUserId)
  }

  return result
}

export function toPublicAudiences(values: readonly string[]): PublicContentAudience[] {
  const result = new Set<PublicContentAudience>()
  for (const value of values) {
    if (value === "undergrad" || value === "graduate") result.add(value)
  }
  return (["undergrad", "graduate"] as const).filter((value) => result.has(value))
}

async function resolveIdentityTypes(
  userIds: readonly string[],
  resolveIdentityType: PublicationAudienceSources["resolveIdentityType"],
): Promise<string[]> {
  const values = await Promise.all(userIds.map(async (userId) => {
    try {
      return await resolveIdentityType(userId)
    } catch {
      return undefined
    }
  }))
  return values.flatMap((value) => value === undefined ? [] : [value])
}

export async function resolvePublicationAudiences(
  sources: PublicationAudienceSources,
): Promise<PublicContentAudience[]> {
  const explicitUserIds = collectPublicationUserIds({
    authors: sources.authors,
    structuredAccountUserIds: sources.structuredAccountUserIds,
  })
  const explicitIdentities = await resolveIdentityTypes(
    explicitUserIds,
    sources.resolveIdentityType,
  )
  if (explicitIdentities.length > 0) return toPublicAudiences(explicitIdentities)

  const ownerUserIds = collectPublicationUserIds({
    authors: [],
    structuredAccountUserIds: [],
    ownerUserId: sources.ownerUserId,
  })
  return toPublicAudiences(await resolveIdentityTypes(ownerUserIds, sources.resolveIdentityType))
}
