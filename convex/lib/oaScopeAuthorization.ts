import { resolveUserIdentityType } from "./userIdentity"
import { teacherResearchGroupNameZh } from "./researchGroupPublications"

export const SCOPE_OPTION_LIMIT = 20
export const ACCOUNT_SEARCH_SCAN_LIMIT = 500
const MANAGE_RESEARCH_GROUP_MEMBERS = "manage_research_group_members"

export type OAScopePurpose = "form_audience" | "workflow_approver" | "notification"
type OAScopeIdentityType = "undergrad" | "graduate" | "teacher" | "other"
type OAScopeRole = "member" | "admin" | "super_admin"

export type OAScopeLike = {
  identityTypes?: readonly unknown[]
  roles?: readonly unknown[]
  userIds?: readonly unknown[]
  researchGroupIds?: readonly unknown[]
  userGroupIds?: readonly unknown[]
}

export type ManageableScopeOption =
  | { kind: "identity"; value: OAScopeIdentityType; label: string }
  | { kind: "researchGroup"; value: string; label: string; meta?: string }
  | { kind: "userGroup"; value: string; label: string; meta?: string }
  | { kind: "user"; value: string; label: string; meta: string; identityType: string }

export const DEFAULT_IDENTITY_SCOPE_OPTIONS: ManageableScopeOption[] = [
  { kind: "identity", value: "undergrad", label: "本科生" },
  { kind: "identity", value: "graduate", label: "研究生" },
  { kind: "identity", value: "teacher", label: "教师" },
  { kind: "identity", value: "other", label: "其他成员" },
]

export function isEnabledScopeAccount(user: any): boolean {
  return Boolean(user) && user.accountStatus !== "disabled"
}

export function limitManageableScopeOptions(
  options: readonly ManageableScopeOption[],
  selectedKeys: ReadonlySet<string>,
  limit = SCOPE_OPTION_LIMIT,
): ManageableScopeOption[] {
  const selected: ManageableScopeOption[] = []
  const unselected: ManageableScopeOption[] = []
  for (const option of options) {
    const target = selectedKeys.has(`${option.kind}:${option.value}`) ? selected : unselected
    target.push(option)
  }
  return [...selected, ...unselected.slice(0, Math.max(0, limit - selected.length))]
}

type ScopePurposePolicy = {
  allowedIdentityTypes: ReadonlySet<OAScopeIdentityType>
  allowedRoles: ReadonlySet<OAScopeRole>
}

const ALL_IDENTITY_TYPES: readonly OAScopeIdentityType[] = [
  "undergrad",
  "graduate",
  "teacher",
  "other",
]
const OA_WORKFLOW_ROLES: readonly OAScopeRole[] = ["member", "admin", "super_admin"]

/**
 * Keep selector search and save-time authorization on one explicit policy.
 * The sets are intentionally declared per purpose even while their current
 * values match, so a future narrowing cannot silently affect another use.
 */
export const SCOPE_PURPOSE_POLICIES: Record<OAScopePurpose, ScopePurposePolicy> = {
  form_audience: {
    allowedIdentityTypes: new Set(ALL_IDENTITY_TYPES),
    allowedRoles: new Set(OA_WORKFLOW_ROLES),
  },
  workflow_approver: {
    allowedIdentityTypes: new Set(ALL_IDENTITY_TYPES),
    allowedRoles: new Set(OA_WORKFLOW_ROLES),
  },
  notification: {
    allowedIdentityTypes: new Set(ALL_IDENTITY_TYPES),
    allowedRoles: new Set(OA_WORKFLOW_ROLES),
  },
}

type ActorAuthorization = {
  canUseAll: boolean
  researchGroupIds: Set<string>
  userGroupIds: Set<string>
  userIds: Set<string>
}

function restrictedActorAuthorization(actor: any): ActorAuthorization {
  return {
    canUseAll: false,
    researchGroupIds: new Set(),
    userGroupIds: new Set(),
    userIds: new Set<string>([String(actor._id)]),
  }
}

function assertScopeSelectorsAllowedForPurpose(
  scope: OAScopeLike,
  purpose: OAScopePurpose,
) {
  const policy = SCOPE_PURPOSE_POLICIES[purpose]
  for (const value of scope.identityTypes || []) {
    if (!policy.allowedIdentityTypes.has(String(value) as OAScopeIdentityType)) {
      throw new Error(`此范围用途不支持成员资格“${String(value)}”`)
    }
  }
  for (const value of scope.roles || []) {
    if (!policy.allowedRoles.has(String(value) as OAScopeRole)) {
      throw new Error(`此范围用途不支持账号角色“${String(value)}”`)
    }
  }
}

function normalizedSearch(value?: string) {
  return String(value || "").trim().toLocaleLowerCase().slice(0, 80)
}

function includesSearch(query: string, ...values: Array<string | undefined>) {
  if (!query) return true
  return values.some((value) => String(value || "").toLocaleLowerCase().includes(query))
}

function userLabel(user: any) {
  return user.chineseName?.trim() || user.englishName?.trim() || user.username
}

export function researchGroupScopeLabel(leaderName: string | undefined, fallback: string) {
  // Canonical product label: “<姓名>老师的课题组”.
  const normalizedLeader = String(leaderName || "").trim()
  return normalizedLeader ? teacherResearchGroupNameZh(normalizedLeader) : fallback
}

/**
 * Resolves a persisted workflow scope to submitter-safe display labels.
 * It intentionally describes the selectors themselves instead of expanding
 * groups into their members, and never returns routing IDs.
 */
export async function describeOAWorkflowScope(ctx: any, scope?: OAScopeLike): Promise<string[]> {
  if (!scope) return []
  const labels: string[] = []
  const identityLabels = new Map(DEFAULT_IDENTITY_SCOPE_OPTIONS.map((option) => [option.value, option.label]))
  const roleLabels: Record<string, string> = {
    member: "普通用户",
    admin: "管理员",
    super_admin: "超级管理员",
  }

  for (const identity of scope.identityTypes || []) {
    labels.push(identityLabels.get(String(identity) as OAScopeIdentityType) || "其他成员")
  }
  for (const role of scope.roles || []) {
    labels.push(roleLabels[String(role)] || "账号角色")
  }
  for (const groupId of scope.researchGroupIds || []) {
    const group = await ctx.db.get(groupId)
    if (!group) {
      labels.push("课题组（已移除）")
      continue
    }
    const leader = await ctx.db.get(group.leaderPersonId)
    labels.push(researchGroupScopeLabel(
      leader?.nameZh || leader?.nameEn,
      group.nameZh || group.nameEn || "课题组",
    ))
  }
  for (const groupId of scope.userGroupIds || []) {
    const group = await ctx.db.get(groupId)
    labels.push(group?.name || "用户组（已移除）")
  }
  for (const userId of scope.userIds || []) {
    const user = await ctx.db.get(userId)
    labels.push(user ? userLabel(user) : "账号（已停用）")
  }

  return [...new Set(labels.length > 0 ? labels : ["所有人"])]
}

async function getTeacherAuthorization(ctx: any, actor: any): Promise<ActorAuthorization> {
  const capability = await ctx.db
    .query("accountCapabilities")
    .withIndex("by_user_capability", (index: any) => (
      index.eq("userId", actor._id).eq("capability", MANAGE_RESEARCH_GROUP_MEMBERS)
    ))
    .first()
  if (capability?.enabled !== true) {
    return restrictedActorAuthorization(actor)
  }

  const people = await ctx.db
    .query("institutePeople")
    .withIndex("by_accountUserId", (index: any) => index.eq("accountUserId", actor._id))
    .collect()
  const ledGroups = []
  for (const person of people.filter((candidate: any) => candidate.kind === "teacher")) {
    ledGroups.push(...await ctx.db
      .query("researchGroups")
      .withIndex("by_leaderPersonId", (index: any) => index.eq("leaderPersonId", person._id))
      .collect())
  }

  // There is currently no separate custom-group manager relation. The
  // conservative rule is therefore ownership: teachers may use only groups
  // they created; super administrators retain access to every group.
  const ownedUserGroups = (await ctx.db.query("userGroups").collect())
    .filter((group: any) => String(group.createdByUserId) === String(actor._id))
  const researchGroupIds = new Set<string>(ledGroups.map((group: any) => String(group._id)))
  const userGroupIds = new Set<string>(ownedUserGroups.map((group: any) => String(group._id)))
  const userIds = new Set<string>([String(actor._id)])

  for (const group of ledGroups) {
    const assignments = await ctx.db
      .query("studentResearchGroupAssignments")
      .withIndex("by_researchGroupId", (index: any) => index.eq("researchGroupId", group._id))
      .collect()
    assignments.forEach((assignment: any) => userIds.add(String(assignment.studentUserId)))

    const memberships = await ctx.db
      .query("researchGroupMemberships")
      .withIndex("by_group_order", (index: any) => index.eq("researchGroupId", group._id))
      .collect()
    for (const membership of memberships) {
      if (membership.endedAt !== undefined) continue
      const person = await ctx.db.get(membership.personId)
      if (person?.accountUserId) userIds.add(String(person.accountUserId))
    }
  }

  for (const group of ownedUserGroups) {
    const memberships = await ctx.db
      .query("userGroupMemberships")
      .withIndex("by_groupId", (index: any) => index.eq("groupId", group._id))
      .collect()
    memberships.forEach((membership: any) => userIds.add(String(membership.userId)))
  }

  return { canUseAll: false, researchGroupIds, userGroupIds, userIds }
}

async function getActorAuthorization(ctx: any, actor: any): Promise<ActorAuthorization> {
  if (actor.role === "super_admin") {
    return {
      canUseAll: true,
      researchGroupIds: new Set(),
      userGroupIds: new Set(),
      userIds: new Set(),
    }
  }
  if (resolveUserIdentityType(actor) !== "teacher") {
    return restrictedActorAuthorization(actor)
  }
  return getTeacherAuthorization(ctx, actor)
}

export async function searchManageableScopeOptions(
  ctx: any,
  actor: any,
  input: { purpose: OAScopePurpose; query?: string; selectedScope?: OAScopeLike },
): Promise<ManageableScopeOption[]> {
  const policy = SCOPE_PURPOSE_POLICIES[input.purpose]
  const query = normalizedSearch(input.query)
  const authorization = await getActorAuthorization(ctx, actor)
  const options: ManageableScopeOption[] = DEFAULT_IDENTITY_SCOPE_OPTIONS
    .filter((option) => option.kind !== "identity" || policy.allowedIdentityTypes.has(option.value))
    .filter((option) => includesSearch(query, option.label, option.value))

  const allResearchGroups = authorization.canUseAll
    ? await ctx.db.query("researchGroups").collect()
    : await Promise.all(Array.from(authorization.researchGroupIds).map((id) => ctx.db.get(id)))
  for (const group of allResearchGroups.filter(Boolean)) {
    const leader = await ctx.db.get(group.leaderPersonId)
    const leaderName = leader?.nameZh || leader?.nameEn
    const label = researchGroupScopeLabel(leaderName, group.nameZh || group.nameEn)
    if (includesSearch(query, label, group.nameZh, group.nameEn)) {
      options.push({
        kind: "researchGroup",
        value: String(group._id),
        label,
        ...(leaderName ? { meta: group.nameZh || group.nameEn } : {}),
      })
    }
  }

  const allUserGroups = authorization.canUseAll
    ? await ctx.db.query("userGroups").collect()
    : await Promise.all(Array.from(authorization.userGroupIds).map((id) => ctx.db.get(id)))
  for (const group of allUserGroups.filter(Boolean)) {
    if (!includesSearch(query, group.name, group.description)) continue
    const memberships = await ctx.db
      .query("userGroupMemberships")
      .withIndex("by_groupId", (index: any) => index.eq("groupId", group._id))
      .collect()
    const activeMemberCount = (await Promise.all(
      memberships.map((membership: any) => ctx.db.get(membership.userId)),
    )).filter(isEnabledScopeAccount).length
    options.push({
      kind: "userGroup",
      value: String(group._id),
      label: group.name,
      meta: `${activeMemberCount} 人`,
    })
  }

  // Never expose an unbounded account directory. Convex currently has no
  // compound full-text index across username and both display-name fields, so
  // search scans a hard-capped window and then returns a smaller hard cap.
  const accountCandidates = authorization.canUseAll
    ? await ctx.db.query("users").take(ACCOUNT_SEARCH_SCAN_LIMIT)
    : (await Promise.all(Array.from(authorization.userIds).map((id) => ctx.db.get(id))))
      .filter(Boolean)
  const accounts = accountCandidates
    .filter((user: any) => authorization.canUseAll || authorization.userIds.has(String(user._id)))
    .filter(isEnabledScopeAccount)
    .filter((user: any) => includesSearch(query, user.username, user.chineseName, user.englishName))
    .sort((left: any, right: any) => userLabel(left).localeCompare(userLabel(right), "zh-CN"))
    .slice(0, SCOPE_OPTION_LIMIT)
  if (input.selectedScope?.userIds?.length) {
    for (const rawId of input.selectedScope.userIds) {
      const id = rawId as any
      if (!authorization.canUseAll && !authorization.userIds.has(String(id))) continue
      const user = await ctx.db.get(id)
      if (!isEnabledScopeAccount(user) || accounts.some((candidate: any) => String(candidate._id) === String(id))) continue
      if (includesSearch(query, user.username, user.chineseName, user.englishName)) accounts.push(user)
    }
  }
  options.push(...accounts.map((user: any) => ({
    kind: "user" as const,
    value: String(user._id),
    label: userLabel(user),
    meta: user.username,
    identityType: resolveUserIdentityType(user),
  })))

  const selectedKeys = new Set([
    ...(input.selectedScope?.identityTypes || []).map((value) => `identity:${String(value)}`),
    ...(input.selectedScope?.researchGroupIds || []).map((value) => `researchGroup:${String(value)}`),
    ...(input.selectedScope?.userGroupIds || []).map((value) => `userGroup:${String(value)}`),
    ...(input.selectedScope?.userIds || []).map((value) => `user:${String(value)}`),
  ])
  return limitManageableScopeOptions(options, selectedKeys)
}

export async function assertActorCanUseScope(
  ctx: any,
  actor: any,
  scope?: OAScopeLike | null,
  purpose: OAScopePurpose = "form_audience",
) {
  if (!scope) return
  assertScopeSelectorsAllowedForPurpose(scope, purpose)
  const authorization = await getActorAuthorization(ctx, actor)
  for (const [ids, table, allowed, label] of [
    [scope.userIds, "users", authorization.userIds, "账号"],
    [scope.researchGroupIds, "researchGroups", authorization.researchGroupIds, "课题组"],
    [scope.userGroupIds, "userGroups", authorization.userGroupIds, "用户组"],
  ] as const) {
    for (const rawId of ids || []) {
      const id = rawId as any
      const record = await ctx.db.get(id)
      if (!record) throw new Error(`${label}不存在或已被删除`)
      if (table === "users" && !isEnabledScopeAccount(record)) {
        throw new Error("目标账号不可用")
      }
      if (!authorization.canUseAll && !allowed.has(String(id))) {
        throw new Error(`无权将该${label}用于此范围`)
      }
    }
  }
}
