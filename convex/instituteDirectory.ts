import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
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
import { requireSuperAdminBySession } from "./reviewer/lib"

const DEFAULT_PUBLIC_LIMIT = 48
const MAX_PUBLIC_LIMIT = 100

type StoredInstitutePerson = InstitutePersonRecord & {
  _id: Id<"institutePeople">
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
 * AIA's public directory reads only export allow-listed profiles. The one
 * account-binding write path is intentionally separate, session-gated, and
 * limited to super-admins below.
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

/**
 * A super-admin-only selector for explicit directory-to-account links. It
 * intentionally excludes emails, student IDs, credentials, sessions, and
 * other account-management data; a caller can only select an exact account ID
 * from this minimal set.
 */
export const listAccountBindingCandidates = queryGeneric({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminBySession(ctx, args.sessionToken)

    const [people, users] = await Promise.all([
      ctx.db.query("institutePeople").collect() as Promise<StoredInstitutePerson[]>,
      ctx.db.query("users").collect(),
    ])

    return {
      people: sortPeople(people).map((person) => ({
        slug: person.slug,
        kind: person.kind,
        nameZh: person.nameZh,
        nameEn: person.nameEn,
        ...(person.accountUserId !== undefined
          ? { accountUserId: String(person.accountUserId) }
          : {}),
      })),
      users: users
        .slice()
        .sort((left: any, right: any) => (
          compareText(left.englishName, right.englishName)
          || compareText(left.username, right.username)
        ))
        .map((user: any) => ({
          id: String(user._id),
          username: user.username,
          englishName: user.englishName,
          ...(user.chineseName !== undefined ? { chineseName: user.chineseName } : {}),
          ...(user.identityType !== undefined ? { identityType: user.identityType } : {}),
        })),
    }
  },
})

/**
 * Binds or unbinds one institute-person record and one existing main-site
 * account. The target account is resolved by its exact database ID, never by
 * a name or email. A main account may belong to at most one directory record.
 */
export const bindPersonAccount = mutationGeneric({
  args: {
    sessionToken: v.string(),
    personSlug: v.string(),
    accountUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminBySession(ctx, args.sessionToken)

    const personSlug = normalizePublicSlug(args.personSlug)
    if (!personSlug) {
      throw new Error("目录人员标识不能为空")
    }

    const person = await ctx.db
      .query("institutePeople")
      .withIndex("by_slug", (index: any) => index.eq("slug", personSlug))
      .first() as StoredInstitutePerson | null

    if (!person) {
      throw new Error("目录人员不存在")
    }

    if (args.accountUserId === undefined) {
      if (person.accountUserId !== undefined) {
        await ctx.db.patch(person._id, {
          accountUserId: undefined,
          updatedAt: Date.now(),
        })
      }

      return {
        personSlug: person.slug,
        accountUserId: undefined,
      }
    }

    const account = await ctx.db.get(args.accountUserId)
    if (!account) {
      throw new Error("要绑定的主站账号不存在")
    }

    const existingBindings = await ctx.db
      .query("institutePeople")
      .withIndex("by_accountUserId", (index: any) => index.eq("accountUserId", args.accountUserId))
      .collect() as StoredInstitutePerson[]
    const conflictingBinding = existingBindings.find((candidate) => (
      String(candidate._id) !== String(person._id)
    ))

    if (conflictingBinding) {
      throw new Error("该主站账号已绑定到另一个研究院目录人员；请先解除原绑定")
    }

    if (String(person.accountUserId) !== String(args.accountUserId)) {
      await ctx.db.patch(person._id, {
        accountUserId: args.accountUserId,
        updatedAt: Date.now(),
      })
    }

    return {
      personSlug: person.slug,
      accountUserId: String(args.accountUserId),
    }
  },
})
