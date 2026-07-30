export type OrderedResearchGroupMember = {
  sortOrder?: number
}

export type CompactResearchGroupMemberOrder<UserId extends string = string> = {
  userId: UserId
  sortOrder: number
}

export type ResearchGroupPublicationRelationSource =
  | "automatic"
  | "explicit"
  | "automatic-and-explicit"

export type ResearchGroupPublicationRelation<PublicationId extends string = string> = {
  publicationId: PublicationId
  relationSource: ResearchGroupPublicationRelationSource
}

/**
 * Sorts persisted member assignments without inventing an order for legacy
 * assignments. Explicitly ordered assignments come first; legacy assignments
 * preserve their database/input order.
 */
export function sortResearchGroupMembers<Member extends OrderedResearchGroupMember>(
  members: readonly Member[],
): Member[] {
  return members
    .map((member, inputIndex) => ({ member, inputIndex }))
    .sort((left, right) => {
      const leftHasOrder = Number.isFinite(left.member.sortOrder)
      const rightHasOrder = Number.isFinite(right.member.sortOrder)

      if (leftHasOrder && rightHasOrder) {
        const orderDifference = left.member.sortOrder! - right.member.sortOrder!
        return orderDifference || left.inputIndex - right.inputIndex
      }
      if (leftHasOrder) return -1
      if (rightHasOrder) return 1
      return left.inputIndex - right.inputIndex
    })
    .map(({ member }) => member)
}

/** Produces compact, human-readable order values with room between entries. */
export function compactResearchGroupMemberOrder<UserId extends string>(
  orderedUserIds: readonly UserId[],
): CompactResearchGroupMemberOrder<UserId>[] {
  return orderedUserIds.map((userId, index) => ({
    userId,
    sortOrder: (index + 1) * 10,
  }))
}

/**
 * Creates the only account identifier set used for automatic publication
 * relation. Empty identifiers are ignored and insertion order is stable.
 */
export function createResearchGroupAccountSet<UserId extends string>({
  leaderAccountUserId,
  memberAccountUserIds,
}: {
  leaderAccountUserId?: UserId
  memberAccountUserIds: readonly (UserId | undefined | null)[]
}): Set<UserId> {
  const accountUserIds = new Set<UserId>()
  if (leaderAccountUserId) accountUserIds.add(leaderAccountUserId)

  for (const accountUserId of memberAccountUserIds) {
    if (accountUserId) accountUserIds.add(accountUserId)
  }

  return accountUserIds
}

/**
 * Resolves automatic relation only from structured account identifiers.
 * Deliberately does not accept or inspect display names.
 */
export function hasStructuredResearchGroupRelation<UserId extends string>({
  groupAccountUserIds,
  authorAccountUserIds = [],
  ownerAccountUserId,
}: {
  groupAccountUserIds: ReadonlySet<UserId>
  authorAccountUserIds?: readonly (UserId | undefined | null)[]
  ownerAccountUserId?: UserId
}): boolean {
  let hasStructuredAuthor = false
  for (const authorAccountUserId of authorAccountUserIds) {
    if (!authorAccountUserId) continue
    hasStructuredAuthor = true
    if (groupAccountUserIds.has(authorAccountUserId)) {
      return true
    }
  }

  if (hasStructuredAuthor) return false
  return Boolean(ownerAccountUserId && groupAccountUserIds.has(ownerAccountUserId))
}

/**
 * Unions automatic and explicit candidates, preserving first-seen order.
 */
export function mergeResearchGroupPublicationSources<PublicationId extends string>({
  automaticPublicationIds,
  explicitPublicationIds,
}: {
  automaticPublicationIds: readonly PublicationId[]
  explicitPublicationIds: readonly PublicationId[]
}): ResearchGroupPublicationRelation<PublicationId>[] {
  const automatic = new Set(automaticPublicationIds)
  const explicit = new Set(explicitPublicationIds)
  const orderedIds = new Set<PublicationId>([
    ...automaticPublicationIds,
    ...explicitPublicationIds,
  ])

  return [...orderedIds].map((publicationId) => ({
    publicationId,
    relationSource: automatic.has(publicationId)
      ? explicit.has(publicationId)
        ? "automatic-and-explicit"
        : "automatic"
      : "explicit",
  }))
}

/**
 * A group can hide a globally visible candidate, but cannot expose content
 * that is globally hidden.
 */
export function researchGroupPublicationIsVisible({
  contentVisible,
  visibilityOverride,
}: {
  contentVisible: boolean
  visibilityOverride?: boolean
}): boolean {
  return contentVisible && visibilityOverride !== false
}
