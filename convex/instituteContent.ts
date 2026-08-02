import { queryGeneric } from "convex/server"
import { v } from "convex/values"
import {
  publicationAuthorDisplayName,
  resolvePublicationAudiences,
  toPublicAudiences,
} from "./lib/contentAudience"
import type {
  InstituteContentRelationSources,
  InstituteNewsRecord,
  InstitutePersonRecord,
  InstitutePublicationRecord,
  ResearchGroupRecord,
} from "./lib/instituteDto"
import type {
  PublicContentAudience,
  PublicInstitutePersonReference,
  PublicInstituteResearch,
  PublicInstituteResearchGroupReference,
  PublicInstituteUpdate,
} from "../src/types/institute"
import { resolveUserIdentityType } from "./lib/userIdentity"
import { loadOAUserScopeContext, userMatchesOAUserScope } from "./lib/oaWorkflow"
import { getUserBySession } from "./reviewer/lib"
import { resolveResearchGroupPublicationCandidates } from "./lib/researchGroupPublications"

const DEFAULT_PUBLIC_LIMIT = 24
const MAX_PUBLIC_LIMIT = 500

/** Scoped news is members-only; the viewer must match the scope. */
async function loadUpdateViewer(ctx: any, sessionToken?: string) {
  if (!sessionToken) return { actor: null as any, scopeContext: undefined as any }
  try {
    const actor = await getUserBySession(ctx, sessionToken)
    const scopeContext = await loadOAUserScopeContext(ctx, actor._id)
    return { actor, scopeContext }
  } catch {
    return { actor: null as any, scopeContext: undefined as any }
  }
}

function canViewScopedNews(record: any, actor: any, scopeContext: any) {
  if (!record.targetScope) return true
  if (!actor || !scopeContext) return false
  return userMatchesOAUserScope(actor, record.targetScope, scopeContext.researchGroupId, scopeContext.userGroupIds)
}

const contentTypes = new Set(["publication", "news"])
const contentTargetTypes = new Set(["person", "researchGroup"])
const contentMentionRelations = new Set(["featured", "related", "contributor"])

export type InstituteContentType = "publication" | "news"
export type InstituteContentTargetType = "person" | "researchGroup"
export type InstituteContentMentionRelationType = "featured" | "related" | "contributor"

export type InstituteContentMentionRelation = {
  contentType: InstituteContentType
  contentId: string
  targetType: InstituteContentTargetType
  targetId: string
  relation: InstituteContentMentionRelationType
}

type StoredInstitutePerson = InstitutePersonRecord & {
  _id: string
  visibility: "public" | "hidden"
}

type StoredResearchGroup = ResearchGroupRecord & {
  _id: string
  visibility: "public" | "hidden"
}

type StoredPublication = InstitutePublicationRecord & {
  _id: string
  _creationTime: number
  siteScope?: "tong_class" | "institute"
  visibility?: "public" | "hidden"
  userId: string
}

type StoredNews = InstituteNewsRecord & {
  _id: string
  _creationTime: number
  siteScope?: "tong_class" | "institute"
  isPublished: boolean
  authorId: string
}

type StoredContentMention = InstituteContentMentionRelation & {
  sortOrder: number
}

type PublicationAuthorshipSource = {
  personId: string
}

type PublicationAuthorSources = {
  authorships: PublicationAuthorshipSource[]
  peopleById: Map<string, StoredInstitutePerson>
}

function toPublicInstitutePersonReference(
  person: InstitutePersonRecord,
): PublicInstitutePersonReference {
  const dto: PublicInstitutePersonReference = {
    slug: person.slug,
    kind: person.kind,
    nameZh: person.nameZh,
    nameEn: person.nameEn,
    isDemo: person.isDemo,
  }
  if (person.titleZh !== undefined) dto.titleZh = person.titleZh
  if (person.titleEn !== undefined) dto.titleEn = person.titleEn
  return dto
}

function toPublicInstituteResearchGroupReference(
  group: ResearchGroupRecord,
): PublicInstituteResearchGroupReference {
  return {
    slug: group.slug,
    nameZh: group.nameZh,
    nameEn: group.nameEn,
    isDemo: group.isDemo,
  }
}

function addPublicRelations(
  dto: PublicInstituteResearch | PublicInstituteUpdate,
  relations: InstituteContentRelationSources,
): void {
  dto.people = (relations.people ?? []).map((person) => toPublicInstitutePersonReference(person))
  dto.researchGroups = (relations.researchGroups ?? [])
    .map((group) => toPublicInstituteResearchGroupReference(group))
}

function toPublicInstituteResearch(
  record: InstitutePublicationRecord,
  content: { id: string; audiences: readonly PublicContentAudience[] },
  relations: InstituteContentRelationSources,
): PublicInstituteResearch {
  const dto: PublicInstituteResearch = {
    id: content.id,
    audiences: [...content.audiences],
    title: record.title,
    authors: record.authors.map((author) => publicationAuthorDisplayName(author)),
    venue: record.venue,
    year: record.year,
    abstract: record.abstract,
    category: record.category,
  }
  if (record.url !== undefined) dto.url = record.url
  if (record.doi !== undefined) dto.doi = record.doi
  if (record.subCategory !== undefined) dto.subCategory = record.subCategory
  addPublicRelations(dto, relations)
  return dto
}

function toPublicInstituteUpdate(
  news: InstituteNewsRecord,
  content: { id: string; audiences: readonly PublicContentAudience[] },
  relations: InstituteContentRelationSources,
): PublicInstituteUpdate {
  const dto: PublicInstituteUpdate = {
    id: content.id,
    audiences: [...content.audiences],
    title: news.title,
    content: news.content,
    category: news.category,
    publishedAt: news.publishedAt,
  }
  if (news.sourceUrl !== undefined) dto.sourceUrl = news.sourceUrl
  if (news.coverImageUrl !== undefined) dto.coverImageUrl = news.coverImageUrl
  if (news.homepageSubtitle !== undefined) dto.homepageSubtitle = news.homepageSubtitle
  addPublicRelations(dto, relations)
  return dto
}

function normalizePublicSlug(value: string): string {
  return value.trim().toLowerCase()
}

function normalizePublicLimit(value?: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PUBLIC_LIMIT
  const wholeNumber = Math.floor(value as number)
  return Math.max(1, Math.min(wholeNumber, MAX_PUBLIC_LIMIT))
}

function dedupeContentRecords<T extends { _id: string }>(records: readonly T[]): T[] {
  const unique = new Map<string, T>()
  for (const record of records) {
    const id = String(record._id)
    if (!unique.has(id)) unique.set(id, record)
  }
  return [...unique.values()]
}

async function readPublicationBucket(
  ctx: any,
  siteScope: StoredPublication["siteScope"],
  visibility: StoredPublication["visibility"],
  limit: number,
): Promise<StoredPublication[]> {
  return ctx.db
    .query("publications")
    .withIndex("by_siteScope_visibility_year", (index: any) => (
      index.eq("siteScope", siteScope).eq("visibility", visibility)
    ))
    .order("desc")
    .take(limit) as Promise<StoredPublication[]>
}

async function listPublicationCandidates(ctx: any, limit: number): Promise<StoredPublication[]> {
  const buckets = await Promise.all([
    readPublicationBucket(ctx, undefined, undefined, limit),
    readPublicationBucket(ctx, undefined, "public", limit),
    readPublicationBucket(ctx, "tong_class", undefined, limit),
    readPublicationBucket(ctx, "tong_class", "public", limit),
    readPublicationBucket(ctx, "institute", undefined, limit),
    readPublicationBucket(ctx, "institute", "public", limit),
  ])

  return dedupeContentRecords(buckets.flat())
    .filter((record) => record.visibility !== "hidden")
    .sort((left, right) => {
      if (left.year !== right.year) return right.year - left.year
      return right._creationTime - left._creationTime
    })
}

async function readNewsBucket(
  ctx: any,
  siteScope: StoredNews["siteScope"],
): Promise<StoredNews[]> {
  return ctx.db
    .query("news")
    .withIndex("by_siteScope_isPublished_publishedAt", (index: any) => (
      index.eq("siteScope", siteScope).eq("isPublished", true)
    ))
    .order("desc")
    .collect() as Promise<StoredNews[]>
}

async function listNewsCandidates(ctx: any, limit: number): Promise<StoredNews[]> {
  const buckets = await Promise.all([
    readNewsBucket(ctx, undefined),
    readNewsBucket(ctx, "tong_class"),
    readNewsBucket(ctx, "institute"),
  ])

  return dedupeContentRecords(buckets.flat())
    .filter((record) => record.isPublished === true)
    .sort((left, right) => {
      if (left.publishedAt !== right.publishedAt) return right.publishedAt - left.publishedAt
      return right._creationTime - left._creationTime
    })
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isContentType(value: unknown): value is InstituteContentType {
  return typeof value === "string" && contentTypes.has(value)
}

function isContentTargetType(value: unknown): value is InstituteContentTargetType {
  return typeof value === "string" && contentTargetTypes.has(value)
}

function isContentMentionRelationType(value: unknown): value is InstituteContentMentionRelationType {
  return typeof value === "string" && contentMentionRelations.has(value)
}

/**
 * Validate a persisted or proposed mention as an explicit polymorphic
 * relationship. It intentionally accepts no display names or inferred links.
 */
export function validateContentMentionRelation(
  value: Record<string, unknown>,
): InstituteContentMentionRelation {
  if (
    !isContentType(value.contentType)
    || !isNonEmptyString(value.contentId)
    || !isContentTargetType(value.targetType)
    || !isNonEmptyString(value.targetId)
    || !isContentMentionRelationType(value.relation)
  ) {
    throw new Error("INSTITUTE_CONTENT_MENTION_RELATION_INVALID")
  }

  return {
    contentType: value.contentType,
    contentId: value.contentId.trim(),
    targetType: value.targetType,
    targetId: value.targetId.trim(),
    relation: value.relation,
  }
}

export function contentMentionNaturalKey(
  contentType: InstituteContentType,
  contentId: string,
  targetType: InstituteContentTargetType,
  targetId: string,
  relation: InstituteContentMentionRelationType,
): string {
  const validated = validateContentMentionRelation({
    contentType,
    contentId,
    targetType,
    targetId,
    relation,
  })

  return [
    validated.contentType,
    validated.contentId,
    validated.targetType,
    validated.targetId,
    validated.relation,
  ].join(":")
}

export function normalizeDoi(value?: string): string | undefined {
  if (typeof value !== "string") return undefined

  const withoutPrefix = value
    .trim()
    .toLowerCase()
    .replace(/^(?:https?:\/\/)?(?:dx\.)?doi\.org\//, "")
    .replace(/^doi:\s*/, "")
    .trim()

  if (!/^10\.\d{4,9}\/\S+$/i.test(withoutPrefix)) return undefined
  return withoutPrefix
}

function contentKey(contentType: InstituteContentType, contentId: string): string {
  return `${contentType}:${contentId}`
}

function matchingContentIds(
  matchingKeys: ReadonlySet<string>,
  contentType: InstituteContentType,
): string[] {
  const prefix = `${contentType}:`
  return [...matchingKeys]
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length))
}

async function loadMatchingPublicationRecords(
  ctx: any,
  matchingKeys: ReadonlySet<string>,
): Promise<StoredPublication[]> {
  const records = await Promise.all(
    matchingContentIds(matchingKeys, "publication").map(async (contentId) => {
      try {
        const id = ctx.db.normalizeId("publications", contentId)
        return id === null ? null : await ctx.db.get(id)
      } catch {
        return null
      }
    }),
  )

  return dedupeContentRecords(
    records.flatMap((record) => record === null ? [] : [record as StoredPublication]),
  )
    .filter((record) => record.visibility !== "hidden")
    .sort((left, right) => {
      if (left.year !== right.year) return right.year - left.year
      return right._creationTime - left._creationTime
    })
}

async function loadMatchingNewsRecords(
  ctx: any,
  matchingKeys: ReadonlySet<string>,
): Promise<StoredNews[]> {
  const records = await Promise.all(
    matchingContentIds(matchingKeys, "news").map(async (contentId) => {
      try {
        const id = ctx.db.normalizeId("news", contentId)
        return id === null ? null : await ctx.db.get(id)
      } catch {
        return null
      }
    }),
  )

  return dedupeContentRecords(
    records.flatMap((record) => record === null ? [] : [record as StoredNews]),
  )
    .filter((record) => record.isPublished === true)
    .sort((left, right) => {
      if (left.publishedAt !== right.publishedAt) return right.publishedAt - left.publishedAt
      return right._creationTime - left._creationTime
    })
}

function intersectContentKeys(
  left: ReadonlySet<string> | undefined,
  right: ReadonlySet<string>,
): Set<string> {
  if (left === undefined) return new Set(right)
  const result = new Set<string>()
  for (const value of left) {
    if (right.has(value)) result.add(value)
  }
  return result
}

async function resolvePublicPersonId(ctx: any, slug: string): Promise<string | null> {
  const record = await ctx.db
    .query("institutePeople")
    .withIndex("by_slug", (index: any) => index.eq("slug", normalizePublicSlug(slug)))
    .first()
  if (!record || record.visibility !== "public") return null
  return String(record._id)
}

async function resolvePublicResearchGroupId(ctx: any, slug: string): Promise<string | null> {
  const record = await ctx.db
    .query("researchGroups")
    .withIndex("by_slug", (index: any) => index.eq("slug", normalizePublicSlug(slug)))
    .first()
  if (!record || record.visibility !== "public") return null
  return String(record._id)
}

async function contentKeysForPerson(ctx: any, personId: string): Promise<Set<string>> {
  const [authorships, mentions] = await Promise.all([
    ctx.db
      .query("publicationAuthorships")
      .withIndex("by_person_publication", (index: any) => index.eq("personId", personId))
      .collect(),
    ctx.db
      .query("contentMentions")
      .withIndex("by_target", (index: any) => index.eq("targetType", "person").eq("targetId", personId))
      .collect(),
  ])
  const keys = new Set<string>()
  for (const authorship of authorships) {
    keys.add(contentKey("publication", String(authorship.publicationId)))
  }
  for (const mention of mentions as StoredContentMention[]) {
    keys.add(contentKey(mention.contentType, String(mention.contentId)))
  }
  return keys
}

async function contentKeysForResearchGroup(ctx: any, researchGroupId: string): Promise<Set<string>> {
  const publicationCandidates = await resolveResearchGroupPublicationCandidates(ctx, researchGroupId)
  const mentions = await ctx.db
    .query("contentMentions")
    .withIndex("by_target", (index: any) => (
      index.eq("targetType", "researchGroup").eq("targetId", researchGroupId)
    ))
    .collect() as StoredContentMention[]
  const keys = new Set<string>()
  for (const candidate of publicationCandidates) {
    if (candidate.effectiveVisibility) {
      keys.add(contentKey("publication", candidate.publicationId))
    }
  }
  for (const mention of mentions) {
    if (mention.contentType === "publication") continue
    keys.add(contentKey(mention.contentType, String(mention.contentId)))
  }
  return keys
}

async function resolveContentFilter(
  ctx: any,
  filters: { personSlug?: string; researchGroupSlug?: string },
): Promise<Set<string> | undefined> {
  let keys: Set<string> | undefined

  if (filters.personSlug !== undefined) {
    const personId = await resolvePublicPersonId(ctx, filters.personSlug)
    if (personId === null) return new Set()
    keys = intersectContentKeys(keys, await contentKeysForPerson(ctx, personId))
  }
  if (filters.researchGroupSlug !== undefined) {
    const researchGroupId = await resolvePublicResearchGroupId(ctx, filters.researchGroupSlug)
    if (researchGroupId === null) return new Set()
    keys = intersectContentKeys(keys, await contentKeysForResearchGroup(ctx, researchGroupId))
  }

  return keys
}

async function getPublicPerson(ctx: any, personId: string): Promise<InstitutePersonRecord | undefined> {
  const record = await ctx.db.get(personId)
  if (!record || record.visibility !== "public") return undefined
  return record as StoredInstitutePerson
}

async function getPublicResearchGroup(
  ctx: any,
  researchGroupId: string,
): Promise<ResearchGroupRecord | undefined> {
  const record = await ctx.db.get(researchGroupId)
  if (!record || record.visibility !== "public") return undefined
  return record as StoredResearchGroup
}

async function getPublicContentRelations(
  ctx: any,
  contentType: InstituteContentType,
  contentId: string,
  publicationAuthorSources?: PublicationAuthorSources,
): Promise<InstituteContentRelationSources> {
  const mentions = await ctx.db
    .query("contentMentions")
    .withIndex("by_content", (index: any) => (
      index.eq("contentType", contentType).eq("contentId", contentId)
    ))
    .collect() as StoredContentMention[]
  const authorships = contentType === "publication"
    ? publicationAuthorSources?.authorships ?? []
    : []
  const people: InstitutePersonRecord[] = []
  const researchGroups: ResearchGroupRecord[] = []
  const seenPeople = new Set<string>()
  const seenResearchGroups = new Set<string>()

  for (const authorship of authorships) {
    const personId = String(authorship.personId)
    if (seenPeople.has(personId)) continue
    const person = publicationAuthorSources?.peopleById.get(personId)
    if (person?.visibility === "public") {
      people.push(person)
      seenPeople.add(personId)
    }
  }

  for (const mention of mentions) {
    if (mention.targetType === "person") {
      const personId = String(mention.targetId)
      if (seenPeople.has(personId)) continue
      const person = await getPublicPerson(ctx, personId)
      if (person !== undefined) {
        people.push(person)
        seenPeople.add(personId)
      }
      continue
    }

    if (contentType === "publication") continue
    const researchGroupId = String(mention.targetId)
    if (seenResearchGroups.has(researchGroupId)) continue
    const researchGroup = await getPublicResearchGroup(ctx, researchGroupId)
    if (researchGroup !== undefined) {
      researchGroups.push(researchGroup)
      seenResearchGroups.add(researchGroupId)
    }
  }

  if (contentType === "publication") {
    const publicGroups = await ctx.db
      .query("researchGroups")
      .withIndex("by_visibility_order", (index: any) => index.eq("visibility", "public"))
      .collect() as StoredResearchGroup[]
    for (const group of publicGroups) {
      const researchGroupId = String(group._id)
      if (seenResearchGroups.has(researchGroupId)) continue
      const candidates = await resolveResearchGroupPublicationCandidates(ctx, researchGroupId)
      if (candidates.some((candidate) => (
        candidate.publicationId === contentId && candidate.effectiveVisibility
      ))) {
        researchGroups.push(group)
        seenResearchGroups.add(researchGroupId)
      }
    }
  }

  return { people, researchGroups }
}

async function loadPublicationAuthorSources(
  ctx: any,
  publicationId: string,
): Promise<PublicationAuthorSources> {
  const authorships = await ctx.db
    .query("publicationAuthorships")
    .withIndex("by_publication_order", (index: any) => index.eq("publicationId", publicationId))
    .collect() as PublicationAuthorshipSource[]
  const personIds = [...new Set(authorships.map((authorship) => String(authorship.personId)))]
  const people = await Promise.all(personIds.map(async (personId) => (
    [personId, await ctx.db.get(personId)] as const
  )))
  const peopleById = new Map<string, StoredInstitutePerson>()
  for (const [personId, person] of people) {
    if (person) peopleById.set(personId, person as StoredInstitutePerson)
  }
  return { authorships, peopleById }
}

async function resolveIdentityTypeForUserId(
  ctx: any,
  userId: string,
): Promise<string | undefined> {
  try {
    const normalizedId = ctx.db.normalizeId("users", userId)
    if (normalizedId === null) return undefined
    const user = await ctx.db.get(normalizedId)
    return user ? resolveUserIdentityType(user) : undefined
  } catch {
    return undefined
  }
}

async function getPublicationAudiences(
  ctx: any,
  record: StoredPublication,
  authorSources: PublicationAuthorSources,
): Promise<PublicContentAudience[]> {
  const structuredAccountUserIds = [...authorSources.peopleById.values()].flatMap((person) => (
    person?.accountUserId === undefined ? [] : [String(person.accountUserId)]
  ))
  return resolvePublicationAudiences({
    authors: record.authors,
    structuredAccountUserIds,
    ownerUserId: String(record.userId),
    resolveIdentityType: (userId) => resolveIdentityTypeForUserId(ctx, userId),
  })
}

async function getNewsAudiences(
  ctx: any,
  news: StoredNews,
): Promise<PublicContentAudience[]> {
  const identity = await resolveIdentityTypeForUserId(ctx, String(news.authorId))
  return toPublicAudiences(identity === undefined ? [] : [identity])
}

/**
 * Reads are public, visibility-bound projections over the shared content
 * tables. This module intentionally exposes no content write endpoints.
 */
export const listPublicInstituteResearch = queryGeneric({
  args: {
    personSlug: v.optional(v.string()),
    researchGroupSlug: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const matchingKeys = await resolveContentFilter(ctx, args)
    const limit = normalizePublicLimit(args.limit)
    const records = matchingKeys === undefined
      ? await listPublicationCandidates(ctx, limit)
      : await loadMatchingPublicationRecords(ctx, matchingKeys)
    const publicRecords = records.filter((record) => (
      record.visibility !== "hidden"
      && (matchingKeys === undefined || matchingKeys.has(contentKey("publication", String(record._id))))
    )).slice(0, limit)

    return Promise.all(publicRecords.map(async (record) => {
      const id = String(record._id)
      const authorSources = await loadPublicationAuthorSources(ctx, id)
      const [audiences, relations] = await Promise.all([
        getPublicationAudiences(ctx, record, authorSources),
        getPublicContentRelations(ctx, "publication", id, authorSources),
      ])
      return toPublicInstituteResearch(record, { id, audiences }, relations)
    }))
  },
})

export const listPublicInstituteUpdates = queryGeneric({
  args: {
    personSlug: v.optional(v.string()),
    researchGroupSlug: v.optional(v.string()),
    limit: v.optional(v.number()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const matchingKeys = await resolveContentFilter(ctx, args)
    const limit = normalizePublicLimit(args.limit)
    const records = matchingKeys === undefined
      ? await listNewsCandidates(ctx, limit)
      : await loadMatchingNewsRecords(ctx, matchingKeys)
    const { actor, scopeContext } = await loadUpdateViewer(ctx, args.sessionToken)
    const publicRecords = records.filter((record) => (
      record.isPublished === true
      && canViewScopedNews(record, actor, scopeContext)
      && (matchingKeys === undefined || matchingKeys.has(contentKey("news", String(record._id))))
    )).slice(0, limit)

    return Promise.all(publicRecords.map(async (record) => {
      const id = String(record._id)
      const [audiences, relations] = await Promise.all([
        getNewsAudiences(ctx, record),
        getPublicContentRelations(ctx, "news", id),
      ])
      return toPublicInstituteUpdate(record, { id, audiences }, relations)
    }))
  },
})

export const getPublicInstituteResearchById = queryGeneric({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    let publicationId
    try {
      publicationId = ctx.db.normalizeId("publications", args.id)
    } catch {
      return null
    }
    if (publicationId === null) return null

    const record = await ctx.db.get(publicationId) as StoredPublication | null
    if (record === null || record.visibility === "hidden") return null

    const id = String(record._id)
    const authorSources = await loadPublicationAuthorSources(ctx, id)
    const [audiences, relations] = await Promise.all([
      getPublicationAudiences(ctx, record, authorSources),
      getPublicContentRelations(ctx, "publication", id, authorSources),
    ])
    return toPublicInstituteResearch(record, { id, audiences }, relations)
  },
})

export const getPublicInstituteUpdateById = queryGeneric({
  args: { id: v.string(), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let newsId
    try {
      newsId = ctx.db.normalizeId("news", args.id)
    } catch {
      return null
    }
    if (newsId === null) return null

    const record = await ctx.db.get(newsId) as StoredNews | null
    if (record === null || record.isPublished !== true) return null
    const { actor, scopeContext } = await loadUpdateViewer(ctx, args.sessionToken)
    if (!canViewScopedNews(record, actor, scopeContext)) return null

    const id = String(record._id)
    const [audiences, relations] = await Promise.all([
      getNewsAudiences(ctx, record),
      getPublicContentRelations(ctx, "news", id),
    ])
    return toPublicInstituteUpdate(record, { id, audiences }, relations)
  },
})
