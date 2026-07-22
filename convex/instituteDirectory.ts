import { queryGeneric } from "convex/server"
import { v } from "convex/values"
import {
  toPublicInstitutePerson,
  toPublicResearchGroup,
  type InstitutePublicPersonResearchGroupMembershipSource,
  type InstitutePublicResearchGroupMemberSource,
  type InstitutePersonRecord,
  type ResearchGroupRecord,
} from "./lib/instituteDto"
import type {
  InstitutePersonKind,
  PublicResearchGroupMembershipRole,
} from "../src/types/institute"

const DEFAULT_PUBLIC_LIMIT = 48
const MAX_PUBLIC_LIMIT = 100

type StoredInstitutePerson = InstitutePersonRecord & {
  _id: string
  visibility: "public" | "hidden"
  displayOrder: number
}

type StoredResearchGroup = ResearchGroupRecord & {
  _id: string
  visibility: "public" | "hidden"
  displayOrder: number
  leaderPersonId: string
}

type StoredResearchGroupMembership = {
  personId: string
  researchGroupId: string
  role: PublicResearchGroupMembershipRole
  endedAt?: number
  visibility: "public" | "hidden"
  sortOrder: number
}

function normalizePublicText(value?: string): string {
  return value?.trim().toLowerCase() ?? ""
}

function normalizePublicSlug(value: string): string {
  return value.trim().toLowerCase()
}

function normalizePublicLimit(value?: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PUBLIC_LIMIT
  const wholeNumber = Math.floor(value as number)
  return Math.max(1, Math.min(wholeNumber, MAX_PUBLIC_LIMIT))
}

function compareText(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function sortPeople(people: readonly StoredInstitutePerson[]): StoredInstitutePerson[] {
  return people.slice().sort((left, right) => (
    left.displayOrder - right.displayOrder
    || compareText(left.nameZh, right.nameZh)
    || compareText(left.slug, right.slug)
  ))
}

function sortResearchGroups(groups: readonly StoredResearchGroup[]): StoredResearchGroup[] {
  return groups.slice().sort((left, right) => (
    left.displayOrder - right.displayOrder
    || compareText(left.nameZh, right.nameZh)
    || compareText(left.slug, right.slug)
  ))
}

function personMatches(
  person: StoredInstitutePerson,
  researchArea: string,
  searchQuery: string,
): boolean {
  if (researchArea && !person.researchAreas.some((area) => normalizePublicText(area) === researchArea)) {
    return false
  }
  if (!searchQuery) return true

  const searchableText = [
    person.nameZh,
    person.nameEn,
    person.titleZh ?? "",
    person.titleEn ?? "",
    ...person.researchAreas,
  ].join("\n").toLowerCase()

  return searchableText.includes(searchQuery)
}

function researchGroupMatches(
  group: StoredResearchGroup,
  researchArea: string,
  searchQuery: string,
): boolean {
  if (researchArea && !group.researchAreas.some((area) => normalizePublicText(area) === researchArea)) {
    return false
  }
  if (!searchQuery) return true

  const searchableText = [
    group.nameZh,
    group.nameEn,
    group.summaryZh ?? "",
    group.summaryEn ?? "",
    ...group.researchAreas,
  ].join("\n").toLowerCase()

  return searchableText.includes(searchQuery)
}

async function getPublicLeader(ctx: any, leaderPersonId: string): Promise<InstitutePersonRecord | undefined> {
  const record = await ctx.db.get(leaderPersonId)
  if (!record || record.visibility !== "public") return undefined
  return record as StoredInstitutePerson
}

function isPublicActiveMembership(membership: StoredResearchGroupMembership): boolean {
  return membership.visibility === "public" && membership.endedAt === undefined
}

async function getPublicResearchGroupMembers(
  ctx: any,
  researchGroupId: string,
): Promise<InstitutePublicResearchGroupMemberSource[]> {
  const memberships = await ctx.db
    .query("researchGroupMemberships")
    .withIndex("by_group_order", (index: any) => index.eq("researchGroupId", researchGroupId))
    .collect() as StoredResearchGroupMembership[]
  const members: InstitutePublicResearchGroupMemberSource[] = []

  for (const membership of memberships) {
    if (!isPublicActiveMembership(membership)) continue
    const person = await ctx.db.get(membership.personId)
    if (!person || person.visibility !== "public") continue
    members.push({
      role: membership.role,
      person: person as StoredInstitutePerson,
    })
  }

  return members
}

async function getPublicPersonResearchGroupMemberships(
  ctx: any,
  personId: string,
): Promise<InstitutePublicPersonResearchGroupMembershipSource[]> {
  const memberships = await ctx.db
    .query("researchGroupMemberships")
    .withIndex("by_person_order", (index: any) => index.eq("personId", personId))
    .collect() as StoredResearchGroupMembership[]
  const relationships: InstitutePublicPersonResearchGroupMembershipSource[] = []

  for (const membership of memberships) {
    if (!isPublicActiveMembership(membership)) continue
    const group = await ctx.db.get(membership.researchGroupId)
    if (!group || group.visibility !== "public") continue
    relationships.push({
      role: membership.role,
      researchGroup: group as StoredResearchGroup,
    })
  }

  return relationships
}

/**
 * AIA's fast-pass directory deliberately exports public reads only. Write
 * endpoints remain absent until the session and authorization foundation is
 * integrated server-side.
 */
export const listPublicPeople = queryGeneric({
  args: {
    kind: v.optional(v.union(v.literal("teacher"), v.literal("graduate"))),
    researchArea: v.optional(v.string()),
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const records = args.kind === undefined
      ? await ctx.db
        .query("institutePeople")
        .withIndex("by_visibility_kind_order", (index: any) => index.eq("visibility", "public"))
        .collect()
      : await ctx.db
        .query("institutePeople")
        .withIndex("by_visibility_kind_order", (index: any) => (
          index.eq("visibility", "public").eq("kind", args.kind as InstitutePersonKind)
        ))
        .collect()

    const researchArea = normalizePublicText(args.researchArea)
    const searchQuery = normalizePublicText(args.query)
    const limit = normalizePublicLimit(args.limit)

    return sortPeople(records as StoredInstitutePerson[])
      .filter((person) => personMatches(person, researchArea, searchQuery))
      .slice(0, limit)
      .map((person) => toPublicInstitutePerson(person))
  },
})

export const getPublicPerson = queryGeneric({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const slug = normalizePublicSlug(args.slug)
    if (!slug) return null

    const record = await ctx.db
      .query("institutePeople")
      .withIndex("by_slug", (index: any) => index.eq("slug", slug))
      .first()

    if (!record || record.visibility !== "public") return null
    const person = record as StoredInstitutePerson
    return toPublicInstitutePerson(
      person,
      await getPublicPersonResearchGroupMemberships(ctx, person._id),
    )
  },
})

export const listPublicResearchGroups = queryGeneric({
  args: {
    researchArea: v.optional(v.string()),
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("researchGroups")
      .withIndex("by_visibility_order", (index: any) => index.eq("visibility", "public"))
      .collect() as StoredResearchGroup[]
    const researchArea = normalizePublicText(args.researchArea)
    const searchQuery = normalizePublicText(args.query)
    const limit = normalizePublicLimit(args.limit)
    const groups = sortResearchGroups(records)
      .filter((group) => researchGroupMatches(group, researchArea, searchQuery))
      .slice(0, limit)

    return Promise.all(groups.map(async (group) => {
      const [leader, members] = await Promise.all([
        getPublicLeader(ctx, group.leaderPersonId),
        getPublicResearchGroupMembers(ctx, group._id),
      ])
      return toPublicResearchGroup(group, leader, members)
    }))
  },
})

export const getPublicResearchGroup = queryGeneric({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const slug = normalizePublicSlug(args.slug)
    if (!slug) return null

    const record = await ctx.db
      .query("researchGroups")
      .withIndex("by_slug", (index: any) => index.eq("slug", slug))
      .first()

    if (!record || record.visibility !== "public") return null
    const group = record as StoredResearchGroup
    const [leader, members] = await Promise.all([
      getPublicLeader(ctx, group.leaderPersonId),
      getPublicResearchGroupMembers(ctx, group._id),
    ])
    return toPublicResearchGroup(group, leader, members)
  },
})
