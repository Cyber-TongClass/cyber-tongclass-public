import { mutation, query } from "../_generated/server"
import { v } from "convex/values"
import {
  normalizeCode,
  normalizeStringList,
  normalizeText,
  requireAdmin,
  requireSuperAdmin,
  resolvePrincipal,
  serializeTechDayUser,
  techDayRoleValidator,
} from "./lib"

const actorArgs = {
  mainSessionToken: v.optional(v.string()),
  techDaySessionToken: v.optional(v.string()),
}

export const listUsers = query({
  args: actorArgs,
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const users = await ctx.db.query("techDayUsers").order("asc").collect()
    return await Promise.all(users.map((user) => serializeTechDayUser(ctx, user)))
  },
})

export const updateUser = mutation({
  args: {
    ...actorArgs,
    id: v.id("techDayUsers"),
    role: v.optional(techDayRoleValidator),
    organizationId: v.optional(v.union(v.id("techDayOrganizations"), v.null())),
    roleTemplateId: v.optional(v.union(v.id("techDayRoleTemplates"), v.null())),
    assignedTracks: v.optional(v.array(v.string())),
    voteCounterOptIn: v.optional(v.boolean()),
    canPublishNews: v.optional(v.boolean()),
    reviewerDirectionId: v.optional(v.union(v.id("techDayDirections"), v.null())),
    status: v.optional(v.union(v.literal("active"), v.literal("pending"), v.literal("disabled"))),
  },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    requireAdmin(principal)
    if (principal.techDayUser?._id === args.id && (args.role || args.status === "disabled")) {
      throw new Error("不能修改自己的管理员身份或禁用自己的账号")
    }
    const patch: any = { updatedAt: Date.now() }
    if (args.role) patch.role = args.role
    if (args.organizationId !== undefined) patch.organizationId = args.organizationId || undefined
    if (args.roleTemplateId !== undefined) patch.roleTemplateId = args.roleTemplateId || undefined
    if (args.assignedTracks !== undefined) {
      const assignedTracks = normalizeStringList(args.assignedTracks)
      patch.assignedTracks = assignedTracks
      if (assignedTracks.length) {
        const firstOrg = await ctx.db
          .query("techDayOrganizations")
          .withIndex("by_name", (q) => q.eq("name", assignedTracks[0]))
          .first()
        patch.organizationId = firstOrg?._id
      } else {
        patch.organizationId = undefined
      }
    }
    if (args.voteCounterOptIn !== undefined) patch.voteCounterOptIn = args.voteCounterOptIn
    if (args.canPublishNews !== undefined) patch.canPublishNews = args.canPublishNews
    if (args.reviewerDirectionId !== undefined) patch.reviewerDirectionId = args.reviewerDirectionId || undefined
    if (args.status) patch.status = args.status
    await ctx.db.patch(args.id, patch)
    return args.id
  },
})

export const deleteUser = mutation({
  args: { ...actorArgs, id: v.id("techDayUsers") },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    requireAdmin(principal)
    if (principal.techDayUser?._id === args.id) {
      throw new Error("不能删除自己的 TechDay 管理员账号")
    }
    await ctx.db.delete(args.id)
    return args.id
  },
})

export const exportUsers = query({
  args: actorArgs,
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const users = await ctx.db.query("techDayUsers").collect()
    return users.map((user) => ({
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      student_id: user.studentId || "",
      volunteer_tracks: user.volunteerTracks?.join(";") || "",
      assigned_tracks: user.assignedTracks?.join(";") || "",
      role_template_id: user.roleTemplateId ? String(user.roleTemplateId) : "",
      vote_counter_opt_in: user.voteCounterOptIn ? "1" : "0",
      availability_slots: user.availabilitySlots?.join(";") || "",
    }))
  },
})

export const listReviewerInvites = query({
  args: actorArgs,
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const invites = await ctx.db.query("techDayReviewerInvites").order("desc").collect()
    return await Promise.all(invites.map(async (invite) => {
      const preset = invite.presetDirectionId ? await ctx.db.get(invite.presetDirectionId) : null
      const reviewer = invite.reviewerDirectionId ? await ctx.db.get(invite.reviewerDirectionId) : null
      return {
        ...invite,
        presetDirectionName: preset?.name,
        reviewerDirectionName: reviewer?.name,
      }
    }))
  },
})

export const createReviewerInvite = mutation({
  args: { ...actorArgs, code: v.optional(v.string()), presetDirectionId: v.optional(v.id("techDayDirections")) },
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const code = normalizeCode(args.code || randomInviteCode())
    const existing = await ctx.db.query("techDayReviewerInvites").withIndex("by_code", (q) => q.eq("code", code)).first()
    if (existing) throw new Error("邀请码已存在")
    const now = Date.now()
    return await ctx.db.insert("techDayReviewerInvites", {
      code,
      presetDirectionId: args.presetDirectionId,
      isUsed: false,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const deleteReviewerInvite = mutation({
  args: { ...actorArgs, id: v.id("techDayReviewerInvites") },
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const invite = await ctx.db.get(args.id)
    if (!invite) throw new Error("邀请码不存在")
    if (invite.isUsed) throw new Error("邀请码已被使用，无法删除")
    await ctx.db.delete(args.id)
    return args.id
  },
})

export const createMigrationMap = mutation({
  args: {
    ...actorArgs,
    sourceTable: v.string(),
    sourceId: v.string(),
    targetTable: v.string(),
    targetId: v.string(),
    checksum: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireSuperAdmin(await resolvePrincipal(ctx, args))
    const existing = await ctx.db
      .query("techDayMigrationMap")
      .withIndex("by_source", (q) => q.eq("sourceTable", normalizeText(args.sourceTable)).eq("sourceId", args.sourceId))
      .first()
    const now = Date.now()
    if (existing) {
      await ctx.db.patch(existing._id, {
        targetTable: normalizeText(args.targetTable),
        targetId: args.targetId,
        checksum: args.checksum,
        updatedAt: now,
      })
      return existing._id
    }
    return await ctx.db.insert("techDayMigrationMap", {
      sourceTable: normalizeText(args.sourceTable),
      sourceId: args.sourceId,
      targetTable: normalizeText(args.targetTable),
      targetId: args.targetId,
      checksum: args.checksum,
      createdAt: now,
      updatedAt: now,
    })
  },
})

const randomInviteCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const cryptoImpl = (globalThis as any).crypto || (global as any).crypto
  const bytes = cryptoImpl.getRandomValues(new Uint8Array(8)) as Uint8Array
  return Array.from(bytes).map((byte) => alphabet[byte % alphabet.length]).join("")
}
