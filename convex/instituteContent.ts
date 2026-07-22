import { queryGeneric } from "convex/server"
import { v } from "convex/values"
import type {
  InstituteContentRelationSources,
  InstituteNewsRecord,
  InstitutePersonRecord,
  InstitutePublicationRecord,
  ResearchGroupRecord,
} from "./lib/instituteDto"
import type {
  InstitutePublicLink,
  PublicInstitutePerson,
  PublicInstituteResearch,
  PublicInstituteResearchGroupReference,
  PublicInstituteUpdate,
} from "../src/types/institute"

const DEFAULT_PUBLIC_LIMIT = 24
const MAX_PUBLIC_LIMIT = 100

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
  siteScope?: "tong_class" | "institute"
  visibility?: "public" | "hidden"
}

type StoredNews = InstituteNewsRecord & {
  _id: string
  siteScope?: "tong_class" | "institute"
  isPublished: boolean
}

type StoredContentMention = InstituteContentMentionRelation & {
  sortOrder: number
}

function copyStringList(values: readonly string[]): string[] {
  return values.map((value) => value)
}

function copyPersonLinks(person: InstitutePersonRecord): InstitutePublicLink[] {
  return person.publicLinks.map((link) => ({
    kind: link.kind,
    label: link.label,
    href: link.href,
  }))
}

function toPublicInstitutePerson(person: InstitutePersonRecord): PublicInstitutePerson {
  const dto: PublicInstitutePerson = {
    slug: person.slug,
    kind: person.kind,
    nameZh: person.nameZh,
    nameEn: person.nameEn,
    researchAreas: copyStringList(person.researchAreas),
    publicLinks: copyPersonLinks(person),
    isDemo: person.isDemo,
  }
  if (person.titleZh !== undefined) dto.titleZh = person.titleZh
  if (person.titleEn !== undefined) dto.titleEn = person.titleEn
  if (person.bioZh !== undefined) dto.bioZh = person.bioZh
  if (person.bioEn !== undefined) dto.bioEn = person.bioEn
  if (person.photoUrl !== undefined) dto.photoUrl = person.photoUrl
  if (person.publicEmail !== undefined) dto.publicEmail = person.publicEmail
  if (person.coffeeTalkOpen !== undefined) dto.coffeeTalkOpen = person.coffeeTalkOpen
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
  dto.people = (relations.people ?? []).map((person) => toPublicInstitutePerson(person))
  dto.researchGroups = (relations.researchGroups ?? [])
    .map((group) => toPublicInstituteResearchGroupReference(group))
}

function toPublicInstituteResearch(
  record: InstitutePublicationRecord,
  relations: InstituteContentRelationSources,
): PublicInstituteResearch {
  const dto: PublicInstituteResearch = {
    title: record.title,
    authors: copyStringList(record.authors),
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
  relations: InstituteContentRelationSources,
): PublicInstituteUpdate {
  const dto: PublicInstituteUpdate = {
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
  const mentions = await ctx.db
    .query("contentMentions")
    .withIndex("by_target", (index: any) => (
      index.eq("targetType", "researchGroup").eq("targetId", researchGroupId)
    ))
    .collect() as StoredContentMention[]
  const keys = new Set<string>()
  for (const mention of mentions) {
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
): Promise<InstituteContentRelationSources> {
  const mentions = await ctx.db
    .query("contentMentions")
    .withIndex("by_content", (index: any) => (
      index.eq("contentType", contentType).eq("contentId", contentId)
    ))
    .collect() as StoredContentMention[]
  const authorships = contentType === "publication"
    ? await ctx.db
      .query("publicationAuthorships")
      .withIndex("by_publication_order", (index: any) => index.eq("publicationId", contentId))
      .collect()
    : []
  const people: InstitutePersonRecord[] = []
  const researchGroups: ResearchGroupRecord[] = []
  const seenPeople = new Set<string>()
  const seenResearchGroups = new Set<string>()

  for (const authorship of authorships) {
    const personId = String(authorship.personId)
    if (seenPeople.has(personId)) continue
    const person = await getPublicPerson(ctx, personId)
    if (person !== undefined) {
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

    const researchGroupId = String(mention.targetId)
    if (seenResearchGroups.has(researchGroupId)) continue
    const researchGroup = await getPublicResearchGroup(ctx, researchGroupId)
    if (researchGroup !== undefined) {
      researchGroups.push(researchGroup)
      seenResearchGroups.add(researchGroupId)
    }
  }

  return { people, researchGroups }
}

/**
 * Reads are public and scope-bound. This fast-pass intentionally has no write
 * endpoints until server-side session and authorization checks are available.
 */
export const listPublicInstituteResearch = queryGeneric({
  args: {
    personSlug: v.optional(v.string()),
    researchGroupSlug: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const matchingKeys = await resolveContentFilter(ctx, args)
    const records = await ctx.db
      .query("publications")
      .withIndex("by_siteScope_visibility_year", (index: any) => (
        index.eq("siteScope", "institute").eq("visibility", "public")
      ))
      .order("desc")
      .collect() as StoredPublication[]
    const limit = normalizePublicLimit(args.limit)
    const publicRecords = records.filter((record) => (
      record.siteScope === "institute"
      && record.visibility === "public"
      && (matchingKeys === undefined || matchingKeys.has(contentKey("publication", String(record._id))))
    )).slice(0, limit)

    return Promise.all(publicRecords.map(async (record) => (
      toPublicInstituteResearch(
        record,
        await getPublicContentRelations(ctx, "publication", String(record._id)),
      )
    )))
  },
})

export const listPublicInstituteUpdates = queryGeneric({
  args: {
    personSlug: v.optional(v.string()),
    researchGroupSlug: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const matchingKeys = await resolveContentFilter(ctx, args)
    const records = await ctx.db
      .query("news")
      .withIndex("by_siteScope_isPublished_publishedAt", (index: any) => (
        index.eq("siteScope", "institute").eq("isPublished", true)
      ))
      .order("desc")
      .collect() as StoredNews[]
    const limit = normalizePublicLimit(args.limit)
    const publicRecords = records.filter((record) => (
      record.siteScope === "institute"
      && record.isPublished === true
      && (matchingKeys === undefined || matchingKeys.has(contentKey("news", String(record._id))))
    )).slice(0, limit)

    return Promise.all(publicRecords.map(async (record) => (
      toPublicInstituteUpdate(
        record,
        await getPublicContentRelations(ctx, "news", String(record._id)),
      )
    )))
  },
})
