import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import {
  REVIEWER_ACADEMIC_EXCHANGE_READ,
  REVIEWER_PASSWORD_MIN_LENGTH,
  createReviewerSession,
  getReviewerBySession,
  hashReviewerPassword,
  normalizeReviewerPermissions,
  normalizeReviewerUsername,
  requireSuperAdminBySession,
  serializeReviewerAccount,
  sha256Hex,
  verifyReviewerPassword,
} from "./reviewer/lib"

const reviewerPermissionValidator = v.union(
  v.literal(REVIEWER_ACADEMIC_EXCHANGE_READ)
)

function normalizeDisplayName(value: string) {
  const trimmed = value.trim()
  return trimmed || "Reviewer"
}

function assertValidUsername(username: string) {
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    throw new Error("Reviewer 用户名只能包含小写字母、数字、点、下划线和短横线，长度为 3-40")
  }
}

function assertValidPassword(password: string) {
  if (password.length < REVIEWER_PASSWORD_MIN_LENGTH) {
    throw new Error(`Reviewer 密码至少需要 ${REVIEWER_PASSWORD_MIN_LENGTH} 位`)
  }
}

export const listAccounts = query({
  args: {
    requesterSessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminBySession(ctx, args.requesterSessionToken)

    const reviewers = await ctx.db.query("reviewerAccounts").order("desc").collect()
    return reviewers.map(serializeReviewerAccount)
  },
})

export const createAccount = mutation({
  args: {
    requesterSessionToken: v.optional(v.string()),
    username: v.string(),
    displayName: v.string(),
    password: v.string(),
    permissions: v.optional(v.array(reviewerPermissionValidator)),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const requester = await requireSuperAdminBySession(ctx, args.requesterSessionToken)
    const username = normalizeReviewerUsername(args.username)
    assertValidUsername(username)
    assertValidPassword(args.password)

    const existing = await ctx.db
      .query("reviewerAccounts")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first()

    if (existing) {
      throw new Error("该 Reviewer 用户名已存在")
    }

    const now = Date.now()
    const passwordFields = await hashReviewerPassword(args.password)
    return await ctx.db.insert("reviewerAccounts", {
      username,
      displayName: normalizeDisplayName(args.displayName),
      ...passwordFields,
      enabled: args.enabled ?? true,
      permissions: normalizeReviewerPermissions(args.permissions),
      createdBy: requester._id,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateAccount = mutation({
  args: {
    requesterSessionToken: v.optional(v.string()),
    id: v.id("reviewerAccounts"),
    displayName: v.optional(v.string()),
    permissions: v.optional(v.array(reviewerPermissionValidator)),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminBySession(ctx, args.requesterSessionToken)

    const reviewer = await ctx.db.get(args.id)
    if (!reviewer) {
      throw new Error("Reviewer 账号不存在")
    }

    const patch: Record<string, any> = {
      updatedAt: Date.now(),
    }

    if (args.displayName !== undefined) {
      patch.displayName = normalizeDisplayName(args.displayName)
    }

    if (args.permissions !== undefined) {
      patch.permissions = normalizeReviewerPermissions(args.permissions)
    }

    if (args.enabled !== undefined) {
      patch.enabled = args.enabled
      if (!args.enabled) {
        const sessions = await ctx.db
          .query("reviewerSessions")
          .withIndex("by_reviewer", (q) => q.eq("reviewerId", args.id))
          .collect()
        await Promise.all(
          sessions
            .filter((session) => !session.revokedAt)
            .map((session) => ctx.db.patch(session._id, { revokedAt: Date.now() }))
        )
      }
    }

    await ctx.db.patch(args.id, patch)
    return args.id
  },
})

export const resetPassword = mutation({
  args: {
    requesterSessionToken: v.optional(v.string()),
    id: v.id("reviewerAccounts"),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminBySession(ctx, args.requesterSessionToken)
    assertValidPassword(args.password)

    const reviewer = await ctx.db.get(args.id)
    if (!reviewer) {
      throw new Error("Reviewer 账号不存在")
    }

    const passwordFields = await hashReviewerPassword(args.password)
    await ctx.db.patch(args.id, {
      ...passwordFields,
      updatedAt: Date.now(),
    })

    const sessions = await ctx.db
      .query("reviewerSessions")
      .withIndex("by_reviewer", (q) => q.eq("reviewerId", args.id))
      .collect()
    await Promise.all(
      sessions
        .filter((session) => !session.revokedAt)
        .map((session) => ctx.db.patch(session._id, { revokedAt: Date.now() }))
    )

    return args.id
  },
})

export const signIn = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const username = normalizeReviewerUsername(args.username)
    const reviewer = await ctx.db
      .query("reviewerAccounts")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first()

    if (!reviewer || !reviewer.enabled) {
      throw new Error("Reviewer 用户名或密码错误")
    }

    const passwordMatches = await verifyReviewerPassword(args.password, reviewer)
    if (!passwordMatches) {
      throw new Error("Reviewer 用户名或密码错误")
    }

    const now = Date.now()
    await ctx.db.patch(reviewer._id, {
      lastLoginAt: now,
      updatedAt: now,
    })

    return {
      sessionToken: await createReviewerSession(ctx, reviewer._id),
      reviewer: serializeReviewerAccount({
        ...reviewer,
        lastLoginAt: now,
        updatedAt: now,
      }),
    }
  },
})

export const current = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.sessionToken) return null

    try {
      const reviewer = await getReviewerBySession(ctx, args.sessionToken)
      return serializeReviewerAccount(reviewer)
    } catch {
      return null
    }
  },
})

export const signOut = mutation({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.sessionToken) return { success: true }

    const tokenHash = await sha256Hex(args.sessionToken)
    const session = await ctx.db
      .query("reviewerSessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .first()

    if (session && !session.revokedAt) {
      await ctx.db.patch(session._id, { revokedAt: Date.now() })
    }

    return { success: true }
  },
})
