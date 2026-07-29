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

const DEFAULT_PUBLIC_LIMIT = 48
const MAX_PUBLIC_LIMIT = 500
const MANAGE_RESEARCH_GROUP_MEMBERS = "manage_research_group_members"

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

function isStudentAccount(user: any) {
  const identityType = resolveUserIdentityType(user)
  return identityType === "undergrad" || identityType === "graduate"
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
    nameZh: `${input.user.chineseName?.trim() || input.user.englishName.trim()}课题组`,
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

async function requireTeacherGroupManagement(ctx: any, sessionToken?: string | null) {
  const teacher = await getUserBySession(ctx, sessionToken)
  if (resolveUserIdentityType(teacher) !== "teacher") {
    throw new Error("只有教师账号可以管理课题组成员")
  }
  if (!await canManageTeacherGroupMembers(ctx, teacher._id)) {
    throw new Error("课题组成员管理权限已被超级管理员关闭")
  }
  return teacher
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

/** Super-admin-only labels for OA audience and approval scope selection. */
export const listResearchGroupScopeOptions = queryGeneric({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireSuperAdminBySession(ctx, args.sessionToken)
    const groups = await ctx.db.query("researchGroups").collect() as StoredResearchGroup[]
    return sortResearchGroups(groups).map((group) => ({ id: String(group._id), name: group.nameZh || group.nameEn }))
  },
})

/** Private roster for groups explicitly led by the signed-in teacher. */
export const listTeacherGroupRoster = queryGeneric({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const teacher = await getUserBySession(ctx, args.sessionToken)
    const canManage = resolveUserIdentityType(teacher) === "teacher"
      && await canManageTeacherGroupMembers(ctx, teacher._id)
    if (!canManage) {
      return { groups: [], students: [], canManage: false }
    }
    const groups = await teacherLedResearchGroups(ctx, teacher._id)
    const assignments = await ctx.db.query("studentResearchGroupAssignments").collect() as StoredStudentResearchGroupAssignment[]
    const users = await ctx.db.query("users").collect()

    const students = users
      .filter(isStudentAccount)
      .map((student: any) => {
        const assignment = assignments.find((item) => String(item.studentUserId) === String(student._id))
        return {
          id: String(student._id),
          username: student.username,
          name: student.chineseName || student.englishName || student.username,
          identityType: resolveUserIdentityType(student),
          ...(assignment ? { researchGroupId: String(assignment.researchGroupId) } : {}),
        }
      })
      .sort((left, right) => compareText(left.name, right.name) || compareText(left.username, right.username))

    return {
      groups: groups.map((group) => ({ id: String(group._id), slug: group.slug, name: group.nameZh || group.nameEn })),
      students,
      canManage: true,
    }
  },
})

/** Assigns a student to one teacher-led group, replacing any previous assignment. */
export const assignTeacherGroupStudent = mutationGeneric({
  args: {
    sessionToken: v.string(),
    researchGroupId: v.id("researchGroups"),
    studentUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacherGroupManagement(ctx, args.sessionToken)
    const groups = await teacherLedResearchGroups(ctx, teacher._id)
    if (!groups.some((group) => String(group._id) === String(args.researchGroupId))) {
      throw new Error("只能管理由当前教师负责的课题组")
    }
    const student = await ctx.db.get(args.studentUserId)
    if (!student || !isStudentAccount(student)) throw new Error("只能选择学生账号")

    const now = Date.now()
    const existing = await ctx.db
      .query("studentResearchGroupAssignments")
      .withIndex("by_studentUserId", (index: any) => index.eq("studentUserId", args.studentUserId))
      .first() as StoredStudentResearchGroupAssignment | null

    if (existing) {
      await ctx.db.patch(existing._id as any, {
        researchGroupId: args.researchGroupId,
        assignedByUserId: teacher._id,
        updatedAt: now,
      })
    } else {
      await ctx.db.insert("studentResearchGroupAssignments", {
        studentUserId: args.studentUserId,
        researchGroupId: args.researchGroupId,
        assignedByUserId: teacher._id,
        assignedAt: now,
        updatedAt: now,
      })
    }
  },
})

/** Removes a student only from a group led by the signed-in teacher. */
export const removeTeacherGroupStudent = mutationGeneric({
  args: { sessionToken: v.string(), studentUserId: v.id("users") },
  handler: async (ctx, args) => {
    const teacher = await requireTeacherGroupManagement(ctx, args.sessionToken)
    const assignment = await ctx.db
      .query("studentResearchGroupAssignments")
      .withIndex("by_studentUserId", (index: any) => index.eq("studentUserId", args.studentUserId))
      .first() as StoredStudentResearchGroupAssignment | null
    if (!assignment) return

    const groups = await teacherLedResearchGroups(ctx, teacher._id)
    if (!groups.some((group) => String(group._id) === String(assignment.researchGroupId))) {
      throw new Error("只能移除自己课题组中的学生")
    }
    await ctx.db.delete(assignment._id as any)
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
