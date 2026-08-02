import {
  publicationAuthorDisplayName,
} from "./contentAudience"

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

export type ResearchGroupProfileInput = {
  nameZh: string
  nameEn: string
  summaryZh?: string
  summaryEn?: string
  descriptionZh?: string
  descriptionEn?: string
  researchAreas: readonly string[]
  recruitmentZh?: string
  recruitmentEn?: string
  publicLinks: readonly { label: string; href: string }[]
  visibility: "public" | "hidden"
}

export type NormalizedResearchGroupProfile = {
  nameZh: string
  nameEn: string
  summaryZh?: string
  summaryEn?: string
  descriptionZh?: string
  descriptionEn?: string
  researchAreas: string[]
  recruitmentZh?: string
  recruitmentEn?: string
  publicLinks: { label: string; href: string }[]
  visibility: "public" | "hidden"
}

export function teacherResearchGroupNameZh(teacherName: string): string {
  const normalized = teacherName.trim().replace(/老师$/u, "")
  return `${normalized}老师的课题组`
}

export function assertResearchGroupMemberTransferAllowed({
  actorRole,
  destinationGroupId,
  existingGroupId,
}: {
  actorRole: string
  destinationGroupId: string
  existingGroupId?: string
}): void {
  if (
    existingGroupId !== undefined
    && existingGroupId !== destinationGroupId
    && actorRole !== "super_admin"
  ) {
    throw new Error("RESEARCH_GROUP_MEMBER_ALREADY_ASSIGNED")
  }
}

function optionalTrimmed(value?: string): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

export function normalizeResearchGroupProfile(
  input: ResearchGroupProfileInput,
): NormalizedResearchGroupProfile {
  const nameZh = input.nameZh.trim()
  const nameEn = input.nameEn.trim()
  if (!nameZh || !nameEn) throw new Error("RESEARCH_GROUP_NAME_REQUIRED")

  const researchAreas = [...new Set(input.researchAreas.map((value) => value.trim()).filter(Boolean))]
  const publicLinks: { label: string; href: string }[] = []
  const seenLinks = new Set<string>()
  for (const link of input.publicLinks) {
    const label = link.label.trim()
    const href = link.href.trim()
    let url: URL
    try {
      url = new URL(href)
    } catch {
      throw new Error("RESEARCH_GROUP_PUBLIC_LINK_INVALID")
    }
    if (!label || (url.protocol !== "http:" && url.protocol !== "https:")) {
      throw new Error("RESEARCH_GROUP_PUBLIC_LINK_INVALID")
    }
    if (seenLinks.has(href)) continue
    seenLinks.add(href)
    publicLinks.push({ label, href })
  }

  return {
    nameZh,
    nameEn,
    summaryZh: optionalTrimmed(input.summaryZh),
    summaryEn: optionalTrimmed(input.summaryEn),
    descriptionZh: optionalTrimmed(input.descriptionZh),
    descriptionEn: optionalTrimmed(input.descriptionEn),
    researchAreas,
    recruitmentZh: optionalTrimmed(input.recruitmentZh),
    recruitmentEn: optionalTrimmed(input.recruitmentEn),
    publicLinks,
    visibility: input.visibility,
  }
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

export type ResolvedResearchGroupPublication = {
  publication: {
    _id: string
    title: string
    authors: string[]
    venue: string
    year: number
    visibility?: "public" | "hidden"
    userId: string
  }
  publicationId: string
  displayAuthors: string[]
  relationSource: ResearchGroupPublicationRelationSource
  visibilityOverride?: boolean
  effectiveVisibility: boolean
}

/**
 * Resolves a group's publication list from structured account identifiers.
 * Display names never participate. Explicit legacy mentions are unioned with
 * automatic authorship, and per-group hiding is applied in one shared place.
 */
export async function resolveResearchGroupPublicationCandidates(
  ctx: any,
  researchGroupId: string,
): Promise<ResolvedResearchGroupPublication[]> {
  const group = await ctx.db.get(researchGroupId)
  if (!group) return []

  const [leader, assignments, publications, mentions, overrides] = await Promise.all([
    ctx.db.get(group.leaderPersonId),
    ctx.db
      .query("studentResearchGroupAssignments")
      .withIndex("by_researchGroupId", (index: any) => index.eq("researchGroupId", researchGroupId))
      .collect(),
    ctx.db.query("publications").collect(),
    ctx.db
      .query("contentMentions")
      .withIndex("by_target", (index: any) => (
        index.eq("targetType", "researchGroup").eq("targetId", researchGroupId)
      ))
      .collect(),
    ctx.db
      .query("researchGroupPublicationVisibilityOverrides")
      .withIndex("by_group", (index: any) => index.eq("researchGroupId", researchGroupId))
      .collect(),
  ])
  const assignmentAccounts = await Promise.all(
    assignments.map((assignment: any) => ctx.db.get(assignment.studentUserId)),
  )
  const activeAssignments = assignments.filter(
    (_assignment: any, index: number) => (
      assignmentAccounts[index] && assignmentAccounts[index].accountStatus !== "disabled"
    ),
  )
  const leaderAccount = leader?.accountUserId === undefined
    ? undefined
    : await ctx.db.get(leader.accountUserId)

  const groupAccountUserIds = createResearchGroupAccountSet({
    leaderAccountUserId: leader?.accountUserId === undefined
      || !leaderAccount
      || leaderAccount.accountStatus === "disabled"
      ? undefined
      : String(leader.accountUserId),
    memberAccountUserIds: activeAssignments.map((assignment: any) => String(assignment.studentUserId)),
  })

  const automaticPublicationIds: string[] = []
  const publicationById = new Map<string, any>()
  for (const publication of publications as any[]) {
    if (publication.visibility === "hidden") continue
    const publicationId = String(publication._id)
    publicationById.set(publicationId, publication)
    const authorships = await ctx.db
      .query("publicationAuthorships")
      .withIndex("by_publication_order", (index: any) => index.eq("publicationId", publication._id))
      .collect()
    const authorPeople = await Promise.all(
      authorships.map((authorship: any) => ctx.db.get(authorship.personId)),
    )
    const structuredAccountUserIds = authorPeople.flatMap((person: any) => (
      person?.accountUserId === undefined ? [] : [String(person.accountUserId)]
    ))
    if (hasStructuredResearchGroupRelation({
      groupAccountUserIds,
      authorAccountUserIds: structuredAccountUserIds,
      ownerAccountUserId: String(publication.userId),
    })) {
      automaticPublicationIds.push(publicationId)
    }
  }

  const explicitPublicationIds = (mentions as any[])
    .filter((mention) => mention.contentType === "publication")
    .map((mention) => String(mention.contentId))
    .filter((publicationId) => publicationById.has(publicationId))
  const overrideByPublicationId = new Map(
    (overrides as any[]).map((override) => [String(override.publicationId), override.visible as boolean]),
  )

  return mergeResearchGroupPublicationSources({
    automaticPublicationIds,
    explicitPublicationIds,
  }).flatMap(({ publicationId, relationSource }) => {
    const publication = publicationById.get(publicationId)
    if (!publication) return []
    const visibilityOverride = overrideByPublicationId.get(publicationId)
    return [{
      publication,
      publicationId,
      displayAuthors: publication.authors.map((author: string) => publicationAuthorDisplayName(author)),
      relationSource,
      visibilityOverride,
      effectiveVisibility: researchGroupPublicationIsVisible({
        contentVisible: publication.visibility !== "hidden",
        visibilityOverride,
      }),
    }]
  })
}
