import { mutation, query } from "../_generated/server"
import { v } from "convex/values"
import { ensureUnique, normalizeLongText, normalizeText, requireAdmin, requireRole, resolvePrincipal, trackValidator } from "./lib"

const actorArgs = {
  mainSessionToken: v.optional(v.string()),
  techDaySessionToken: v.optional(v.string()),
}

const serializeRecommendation = async (ctx: any, rec: any) => {
  const reviewer = await ctx.db.get(rec.reviewerId)
  return {
    reviewerId: rec.reviewerId,
    reviewerName: reviewer?.name || "未知",
    reason: rec.reason,
    confidence: rec.confidence,
    updatedAt: rec.updatedAt,
  }
}

const serializeAwardSubmission = async (ctx: any, submission: any, currentUserId?: string | null): Promise<any> => {
  const [direction, author, awardLinks, recommendations] = await Promise.all([
    submission.directionId ? ctx.db.get(submission.directionId) : null,
    ctx.db.get(submission.authorId),
    ctx.db.query("techDaySubmissionAwards").withIndex("by_submission", (q: any) => q.eq("submissionId", submission._id)).collect(),
    ctx.db.query("techDayReviewRecommendations").withIndex("by_submission", (q: any) => q.eq("submissionId", submission._id)).collect(),
  ])
  const awards = await Promise.all(awardLinks.map((link: any) => ctx.db.get(link.awardId)))
  const reviewerTags = await Promise.all(recommendations.map((rec: any) => serializeRecommendation(ctx, rec)))
  const awardTags = [
    ...(recommendations.length ? ["推荐"] : []),
    ...awards.filter(Boolean).map((award: any) => award.name),
  ]
  return {
    _id: submission._id,
    sequenceNo: submission.sequenceNo,
    title: submission.title,
    directionId: submission.directionId,
    directionName: direction?.name,
    authorName: author?.name,
    authors: submission.authors,
    year: submission.year,
    awardTags: awardTags.length ? awardTags : ["无"],
    awardBadges: awards.filter(Boolean).map((award: any) => ({ _id: award._id, name: award.name, color: award.color })),
    reviewerTags,
    myRecommendation: currentUserId ? reviewerTags.find((rec: any) => String(rec.reviewerId) === currentUserId) || null : null,
  }
}

export const listAwards = query({
  args: actorArgs,
  handler: async (ctx, args) => {
    requireRole(await resolvePrincipal(ctx, args), "reviewer")
    return await ctx.db.query("techDayAwards").order("asc").collect()
  },
})

export const createAward = mutation({
  args: { ...actorArgs, name: v.string(), description: v.optional(v.string()), color: v.optional(v.string()) },
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const name = normalizeText(args.name)
    if (!name) throw new Error("奖项名称不能为空")
    await ensureUnique(ctx, "techDayAwards", "by_name", "name", name, "奖项名称已存在")
    const now = Date.now()
    return await ctx.db.insert("techDayAwards", {
      name,
      description: args.description ? normalizeLongText(args.description) : undefined,
      color: args.color,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateAward = mutation({
  args: { ...actorArgs, id: v.id("techDayAwards"), name: v.string(), description: v.optional(v.string()), color: v.optional(v.string()) },
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const name = normalizeText(args.name)
    if (!name) throw new Error("奖项名称不能为空")
    await ensureUnique(ctx, "techDayAwards", "by_name", "name", name, "奖项名称已存在", String(args.id))
    await ctx.db.patch(args.id, {
      name,
      description: args.description ? normalizeLongText(args.description) : undefined,
      color: args.color,
      updatedAt: Date.now(),
    })
    return args.id
  },
})

export const deleteAward = mutation({
  args: { ...actorArgs, id: v.id("techDayAwards") },
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const inUse = await ctx.db.query("techDaySubmissionAwards").withIndex("by_award", (q) => q.eq("awardId", args.id)).first()
    if (inUse) throw new Error("奖项已用于投稿，无法删除")
    await ctx.db.delete(args.id)
    return args.id
  },
})

export const listAwardSubmissions = query({
  args: {
    ...actorArgs,
    directionIds: v.optional(v.array(v.id("techDayDirections"))),
    status: v.optional(v.array(v.string())),
    sortBy: v.optional(v.union(v.literal("sequence"), v.literal("id"))),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    track: v.optional(trackValidator),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    const reviewerOrAdmin = requireRole(principal, "reviewer")
    const user = reviewerOrAdmin || principal.techDayUser
    let rows = await ctx.db
      .query("techDaySubmissions")
      .filter((q) => q.eq(q.field("reviewStatus"), "approved"))
      .collect()
    rows = rows.filter((row) => row.track === (args.track || "poster"))
    if (args.year !== undefined) rows = rows.filter((row) => row.year === args.year)
    if (user?.role === "reviewer") {
      rows = rows.filter((row) => row.directionId === user.reviewerDirectionId)
    } else if (args.directionIds?.length) {
      rows = rows.filter((row) => row.directionId && args.directionIds!.includes(row.directionId))
    }
    const enriched = await Promise.all(rows.map((row) => serializeAwardSubmission(ctx, row, user?._id ? String(user._id) : null)))
    const statusSet = new Set(args.status || [])
    const filtered = statusSet.size
      ? enriched.filter((row: any) => {
          const tags = row.awardTags || []
          return (
            (statusSet.has("none") && tags.includes("无")) ||
            (statusSet.has("recommended") && row.reviewerTags.length > 0) ||
            tags.some((tag: string) => statusSet.has(tag))
          )
        })
      : enriched
    filtered.sort((a: any, b: any) => {
      const left = args.sortBy === "id" ? String(a._id) : a.sequenceNo || 0
      const right = args.sortBy === "id" ? String(b._id) : b.sequenceNo || 0
      const value = left > right ? 1 : left < right ? -1 : 0
      return args.sortOrder === "desc" ? -value : value
    })
    return filtered
  },
})

export const upsertRecommendation = mutation({
  args: { ...actorArgs, submissionId: v.id("techDaySubmissions"), reason: v.string(), confidence: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const reviewer = requireRole(await resolvePrincipal(ctx, args), "reviewer")
    if (!reviewer) throw new Error("审阅者账号不存在")
    const submission = await ctx.db.get(args.submissionId)
    if (!submission || submission.reviewStatus !== "approved") throw new Error("投稿未找到或未通过审核")
    if (submission.directionId !== reviewer.reviewerDirectionId) throw new Error("无权操作其他方向的投稿")
    const existing = await ctx.db
      .query("techDayReviewRecommendations")
      .withIndex("by_submission_reviewer", (q) => q.eq("submissionId", args.submissionId).eq("reviewerId", reviewer._id))
      .first()
    const now = Date.now()
    if (existing) {
      await ctx.db.patch(existing._id, {
        reason: normalizeLongText(args.reason),
        confidence: args.confidence,
        updatedAt: now,
      })
      return existing._id
    }
    return await ctx.db.insert("techDayReviewRecommendations", {
      submissionId: args.submissionId,
      reviewerId: reviewer._id,
      reason: normalizeLongText(args.reason),
      confidence: args.confidence,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const deleteRecommendation = mutation({
  args: { ...actorArgs, submissionId: v.id("techDaySubmissions") },
  handler: async (ctx, args) => {
    const reviewer = requireRole(await resolvePrincipal(ctx, args), "reviewer")
    if (!reviewer) throw new Error("审阅者账号不存在")
    const existing = await ctx.db
      .query("techDayReviewRecommendations")
      .withIndex("by_submission_reviewer", (q) => q.eq("submissionId", args.submissionId).eq("reviewerId", reviewer._id))
      .first()
    if (!existing) throw new Error("尚未推荐该投稿")
    await ctx.db.delete(existing._id)
    return existing._id
  },
})

export const assignAwards = mutation({
  args: { ...actorArgs, submissionId: v.id("techDaySubmissions"), awardIds: v.array(v.id("techDayAwards")) },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    const admin = requireAdmin(principal)
    const existing = await ctx.db
      .query("techDaySubmissionAwards")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .collect()
    const desired = new Set(args.awardIds.map(String))
    for (const row of existing) {
      if (!desired.has(String(row.awardId))) await ctx.db.delete(row._id)
    }
    for (const awardId of args.awardIds) {
      const already = existing.find((row) => row.awardId === awardId)
      if (!already) {
        await ctx.db.insert("techDaySubmissionAwards", {
          submissionId: args.submissionId,
          awardId,
          assignedById: admin?._id,
          createdAt: Date.now(),
        })
      }
    }
    return args.submissionId
  },
})
