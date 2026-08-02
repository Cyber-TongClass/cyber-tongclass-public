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
import { getUserBySession, requireSuperAdminBySession } from "./reviewer/lib"
import { resolveUserIdentityType } from "./lib/userIdentity"
import {
  assertResearchGroupMemberTransferAllowed,
  compactResearchGroupMemberOrder,
  normalizeResearchGroupProfile,
  resolveResearchGroupPublicationCandidates,
  sortResearchGroupMembers,
  teacherResearchGroupNameZh,
} from "./lib/researchGroupPublications"
import { isEnabledScopeAccount } from "./lib/oaScopeAuthorization"

const DEFAULT_PUBLIC_LIMIT = 48
const MAX_PUBLIC_LIMIT = 500
const MANAGE_RESEARCH_GROUP_MEMBERS = "manage_research_group_members"

type StoredInstitutePerson = InstitutePersonRecord & {
  _id: Id<"institutePeople">
  visibility: "public" | "hidden"
  displayOrder: number
}

type StoredResearchGroup = ResearchGroupRecord & {
  _id: Id<"researchGroups">
  visibility: "public" | "hidden"
  displayOrder: number
  leaderPersonId: Id<"institutePeople">
  createdAt: number
  updatedAt: number
}

type StoredResearchGroupMembership = {
  personId: string
  researchGroupId: string
  role: PublicResearchGroupMembershipRole
  endedAt?: number
  visibility: "public" | "hidden"
  sortOrder: number
}

type TeacherAccountForDirectory = {
  _id: Id<"users">
  username: string
  englishName: string
  chineseName?: string
}

type StoredStudentResearchGroupAssignment = {
  _id: string
  studentUserId: Id<"users">
  researchGroupId: string
  subtitle?: string
  sortOrder?: number
  assignedByUserId: Id<"users">
  assignedAt: number
  updatedAt: number
}

type StoredAccountCapability = {
  _id: string
  userId: Id<"users">
  capability: typeof MANAGE_RESEARCH_GROUP_MEMBERS
  enabled: boolean
}

async function teacherLedResearchGroups(ctx: any, userId: Id<"users">) {
  const teacherProfiles = await ctx.db
    .query("institutePeople")
    .withIndex("by_accountUserId", (index: any) => index.eq("accountUserId", userId))
    .collect() as StoredInstitutePerson[]
  const teacherPersonIds = new Set(
    teacherProfiles.filter((person) => person.kind === "teacher").map((person) => String(person._id)),
  )
  if (teacherPersonIds.size === 0) return [] as StoredResearchGroup[]

  const groups = await ctx.db.query("researchGroups").collect() as StoredResearchGroup[]
  return groups.filter((group) => teacherPersonIds.has(String(group.leaderPersonId)))
}

type PublicGroupRosterEntry = { name: string; subtitle?: string }

/**
 * Roster names exposed alongside a public group. Only the member's display
 * name and the leader-set subtitle leave the private assignment table —
 * never usernames, emails, or account identifiers.
 */
async function getPublicGroupRoster(ctx: any, researchGroupId: string): Promise<PublicGroupRosterEntry[]> {
  const assignments = await ctx.db
    .query("studentResearchGroupAssignments")
    .withIndex("by_researchGroupId", (index: any) => index.eq("researchGroupId", researchGroupId))
    .collect() as StoredStudentResearchGroupAssignment[]
  const entries: Array<PublicGroupRosterEntry & { sortOrder?: number }> = []
  for (const assignment of sortResearchGroupMembers(assignments)) {
    const member = await ctx.db.get(assignment.studentUserId) as any
    if (!isEnabledScopeAccount(member)) continue
    const name = member.chineseName?.trim() || member.englishName?.trim() || member.username
    if (!name) continue
    const entry: PublicGroupRosterEntry & { sortOrder?: number } = {
      name,
      sortOrder: assignment.sortOrder,
    }
    const subtitle = assignment.subtitle?.trim()
    if (subtitle) entry.subtitle = subtitle
    entries.push(entry)
  }
  return entries.map(({ name, subtitle }) => ({ name, ...(subtitle ? { subtitle } : {}) }))
}

function teacherProfileSlugBase(username: string, userId: Id<"users">): string {
  const normalized = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `teacher-${normalized || String(userId)}`
}

function teacherResearchGroupSlugBase(username: string, userId: Id<"users">): string {
  return `${teacherProfileSlugBase(username, userId)}-research-group`
}

async function teacherGroupManagementCapability(ctx: any, userId: Id<"users">) {
  return await ctx.db
    .query("accountCapabilities")
    .withIndex("by_user_capability", (index: any) => (
      index.eq("userId", userId).eq("capability", MANAGE_RESEARCH_GROUP_MEMBERS)
    ))
    .first() as StoredAccountCapability | null
}

/**
 * Creates the directory counterpart required by Coffee Talk for a teacher
 * account. Existing bindings are never overwritten so an explicit teacher
 * opt-out remains intact and a conflicting non-teacher binding is surfaced
 * for super-admin correction.
 */
export async function ensureTeacherCoffeeTalkProfile(
  ctx: any,
  input: { userId: Id<"users">; user: TeacherAccountForDirectory; now: number },
) {
  const boundProfile = await ctx.db
    .query("institutePeople")
    .withIndex("by_accountUserId", (index: any) => index.eq("accountUserId", input.userId))
    .first() as StoredInstitutePerson | null

  if (boundProfile) {
    if (boundProfile.kind !== "teacher") {
      throw new Error("教师账号已绑定到非教师目录档案，请先由超级管理员修正绑定")
    }
    return { person: boundProfile, created: false }
  }

  const baseSlug = teacherProfileSlugBase(input.user.username, input.userId)
  let slug = baseSlug
  let suffix = 2
  while (await ctx.db.query("institutePeople").withIndex("by_slug", (index: any) => index.eq("slug", slug)).first()) {
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  const personId = await ctx.db.insert("institutePeople", {
    slug,
    kind: "teacher",
    nameZh: input.user.chineseName?.trim() || input.user.englishName.trim(),
    nameEn: input.user.englishName.trim(),
    researchAreas: [],
    publicLinks: [],
    coffeeTalkOpen: true,
    visibility: "public",
    displayOrder: input.now,
    isDemo: false,
    accountUserId: input.userId,
    createdAt: input.now,
    updatedAt: input.now,
  })

  return { person: await ctx.db.get(personId), created: true }
}

/**
 * Ensures every teacher has the reusable group-management capability and a
 * private default research group. Existing explicit capability revocations and
 * existing groups are always retained.
 */
export async function ensureTeacherGroupManagement(
  ctx: any,
  input: { userId: Id<"users">; user: TeacherAccountForDirectory; now: number },
) {
  const profileResult = await ensureTeacherCoffeeTalkProfile(ctx, input)
  const person = profileResult.person as StoredInstitutePerson | null
  if (!person) throw new Error("教师目录档案创建失败")

  const capability = await teacherGroupManagementCapability(ctx, input.userId)
  let capabilityCreated = false
  if (!capability) {
    await ctx.db.insert("accountCapabilities", {
      userId: input.userId,
      capability: MANAGE_RESEARCH_GROUP_MEMBERS,
      enabled: true,
      grantedAt: input.now,
      updatedAt: input.now,
    })
    capabilityCreated = true
  }

  const existingGroups = await ctx.db
    .query("researchGroups")
    .withIndex("by_leaderPersonId", (index: any) => index.eq("leaderPersonId", person._id))
    .collect() as StoredResearchGroup[]

  if (existingGroups.length > 0) {
    return { profileCreated: profileResult.created, capabilityCreated, groupCreated: false }
  }

  const baseSlug = teacherResearchGroupSlugBase(input.user.username, input.userId)
  let slug = baseSlug
  let suffix = 2
  while (await ctx.db.query("researchGroups").withIndex("by_slug", (index: any) => index.eq("slug", slug)).first()) {
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  await ctx.db.insert("researchGroups", {
    slug,
    nameZh: teacherResearchGroupNameZh(
      input.user.chineseName?.trim() || input.user.englishName.trim(),
    ),
    nameEn: `${input.user.englishName.trim()} Research Group`,
    leaderPersonId: person._id,
    researchAreas: [],
    publicLinks: [],
    visibility: "hidden",
    displayOrder: input.now,
    isDemo: false,
    createdAt: input.now,
    updatedAt: input.now,
  })

  return { profileCreated: profileResult.created, capabilityCreated, groupCreated: true }
}

async function canManageTeacherGroupMembers(ctx: any, userId: Id<"users">) {
  const capability = await teacherGroupManagementCapability(ctx, userId)
  return capability?.enabled === true
}

/**
 * Resolves the only research group an actor may write. Super administrators
 * must explicitly select a group; teachers remain limited to a group they lead
 * and retain the existing capability revocation gate.
 */
export async function resolveManagedResearchGroup(
  ctx: any,
  actor: any,
  requestedGroupId?: Id<"researchGroups">,
): Promise<StoredResearchGroup> {
  if (actor.role === "super_admin") {
    if (!requestedGroupId) throw new Error("超级管理员必须先选择课题组")
    const group = await ctx.db.get(requestedGroupId) as StoredResearchGroup | null
    if (!group) throw new Error("未找到课题组")
    return group
  }
  if (resolveUserIdentityType(actor) !== "teacher") {
    throw new Error("只有课题组负责人或超级管理员可以管理课题组")
  }
  if (!await canManageTeacherGroupMembers(ctx, actor._id)) {
    throw new Error("课题组成员管理权限已被超级管理员关闭")
  }
  const ledGroups = await teacherLedResearchGroups(ctx, actor._id)
  const group = requestedGroupId
    ? ledGroups.find((item) => String(item._id) === String(requestedGroupId))
    : ledGroups.sort((left, right) => left.createdAt - right.createdAt)[0]
  if (!group) throw new Error("只能管理自己负责的课题组")
  return group
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

/**
 * Resolves the signed-in user's valid public profile without letting clients
 * guess account-to-directory links. Institute directory bindings take
 * precedence; explicit Tong Class members fall back to their public member
 * slug. Accounts without a public destination return null.
 */
export const getMyPublicProfileDestination = queryGeneric({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const boundPeople = await ctx.db
      .query("institutePeople")
      .withIndex("by_accountUserId", (index: any) => index.eq("accountUserId", user._id))
      .collect() as StoredInstitutePerson[]
    const publicPerson = boundPeople.find((person) => person.visibility === "public")

    if (publicPerson) {
      return {
        href: `/people/${publicPerson.slug}`,
        label: "研究院个人主页",
      }
    }

    if (user.isClassMember === true && user.username?.trim()) {
      return {
        href: `/tong-class/members/${user.username.trim()}`,
        label: "通班个人主页",
      }
    }

    return null
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
      const [leader, members, roster] = await Promise.all([
        getPublicLeader(ctx, group.leaderPersonId),
        getPublicResearchGroupMembers(ctx, group._id),
        getPublicGroupRoster(ctx, group._id),
      ])
      return toPublicResearchGroup(group, leader, members, roster)
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
    const [leader, members, roster] = await Promise.all([
      getPublicLeader(ctx, group.leaderPersonId),
      getPublicResearchGroupMembers(ctx, group._id),
      getPublicGroupRoster(ctx, group._id),
    ])
    return toPublicResearchGroup(group, leader, members, roster)
  },
})

/**
 * Research-group labels for OA audience and approval scope selection. Any
 * signed-in account (including teachers building forms) may see group names;
 * membership itself is never exposed here.
 */
export const listResearchGroupScopeOptions = queryGeneric({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const groups = actor.role === "super_admin"
      ? await ctx.db.query("researchGroups").collect() as StoredResearchGroup[]
      : resolveUserIdentityType(actor) === "teacher"
        ? await teacherLedResearchGroups(ctx, actor._id)
        : []
    return Promise.all(sortResearchGroups(groups).map(async (group) => {
      const leader = await ctx.db.get(group.leaderPersonId) as StoredInstitutePerson | null
      return {
        id: String(group._id),
        name: teacherResearchGroupNameZh(leader?.nameZh || leader?.nameEn || group.nameZh || group.nameEn),
        leaderName: leader?.nameZh || leader?.nameEn || "未绑定负责人",
      }
    }))
  },
})

/**
 * Private roster for the single group led by the signed-in teacher. Members
 * can be any account (students as well as staff such as engineers); each
 * carries an optional leader-set subtitle. Candidates are every other account
 * so the leader can add people without a separate directory lookup.
 */
export const listTeacherGroupRoster = queryGeneric({
  args: {
    sessionToken: v.string(),
    groupId: v.optional(v.id("researchGroups")),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const isSuperAdmin = actor.role === "super_admin"
    const canManage = isSuperAdmin || (
      resolveUserIdentityType(actor) === "teacher"
      && await canManageTeacherGroupMembers(ctx, actor._id)
    )
    if (!canManage) {
      return { group: null, leader: null, members: [], candidates: [], publications: [], canManage: false }
    }

    let group: StoredResearchGroup | undefined
    if (isSuperAdmin && !args.groupId) {
      return { group: null, leader: null, members: [], candidates: [], publications: [], canManage: true }
    }
    try {
      group = await resolveManagedResearchGroup(ctx, actor, args.groupId)
    } catch (error) {
      if (!isSuperAdmin && args.groupId === undefined) {
        return { group: null, leader: null, members: [], candidates: [], publications: [], canManage: true }
      }
      throw error
    }

    const groupId = String(group._id)
    const assignments = await ctx.db
      .query("studentResearchGroupAssignments")
      .withIndex("by_researchGroupId", (index: any) => index.eq("researchGroupId", group!._id))
      .collect() as StoredStudentResearchGroupAssignment[]
    const allAssignments = await ctx.db.query("studentResearchGroupAssignments").collect() as StoredStudentResearchGroupAssignment[]
    const assignmentByUserId = new Map(allAssignments.map((item) => [String(item.studentUserId), item]))
    const groupNameById = new Map(
      (await ctx.db.query("researchGroups").collect() as StoredResearchGroup[])
        .map((item) => [String(item._id), item.nameZh || item.nameEn]),
    )
    const usersRaw = await ctx.db.query("users").collect()
    const users = usersRaw.filter(isEnabledScopeAccount)
    const userById = new Map(users.map((user: any) => [String(user._id), user]))
    const leaderPerson = await ctx.db.get(group.leaderPersonId) as StoredInstitutePerson | null
    const leaderAccount = leaderPerson?.accountUserId === undefined
      ? null
      : userById.get(String(leaderPerson.accountUserId))

    const describe = (user: any) => ({
      id: String(user._id),
      userId: String(user._id),
      username: user.username,
      name: user.chineseName?.trim() || user.englishName?.trim() || user.username,
      identityType: resolveUserIdentityType(user),
    })
    const byName = (left: { name: string; username: string }, right: { name: string; username: string }) => (
      compareText(left.name, right.name) || compareText(left.username, right.username)
    )

    const members = sortResearchGroupMembers(assignments)
      .flatMap((assignment) => {
        const user = userById.get(String(assignment.studentUserId))
        return user ? [{ ...describe(user), subtitle: assignment.subtitle ?? "" }] : []
      })
    const candidates = users
      .filter((user: any) => (
        String(user._id) !== String(leaderAccount?._id)
        && String(assignmentByUserId.get(String(user._id))?.researchGroupId) !== groupId
        && (
          isSuperAdmin
          || assignmentByUserId.get(String(user._id)) === undefined
        )
      ))
      .map((user: any) => {
        const assignment = assignmentByUserId.get(String(user._id))
        return {
          ...describe(user),
          ...(assignment ? { otherGroupName: groupNameById.get(String(assignment.researchGroupId)) || "其他课题组" } : {}),
        }
      })
      .sort(byName)

    const resolvedPublications = await resolveResearchGroupPublicationCandidates(ctx, groupId)
    const publications = resolvedPublications.map((candidate) => ({
      id: candidate.publicationId,
      title: candidate.publication.title,
      authors: candidate.displayAuthors,
      venue: candidate.publication.venue,
      year: candidate.publication.year,
      relationSource: candidate.relationSource === "automatic-and-explicit" ? "both" : candidate.relationSource,
      effectiveVisibility: candidate.effectiveVisibility ? "public" : "hidden",
    }))

    return {
      group: {
        id: groupId,
        slug: group.slug,
        name: group.nameZh || group.nameEn,
        nameZh: group.nameZh,
        nameEn: group.nameEn,
        summaryZh: group.summaryZh,
        summaryEn: group.summaryEn,
        descriptionZh: group.descriptionZh,
        descriptionEn: group.descriptionEn,
        researchAreas: group.researchAreas,
        publicLinks: [...group.publicLinks],
        recruitmentZh: group.recruitmentZh,
        recruitmentEn: group.recruitmentEn,
        visibility: group.visibility,
      },
      leader: leaderAccount ? describe(leaderAccount) : leaderPerson ? {
        id: String(leaderPerson._id),
        userId: String(leaderPerson._id),
        username: "",
        name: leaderPerson.nameZh || leaderPerson.nameEn,
        identityType: "teacher",
      } : null,
      members,
      candidates,
      publications,
      canManage: true,
    }
  },
})

/**
 * Adds an account to the teacher's own group, replacing any previous group
 * assignment. Accepts students and staff alike; the subtitle is a short role
 * note shown next to the member's name (e.g. 工程师).
 */
export const assignTeacherGroupMember = mutationGeneric({
  args: {
    sessionToken: v.string(),
    groupId: v.optional(v.id("researchGroups")),
    userId: v.id("users"),
    subtitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const group = await resolveManagedResearchGroup(ctx, actor, args.groupId)
    const leader = await ctx.db.get(group.leaderPersonId)
    if (String(args.userId) === String(leader?.accountUserId)) {
      throw new Error("课题组负责人无需添加自己为成员")
    }
    const member = await ctx.db.get(args.userId)
    if (!isEnabledScopeAccount(member)) throw new Error("目标账号不可用")

    const subtitle = args.subtitle?.trim() || undefined
    const now = Date.now()
    const groupAssignments = await ctx.db
      .query("studentResearchGroupAssignments")
      .withIndex("by_researchGroupId", (index: any) => index.eq("researchGroupId", group._id))
      .collect() as StoredStudentResearchGroupAssignment[]
    const nextSortOrder = Math.max(
      0,
      ...groupAssignments.map((assignment) => (
        Number.isFinite(assignment.sortOrder) ? assignment.sortOrder! : 0
      )),
    ) + 10
    const existing = await ctx.db
      .query("studentResearchGroupAssignments")
      .withIndex("by_studentUserId", (index: any) => index.eq("studentUserId", args.userId))
      .first() as StoredStudentResearchGroupAssignment | null
    assertResearchGroupMemberTransferAllowed({
      actorRole: String(actor.role),
      destinationGroupId: String(group._id),
      existingGroupId: existing ? String(existing.researchGroupId) : undefined,
    })

    if (existing) {
      if (
        String(existing.researchGroupId) === String(group._id)
        && (existing.subtitle ?? undefined) === subtitle
      ) return
      await ctx.db.patch(existing._id as any, {
        researchGroupId: group._id,
        subtitle,
        sortOrder: String(existing.researchGroupId) === String(group._id)
          ? existing.sortOrder
          : nextSortOrder,
        assignedByUserId: actor._id,
        updatedAt: now,
      })
    } else {
      await ctx.db.insert("studentResearchGroupAssignments", {
        studentUserId: args.userId,
        researchGroupId: group._id,
        subtitle,
        sortOrder: nextSortOrder,
        assignedByUserId: actor._id,
        assignedAt: now,
        updatedAt: now,
      })
    }
  },
})

/** Removes an account only from a group led by the signed-in teacher. */
export const removeTeacherGroupMember = mutationGeneric({
  args: {
    sessionToken: v.string(),
    groupId: v.optional(v.id("researchGroups")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const group = await resolveManagedResearchGroup(ctx, actor, args.groupId)
    const assignment = await ctx.db
      .query("studentResearchGroupAssignments")
      .withIndex("by_studentUserId", (index: any) => index.eq("studentUserId", args.userId))
      .first() as StoredStudentResearchGroupAssignment | null
    if (!assignment) return

    if (String(group._id) !== String(assignment.researchGroupId)) {
      throw new Error("只能移除自己课题组中的成员")
    }
    await ctx.db.delete(assignment._id as any)
  },
})

/** Updates the leader-set subtitle of one member in the teacher's own group. */
export const setTeacherGroupMemberSubtitle = mutationGeneric({
  args: {
    sessionToken: v.string(),
    groupId: v.optional(v.id("researchGroups")),
    userId: v.id("users"),
    subtitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const group = await resolveManagedResearchGroup(ctx, actor, args.groupId)
    const assignment = await ctx.db
      .query("studentResearchGroupAssignments")
      .withIndex("by_studentUserId", (index: any) => index.eq("studentUserId", args.userId))
      .first() as StoredStudentResearchGroupAssignment | null
    if (!assignment) throw new Error("该账号不在你的课题组中")

    if (String(group._id) !== String(assignment.researchGroupId)) {
      throw new Error("只能修改自己课题组成员的说明")
    }
    await ctx.db.patch(assignment._id as any, {
      subtitle: args.subtitle?.trim() || undefined,
      updatedAt: Date.now(),
    })
  },
})

export const setTeacherGroupMemberOrder = mutationGeneric({
  args: {
    sessionToken: v.string(),
    groupId: v.optional(v.id("researchGroups")),
    orderedUserIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const group = await resolveManagedResearchGroup(ctx, actor, args.groupId)
    const assignments = await ctx.db
      .query("studentResearchGroupAssignments")
      .withIndex("by_researchGroupId", (index: any) => index.eq("researchGroupId", group._id))
      .collect() as StoredStudentResearchGroupAssignment[]
    const activeAssignments = (await Promise.all(assignments.map(async (assignment) => ({
      assignment,
      member: await ctx.db.get(assignment.studentUserId),
    }))))
      .filter(({ member }) => isEnabledScopeAccount(member))
      .map(({ assignment }) => assignment)
    const persistedSet = new Set(activeAssignments.map((assignment) => String(assignment.studentUserId)))
    const proposedSet = new Set(args.orderedUserIds.map(String))
    if (
      proposedSet.size !== args.orderedUserIds.length
      || proposedSet.size !== persistedSet.size
      || [...persistedSet].some((userId) => !proposedSet.has(userId))
    ) {
      throw new Error("RESEARCH_GROUP_MEMBER_ORDER_SET_MISMATCH")
    }
    const assignmentByUserId = new Map(
      activeAssignments.map((assignment) => [String(assignment.studentUserId), assignment]),
    )
    const now = Date.now()
    for (const item of compactResearchGroupMemberOrder(args.orderedUserIds)) {
      const assignment = assignmentByUserId.get(String(item.userId))
      if (!assignment || assignment.sortOrder === item.sortOrder) continue
      await ctx.db.patch(assignment._id as any, {
        sortOrder: item.sortOrder,
        updatedAt: now,
      })
    }
  },
})

export const setTeacherGroupPublicationVisibility = mutationGeneric({
  args: {
    sessionToken: v.string(),
    groupId: v.optional(v.id("researchGroups")),
    publicationId: v.id("publications"),
    visible: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const group = await resolveManagedResearchGroup(ctx, actor, args.groupId)
    const publication = await ctx.db.get(args.publicationId)
    if (!publication) throw new Error("未找到文章")
    const candidates = await resolveResearchGroupPublicationCandidates(ctx, String(group._id))
    if (!candidates.some((candidate) => candidate.publicationId === String(args.publicationId))) {
      throw new Error("RESEARCH_GROUP_PUBLICATION_NOT_RELATED")
    }
    const existing = await ctx.db
      .query("researchGroupPublicationVisibilityOverrides")
      .withIndex("by_group_publication", (index: any) => (
        index.eq("researchGroupId", group._id).eq("publicationId", args.publicationId)
      ))
      .first()
    if (existing) {
      if (existing.visible === args.visible) return
      await ctx.db.patch(existing._id, {
        visible: args.visible,
        changedByUserId: actor._id,
        updatedAt: Date.now(),
      })
      return
    }
    const now = Date.now()
    await ctx.db.insert("researchGroupPublicationVisibilityOverrides", {
      researchGroupId: group._id,
      publicationId: args.publicationId,
      visible: args.visible,
      changedByUserId: actor._id,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateTeacherGroupProfile = mutationGeneric({
  args: {
    sessionToken: v.string(),
    groupId: v.optional(v.id("researchGroups")),
    profile: v.object({
      nameZh: v.string(),
      nameEn: v.string(),
      summaryZh: v.optional(v.string()),
      summaryEn: v.optional(v.string()),
      descriptionZh: v.optional(v.string()),
      descriptionEn: v.optional(v.string()),
      researchAreas: v.array(v.string()),
      recruitmentZh: v.optional(v.string()),
      recruitmentEn: v.optional(v.string()),
      publicLinks: v.array(v.object({
        label: v.string(),
        href: v.string(),
      })),
      visibility: v.union(v.literal("public"), v.literal("hidden")),
    }),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const group = await resolveManagedResearchGroup(ctx, actor, args.groupId)
    const normalized = normalizeResearchGroupProfile(args.profile)
    const patch: Record<string, unknown> = {}
    for (const field of [
      "nameZh",
      "nameEn",
      "summaryZh",
      "summaryEn",
      "descriptionZh",
      "descriptionEn",
      "researchAreas",
      "recruitmentZh",
      "recruitmentEn",
      "publicLinks",
      "visibility",
    ] as const) {
      if (JSON.stringify(group[field]) !== JSON.stringify(normalized[field])) {
        patch[field] = normalized[field]
      }
    }
    if (Object.keys(patch).length === 0) return
    await ctx.db.patch(group._id as any, {
      ...patch,
      updatedAt: Date.now(),
    })
  },
})

/** Publishes or hides the teacher's own group in the public directory. */
export const setTeacherGroupVisibility = mutationGeneric({
  args: {
    sessionToken: v.string(),
    groupId: v.optional(v.id("researchGroups")),
    visibility: v.union(v.literal("public"), v.literal("hidden")),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const group = await resolveManagedResearchGroup(ctx, actor, args.groupId)
    await ctx.db.patch(group._id as any, {
      visibility: args.visibility,
      updatedAt: Date.now(),
    })
  },
})

// Compatibility aliases retained for the original student-only management UI.
export const assignTeacherGroupStudent = assignTeacherGroupMember
export const removeTeacherGroupStudent = removeTeacherGroupMember

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

    const [people, users, capabilities] = await Promise.all([
      ctx.db.query("institutePeople").collect() as Promise<StoredInstitutePerson[]>,
      ctx.db.query("users").collect(),
      ctx.db.query("accountCapabilities").collect() as Promise<StoredAccountCapability[]>,
    ])
    const capabilityByUserId = new Map(capabilities.map((capability) => [
      `${String(capability.userId)}:${capability.capability}`,
      capability,
    ]))

    return {
      people: sortPeople(people).map((person) => ({
        slug: person.slug,
        kind: person.kind,
        nameZh: person.nameZh,
        nameEn: person.nameEn,
        ...(person.coffeeTalkOpen !== undefined ? { coffeeTalkOpen: person.coffeeTalkOpen } : {}),
        ...(person.kind === "teacher" && person.accountUserId !== undefined ? {
          groupManagementEnabled: capabilityByUserId.get(
            `${String(person.accountUserId)}:${MANAGE_RESEARCH_GROUP_MEMBERS}`,
          )?.enabled === true,
        } : {}),
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

    if (person.kind === "teacher" && resolveUserIdentityType(account) === "teacher") {
      await ensureTeacherGroupManagement(ctx, {
        userId: account._id,
        user: account,
        now: Date.now(),
      })
    }

    return {
      personSlug: person.slug,
      accountUserId: String(args.accountUserId),
    }
  },
})

/** Super administrators may revoke or restore an explicit account capability. */
export const setAccountCapability = mutationGeneric({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
    capability: v.literal(MANAGE_RESEARCH_GROUP_MEMBERS),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const administrator = await requireSuperAdminBySession(ctx, args.sessionToken)
    const target = await ctx.db.get(args.userId)
    if (!target || resolveUserIdentityType(target) !== "teacher") {
      throw new Error("只能调整教师账号的课题组成员管理权限")
    }

    const existing = await teacherGroupManagementCapability(ctx, args.userId)
    const now = Date.now()
    if (existing) {
      await ctx.db.patch(existing._id as any, {
        enabled: args.enabled,
        updatedAt: now,
        changedByUserId: administrator._id,
      })
    } else {
      await ctx.db.insert("accountCapabilities", {
        userId: args.userId,
        capability: args.capability,
        enabled: args.enabled,
        grantedAt: now,
        updatedAt: now,
        changedByUserId: administrator._id,
      })
    }

    return { userId: String(args.userId), capability: args.capability, enabled: args.enabled }
  },
})

/**
 * Standalone, manually triggered backfill for teacher accounts that existed
 * before Coffee Talk profiles were automatically provisioned. It is safe to
 * rerun: existing teacher bindings are retained without reopening an opted-out
 * profile, and conflicting legacy bindings are reported rather than replaced.
 */
export const syncExistingTeacherCoffeeTalkProfiles = mutationGeneric({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireSuperAdminBySession(ctx, args.sessionToken)
    const users = await ctx.db.query("users").collect()
    const now = Date.now()
    let created = 0
    let skipped = 0
    let conflicts = 0

    for (const user of users) {
      if (user.identityType !== "teacher") continue
      try {
        const result = await ensureTeacherGroupManagement(ctx, {
          userId: user._id,
          user,
          now,
        })
        if (result.profileCreated || result.capabilityCreated || result.groupCreated) created += 1
        else skipped += 1
      } catch (error) {
        if (error instanceof Error && error.message.includes("非教师目录档案")) {
          conflicts += 1
          continue
        }
        throw error
      }
    }

    return { created, skipped, conflicts }
  },
})
