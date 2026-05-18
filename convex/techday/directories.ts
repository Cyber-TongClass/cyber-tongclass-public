import { mutation, query } from "../_generated/server"
import { v } from "convex/values"
import {
  SETTINGS_KEY,
  ensureUnique,
  getOrCreateSettings,
  normalizeText,
  requireAdmin,
  resolvePrincipal,
} from "./lib"

const actorArgs = {
  mainSessionToken: v.optional(v.string()),
  techDaySessionToken: v.optional(v.string()),
}

export const listOrganizations = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("techDayOrganizations").order("asc").collect()
  },
})

export const listDirections = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("techDayDirections").order("asc").collect()
  },
})

export const listRoleTemplates = query({
  args: actorArgs,
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    return await ctx.db.query("techDayRoleTemplates").order("asc").collect()
  },
})

export const createOrganization = mutation({
  args: { ...actorArgs, name: v.string(), responsibility: v.string() },
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const name = normalizeText(args.name)
    if (!name) throw new Error("组织名称不能为空")
    await ensureUnique(ctx, "techDayOrganizations", "by_name", "name", name, "组织名称已存在")
    const now = Date.now()
    return await ctx.db.insert("techDayOrganizations", {
      name,
      responsibility: normalizeText(args.responsibility),
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateOrganization = mutation({
  args: { ...actorArgs, id: v.id("techDayOrganizations"), name: v.string(), responsibility: v.string() },
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const org = await ctx.db.get(args.id)
    if (!org) throw new Error("组织不存在")
    const name = normalizeText(args.name)
    if (!name) throw new Error("组织名称不能为空")
    await ensureUnique(ctx, "techDayOrganizations", "by_name", "name", name, "组织名称已存在", String(args.id))
    const oldName = org.name
    await ctx.db.patch(args.id, {
      name,
      responsibility: normalizeText(args.responsibility),
      updatedAt: Date.now(),
    })
    if (oldName !== name) {
      const users = await ctx.db.query("techDayUsers").collect()
      await Promise.all(users.map(async (user) => {
        if (!user.assignedTracks?.includes(oldName)) return
        await ctx.db.patch(user._id, {
          assignedTracks: user.assignedTracks.map((track) => track === oldName ? name : track),
          updatedAt: Date.now(),
        })
      }))
      const reimbursements = await ctx.db
        .query("techDayReimbursements")
        .withIndex("by_organization_createdAt", (q) => q.eq("organization", oldName))
        .collect()
      await Promise.all(reimbursements.map((reimbursement) => ctx.db.patch(reimbursement._id, {
        organization: name,
        updatedAt: Date.now(),
      })))
    }
    return args.id
  },
})

export const createDirection = mutation({
  args: { ...actorArgs, name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const name = normalizeText(args.name)
    if (!name) throw new Error("方向名称不能为空")
    await ensureUnique(ctx, "techDayDirections", "by_name", "name", name, "方向名称已存在")
    const now = Date.now()
    return await ctx.db.insert("techDayDirections", {
      name,
      description: args.description ? normalizeText(args.description) : undefined,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateDirection = mutation({
  args: { ...actorArgs, id: v.id("techDayDirections"), name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const direction = await ctx.db.get(args.id)
    if (!direction) throw new Error("方向不存在")
    const name = normalizeText(args.name)
    if (!name) throw new Error("方向名称不能为空")
    await ensureUnique(ctx, "techDayDirections", "by_name", "name", name, "方向名称已存在", String(args.id))
    await ctx.db.patch(args.id, {
      name,
      description: args.description ? normalizeText(args.description) : undefined,
      updatedAt: Date.now(),
    })
    return args.id
  },
})

export const deleteDirection = mutation({
  args: { ...actorArgs, id: v.id("techDayDirections") },
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const inUse = await ctx.db
      .query("techDaySubmissions")
      .filter((q) => q.eq(q.field("directionId"), args.id))
      .first()
    if (inUse) throw new Error("方向下仍有投稿，无法删除")
    const reviewer = await ctx.db
      .query("techDayUsers")
      .withIndex("by_reviewerDirection", (q) => q.eq("reviewerDirectionId", args.id))
      .first()
    if (reviewer) throw new Error("方向仍分配给审阅者，无法删除")
    const reviewerInvite = await ctx.db
      .query("techDayReviewerInvites")
      .withIndex("by_reviewerDirection", (q) => q.eq("reviewerDirectionId", args.id))
      .first()
    if (reviewerInvite) throw new Error("方向已被审阅者邀请码使用，无法删除")
    const presetInvite = await ctx.db
      .query("techDayReviewerInvites")
      .withIndex("by_presetDirection", (q) => q.eq("presetDirectionId", args.id))
      .first()
    if (presetInvite) throw new Error("方向已被审阅者邀请码预设，无法删除")
    await ctx.db.delete(args.id)
    return args.id
  },
})

export const deleteOrganization = mutation({
  args: { ...actorArgs, id: v.id("techDayOrganizations") },
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const organization = await ctx.db.get(args.id)
    if (!organization) throw new Error("组织不存在")
    const directUser = await ctx.db
      .query("techDayUsers")
      .filter((q) => q.eq(q.field("organizationId"), args.id))
      .first()
    if (directUser) throw new Error("组织仍分配给用户，无法删除")
    const assignedUser = await ctx.db
      .query("techDayUsers")
      .collect()
      .then((users) => users.find((user) => user.assignedTracks?.includes(organization.name)))
    if (assignedUser) throw new Error("组织仍分配给用户，无法删除")
    const reimbursement = await ctx.db
      .query("techDayReimbursements")
      .withIndex("by_organization_createdAt", (q) => q.eq("organization", organization.name))
      .first()
    if (reimbursement) throw new Error("组织下仍有报销记录，无法删除")
    await ctx.db.delete(args.id)
    return args.id
  },
})

export const createRoleTemplate = mutation({
  args: { ...actorArgs, name: v.string(), canEditVoteData: v.boolean() },
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const name = normalizeText(args.name)
    if (!name) throw new Error("角色模板名称不能为空")
    await ensureUnique(ctx, "techDayRoleTemplates", "by_name", "name", name, "角色模板已存在")
    const now = Date.now()
    return await ctx.db.insert("techDayRoleTemplates", {
      name,
      canEditVoteData: args.canEditVoteData,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateRoleTemplate = mutation({
  args: { ...actorArgs, id: v.id("techDayRoleTemplates"), name: v.string(), canEditVoteData: v.boolean() },
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const template = await ctx.db.get(args.id)
    if (!template) throw new Error("角色模板不存在")
    const name = normalizeText(args.name)
    if (!name) throw new Error("角色模板名称不能为空")
    await ensureUnique(ctx, "techDayRoleTemplates", "by_name", "name", name, "角色模板已存在", String(args.id))
    await ctx.db.patch(args.id, {
      name,
      canEditVoteData: args.canEditVoteData,
      updatedAt: Date.now(),
    })
    return args.id
  },
})

export const deleteRoleTemplate = mutation({
  args: { ...actorArgs, id: v.id("techDayRoleTemplates") },
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const inUse = await ctx.db
      .query("techDayUsers")
      .withIndex("by_roleTemplate", (q) => q.eq("roleTemplateId", args.id))
      .first()
    if (inUse) throw new Error("角色模板仍分配给用户，无法删除")
    const settings = await ctx.db
      .query("techDaySettings")
      .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
      .first()
    if (settings?.voteEditRoleTemplateId === args.id) {
      throw new Error("角色模板正在用于计票设置，无法删除")
    }
    await ctx.db.delete(args.id)
    return args.id
  },
})

export const getSettings = query({
  args: actorArgs,
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    return await ctx.db
      .query("techDaySettings")
      .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
      .first()
  },
})

export const updateSettings = mutation({
  args: {
    ...actorArgs,
    showVoteData: v.boolean(),
    voteSortEnabled: v.boolean(),
    voteEditRoleTemplateId: v.optional(v.union(v.id("techDayRoleTemplates"), v.null())),
    visibleAwardIds: v.optional(v.union(v.array(v.id("techDayAwards")), v.null())),
  },
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const settings = await getOrCreateSettings(ctx)
    if (!settings) throw new Error("无法创建 TechDay 设置")
    await ctx.db.patch(settings._id, {
      showVoteData: args.showVoteData,
      voteSortEnabled: args.voteSortEnabled,
      voteEditRoleTemplateId: args.voteEditRoleTemplateId || undefined,
      visibleAwardIds: args.visibleAwardIds || undefined,
      updatedAt: Date.now(),
    })
    return await ctx.db.get(settings._id)
  },
})
