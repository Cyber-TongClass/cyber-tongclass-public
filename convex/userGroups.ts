import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { getUserBySession, requireSuperAdminBySession } from "./reviewer/lib"
import { resolveUserIdentityType } from "./lib/userIdentity"
import {
  isEnabledScopeAccount,
  searchManageableScopeOptions,
} from "./lib/oaScopeAuthorization"

type StoredUserGroup = {
  _id: Id<"userGroups">
  name: string
  description?: string
  createdByUserId: Id<"users">
  createdAt: number
  updatedAt: number
}

type StoredUserGroupMembership = {
  _id: Id<"userGroupMemberships">
  groupId: Id<"userGroups">
  userId: Id<"users">
  addedByUserId: Id<"users">
  createdAt: number
}

function describeUser(user: any) {
  return {
    id: String(user._id),
    username: user.username,
    name: user.chineseName?.trim() || user.englishName?.trim() || user.username,
    identityType: resolveUserIdentityType(user),
  }
}

function comparePeople(left: { name: string; username: string }, right: { name: string; username: string }) {
  return left.name.localeCompare(right.name, "zh-CN") || left.username.localeCompare(right.username)
}

async function requireGroup(ctx: any, groupId: Id<"userGroups">) {
  const group = await ctx.db.get(groupId) as StoredUserGroup | null
  if (!group) throw new Error("未找到该用户组")
  return group
}

function scopeReferencesUserGroup(scope: any, groupId: Id<"userGroups">) {
  return Array.isArray(scope?.userGroupIds)
    && scope.userGroupIds.some((candidate: unknown) => String(candidate) === String(groupId))
}

function workflowReferencesUserGroup(workflow: any, groupId: Id<"userGroups">) {
  return Array.isArray(workflow?.nodes)
    && workflow.nodes.some((node: any) => scopeReferencesUserGroup(node?.scope, groupId))
}

async function assertUserGroupIsUnreferenced(ctx: any, groupId: Id<"userGroups">) {
  const forms = await ctx.db.query("oaForms").collect()
  if (forms.some((form: any) => (
    scopeReferencesUserGroup(form.targetScope, groupId)
    || form.approvalSteps?.some((step: any) => scopeReferencesUserGroup(step.scope, groupId))
    || workflowReferencesUserGroup(form.workflowDefinition, groupId)
  ))) {
    throw new Error("该用户组正在被 OA 表单或审批流程使用，不能删除")
  }

  const submissions = await ctx.db.query("oaFormSubmissions").collect()
  if (submissions.some((submission: any) => (
    (
      submission.workflowStatus === "pending"
      || submission.workflowStatus === "needs_changes"
      || (submission.workflowStatus === undefined && submission.reviewStatus === "pending")
    )
    && (
      submission.approvalStepsSnapshot?.some((step: any) => scopeReferencesUserGroup(step.scope, groupId))
      || workflowReferencesUserGroup(submission.workflowDefinitionSnapshot, groupId)
    )
  ))) {
    throw new Error("该用户组正在被进行中的 OA 审批引用，不能删除")
  }

  const contentRows = [
    ...await ctx.db.query("contentSubmissions").collect(),
    ...await ctx.db.query("news").collect(),
    ...await ctx.db.query("events").collect(),
  ]
  if (contentRows.some((row: any) => scopeReferencesUserGroup(row.targetScope, groupId))) {
    throw new Error("该用户组正在被新闻或活动可见范围使用，不能删除")
  }
}

/**
 * Super-admin organization overview: every user group with its members, plus
 * the flat account list used to add members. Only directory-level fields
 * (name, username, identity type) leave the server.
 */
export const listUserGroups = queryGeneric({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireSuperAdminBySession(ctx, args.sessionToken)
    const [groups, memberships, usersRaw] = await Promise.all([
      ctx.db.query("userGroups").collect() as Promise<StoredUserGroup[]>,
      ctx.db.query("userGroupMemberships").collect() as Promise<StoredUserGroupMembership[]>,
      ctx.db.query("users").collect(),
    ])
    const users = usersRaw.filter(isEnabledScopeAccount)
    const userById = new Map(users.map((user: any) => [String(user._id), user]))

    return {
      groups: groups
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))
        .map((group) => ({
          id: String(group._id),
          name: group.name,
          description: group.description ?? "",
          members: memberships
            .filter((membership) => String(membership.groupId) === String(group._id))
            .map((membership) => userById.get(String(membership.userId)))
            .filter((user): user is NonNullable<typeof user> => Boolean(user))
            .map(describeUser)
            .sort(comparePeople),
        })),
      users: users.map(describeUser).sort(comparePeople),
    }
  },
})

/**
 * Scope options for form visibility and approval routing. Any signed-in
 * account may see group names and sizes — never the membership itself.
 */
export const listUserGroupScopeOptions = queryGeneric({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const options = await searchManageableScopeOptions(ctx, actor, {
      purpose: "form_audience",
    })
    return options
      .filter((option) => option.kind === "userGroup")
      .map((option) => ({
        id: option.value,
        name: option.label,
        memberCount: Number.parseInt(option.meta || "0", 10) || 0,
      }))
  },
})

/**
 * Account pick list for adding individuals to a scope. Any signed-in account
 * (including teachers building forms) may search directory-level fields —
 * name, username and identity type only.
 */
export const listUserPickOptions = queryGeneric({
  args: { sessionToken: v.string(), query: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const options = await searchManageableScopeOptions(ctx, actor, {
      purpose: "form_audience",
      query: args.query,
    })
    return options
      .filter((option) => option.kind === "user")
      .map((option) => ({
        id: option.value,
        username: option.meta,
        name: option.label,
        identityType: option.identityType,
      }))
  },
})

export const createUserGroup = mutationGeneric({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdminBySession(ctx, args.sessionToken)
    const name = args.name.trim()
    if (!name) throw new Error("用户组名称不能为空")
    const duplicate = (await ctx.db.query("userGroups").collect() as StoredUserGroup[])
      .some((group) => group.name === name)
    if (duplicate) throw new Error("已存在同名用户组")

    const now = Date.now()
    const groupId = await ctx.db.insert("userGroups", {
      name,
      description: args.description?.trim() || undefined,
      createdByUserId: admin._id,
      createdAt: now,
      updatedAt: now,
    })
    return String(groupId)
  },
})

export const updateUserGroup = mutationGeneric({
  args: {
    sessionToken: v.string(),
    groupId: v.id("userGroups"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminBySession(ctx, args.sessionToken)
    await requireGroup(ctx, args.groupId)
    const name = args.name.trim()
    if (!name) throw new Error("用户组名称不能为空")
    const duplicate = (await ctx.db.query("userGroups").collect() as StoredUserGroup[])
      .some((group) => group.name === name && String(group._id) !== String(args.groupId))
    if (duplicate) throw new Error("已存在同名用户组")

    await ctx.db.patch(args.groupId, {
      name,
      description: args.description?.trim() || undefined,
      updatedAt: Date.now(),
    })
  },
})

export const deleteUserGroup = mutationGeneric({
  args: { sessionToken: v.string(), groupId: v.id("userGroups") },
  handler: async (ctx, args) => {
    await requireSuperAdminBySession(ctx, args.sessionToken)
    await requireGroup(ctx, args.groupId)
    await assertUserGroupIsUnreferenced(ctx, args.groupId)
    const memberships = await ctx.db
      .query("userGroupMemberships")
      .withIndex("by_groupId", (index: any) => index.eq("groupId", args.groupId))
      .collect() as StoredUserGroupMembership[]
    for (const membership of memberships) {
      await ctx.db.delete(membership._id)
    }
    await ctx.db.delete(args.groupId)
  },
})

export const addUserGroupMember = mutationGeneric({
  args: {
    sessionToken: v.string(),
    groupId: v.id("userGroups"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdminBySession(ctx, args.sessionToken)
    await requireGroup(ctx, args.groupId)
    const user = await ctx.db.get(args.userId)
    if (!isEnabledScopeAccount(user)) throw new Error("目标账号不可用")

    const existing = await ctx.db
      .query("userGroupMemberships")
      .withIndex("by_group_user", (index: any) => index.eq("groupId", args.groupId).eq("userId", args.userId))
      .first()
    if (existing) return

    await ctx.db.insert("userGroupMemberships", {
      groupId: args.groupId,
      userId: args.userId,
      addedByUserId: admin._id,
      createdAt: Date.now(),
    })
  },
})

export const removeUserGroupMember = mutationGeneric({
  args: {
    sessionToken: v.string(),
    groupId: v.id("userGroups"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminBySession(ctx, args.sessionToken)
    const existing = await ctx.db
      .query("userGroupMemberships")
      .withIndex("by_group_user", (index: any) => index.eq("groupId", args.groupId).eq("userId", args.userId))
      .first() as StoredUserGroupMembership | null
    if (existing) await ctx.db.delete(existing._id)
  },
})

/**
 * Resolves a set of user-group IDs to member account IDs. Shared by OA scope
 * resolution so visibility and approval routing treat groups identically.
 */
export async function resolveUserGroupMemberIds(ctx: any, groupIds: readonly Id<"userGroups">[]) {
  const memberIds = new Set<string>()
  for (const groupId of groupIds) {
    const memberships = await ctx.db
      .query("userGroupMemberships")
      .withIndex("by_groupId", (index: any) => index.eq("groupId", groupId))
      .collect() as StoredUserGroupMembership[]
    for (const membership of memberships) {
      memberIds.add(String(membership.userId))
    }
  }
  return memberIds
}
