import { mutation, query } from "../_generated/server"
import { v } from "convex/values"
import {
  canViewSubmission,
  getMainUserBySession,
  isTechDayAdmin,
  normalizeEmail,
  normalizeLongText,
  normalizeText,
  publicationStatusValidator,
  requireAdmin,
  requireAuthenticated,
  requireOwnerOrAdmin,
  requireRole,
  resolvePrincipal,
  reviewStatusValidator,
  trackValidator,
} from "./lib"

const actorArgs = {
  mainSessionToken: v.optional(v.string()),
  techDaySessionToken: v.optional(v.string()),
}

const submissionArgs = {
  title: v.string(),
  abstract: v.string(),
  contact: v.string(),
  venue: v.string(),
  authors: v.optional(v.string()),
  track: trackValidator,
  publicationStatus: publicationStatusValidator,
  archiveConsent: v.boolean(),
  directionId: v.optional(v.id("techDayDirections")),
  paperUrl: v.optional(v.string()),
  year: v.optional(v.number()),
}

const stripUndefined = (value: any): any => {
  if (Array.isArray(value)) return value.map(stripUndefined)
  if (!value || typeof value !== "object") return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, stripUndefined(item)])
  )
}

const canAccessArchivedMaterial = (principal: any, submission: any) => {
  return (
    isTechDayAdmin(principal) ||
    principal.techDayUser?._id === submission.authorId ||
    (submission.reviewStatus === "approved" && submission.publicationStatus === "published" && submission.archiveConsent)
  )
}

const hasAuthorPermission = (principal: any) => {
  return (
    isTechDayAdmin(principal) ||
    principal.techDayUser?.role === "author" ||
    Boolean(principal.techDayUser?.canSubmitPapers)
  )
}

const identityFromMainUser = (mainUser: any, now: number) => ({
  email: normalizeEmail(mainUser.email),
  name: normalizeText(mainUser.chineseName || mainUser.englishName || mainUser.username),
  school: mainUser.organization.toUpperCase(),
  college: "TongClass",
  grade: String(mainUser.cohort),
  studentId: mainUser.studentId,
  updatedAt: now,
})

const ensureSubmissionAuthor = async (ctx: any, args: { mainSessionToken?: string; techDaySessionToken?: string }) => {
  const principal = await resolvePrincipal(ctx, args)

  if (principal.techDayUser) {
    if (hasAuthorPermission(principal)) return { principal, user: principal.techDayUser }
    if (!principal.mainUser) throw new Error("没有访问该 TechDay 功能的权限")

    await ctx.db.patch(principal.techDayUser._id, {
      ...identityFromMainUser(principal.mainUser, Date.now()),
      canSubmitPapers: true,
    })
    const user = await ctx.db.get(principal.techDayUser._id)
    return { principal: { ...principal, techDayUser: user }, user }
  }

  const mainUser = await getMainUserBySession(ctx, args.mainSessionToken)
  if (!mainUser) throw new Error("请先使用通班账号登录，或使用 TechDay 作者账号登录")

  const now = Date.now()
  const email = normalizeEmail(mainUser.email)
  const existingByMain = await ctx.db
    .query("techDayUsers")
    .withIndex("by_mainUser", (q: any) => q.eq("mainUserId", mainUser._id))
    .first()
  const existingByEmail = await ctx.db
    .query("techDayUsers")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first()

  if (existingByEmail && (!existingByMain || existingByEmail._id !== existingByMain._id)) {
    throw new Error("该通班邮箱已绑定其他 TechDay 账号")
  }

  const role = mainUser.role === "admin" || mainUser.role === "super_admin"
    ? "admin"
    : existingByMain?.status === "pending"
      ? "author"
      : existingByMain?.role || "author"
  const patch = {
    ...identityFromMainUser(mainUser, now),
    role,
    canSubmitPapers: true,
    status: "active" as const,
  }

  const userId = existingByMain
    ? existingByMain._id
    : await ctx.db.insert("techDayUsers", {
        ...patch,
        mainUserId: mainUser._id,
        createdAt: now,
      })

  if (existingByMain) {
    await ctx.db.patch(existingByMain._id, patch)
  }

  const user = await ctx.db.get(userId)
  return {
    principal: { kind: "internal", mainUser, techDayUser: user },
    user,
  }
}

const requireSubmissionAuthor = (principal: any) => {
  if (!hasAuthorPermission(principal)) {
    throw new Error("没有访问该 TechDay 功能的权限")
  }
  return requireAuthenticated(principal)
}

const enrichSubmission = async (
  ctx: any,
  submission: any,
  {
    principal,
    showVotes = false,
    includeLogs = false,
    includePrivate = false,
    visibleAwardIds,
  }: {
    principal?: any
    showVotes?: boolean
    includeLogs?: boolean
    includePrivate?: boolean
    visibleAwardIds?: string[]
  } = {}
): Promise<any> => {
  const [direction, author, awardLinks, recommendations, logs] = await Promise.all([
    submission.directionId ? ctx.db.get(submission.directionId) : null,
    submission.authorId ? ctx.db.get(submission.authorId) : null,
    ctx.db
      .query("techDaySubmissionAwards")
      .withIndex("by_submission", (q: any) => q.eq("submissionId", submission._id))
      .collect(),
    ctx.db
      .query("techDayReviewRecommendations")
      .withIndex("by_submission", (q: any) => q.eq("submissionId", submission._id))
      .collect(),
    includeLogs
      ? ctx.db
          .query("techDaySubmissionVoteLogs")
          .withIndex("by_submission_createdAt", (q: any) => q.eq("submissionId", submission._id))
          .order("desc")
          .take(50)
      : [],
  ])
  const visibleAwardSet = visibleAwardIds?.length ? new Set(visibleAwardIds.map(String)) : null
  const visibleAwardLinks = visibleAwardSet
    ? awardLinks.filter((link: any) => visibleAwardSet.has(String(link.awardId)))
    : awardLinks
  const awards = await Promise.all(visibleAwardLinks.map((link: any) => ctx.db.get(link.awardId)))
  const awardNames = awards.filter(Boolean).map((award: any) => award.name)
  const awardTags = [
    ...(recommendations.length > 0 ? ["推荐"] : []),
    ...awardNames,
  ]
  const canShowArchivedMaterial = principal ? canAccessArchivedMaterial(principal, submission) : false
  const publicFields = {
    _id: submission._id,
    _creationTime: submission._creationTime,
    title: submission.title,
    abstract: submission.abstract,
    venue: submission.venue || "",
    authors: Array.isArray(submission.authors) ? submission.authors.join(", ") : submission.authors,
    track: submission.track || "poster",
    reviewStatus: submission.reviewStatus || "pending",
    publicationStatus: submission.publicationStatus || "accepted",
    sequenceNo: submission.sequenceNo,
    year: submission.year,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
    directionName: direction?.name || null,
    authorName: author?.name || null,
    awardBadges: awards.filter(Boolean).map((award: any) => ({
      _id: award._id,
      name: award.name,
      color: award.color,
    })),
    awardTags: awardTags.length ? awardTags : submission.awardText ? [submission.awardText] : ["无"],
    voteInnovation: showVotes ? submission.voteInnovation || 0 : undefined,
    voteImpact: showVotes ? submission.voteImpact || 0 : undefined,
    voteFeasibility: showVotes ? submission.voteFeasibility || 0 : undefined,
    paperUrl: canShowArchivedMaterial ? submission.paperUrl : undefined,
    hasPoster: Boolean(canShowArchivedMaterial && submission.posterStorageId),
    canAccessArchivedMaterial: canShowArchivedMaterial,
    logs,
  }

  if (!includePrivate) return stripUndefined(publicFields)

  return stripUndefined({
    ...publicFields,
    contact: submission.contact,
    authorId: submission.authorId,
    directionId: submission.directionId,
    archiveConsent: submission.archiveConsent,
    paperUrl: submission.paperUrl,
    posterFileName: submission.posterFileName,
    posterMimeType: submission.posterMimeType,
    posterSize: submission.posterSize,
    legacyPosterPath: submission.legacyPosterPath,
  })
}

export const listPublic = query({
  args: {
    track: v.optional(trackValidator),
    directionId: v.optional(v.id("techDayDirections")),
    year: v.optional(v.number()),
    sort: v.optional(v.union(v.literal("voteInnovation"), v.literal("voteImpact"), v.literal("voteFeasibility"))),
  },
  handler: async (ctx, args) => {
    const track = args.track || "poster"
    let rows = await ctx.db
      .query("techDaySubmissions")
      .withIndex("by_track_status_year_updatedAt", (q) =>
        args.year === undefined
          ? q.eq("track", track).eq("reviewStatus", "approved")
          : q.eq("track", track).eq("reviewStatus", "approved").eq("year", args.year)
      )
      .order("desc")
      .collect()

    if (args.directionId) {
      rows = rows.filter((row) => row.directionId === args.directionId)
    }

    const settings = await ctx.db.query("techDaySettings").withIndex("by_key", (q) => q.eq("key", "default")).first()
    const showVotes = Boolean(settings?.showVoteData)
    const canSort = Boolean(settings?.showVoteData && settings?.voteSortEnabled)
    const visibleAwardIds = settings?.visibleAwardIds?.map(String)

    if (canSort && args.sort) {
      rows.sort((a: any, b: any) => Number(b[args.sort!]) - Number(a[args.sort!]))
    } else {
      rows.sort((a, b) => (a.sequenceNo || 0) - (b.sequenceNo || 0) || b.updatedAt - a.updatedAt)
    }

    return {
      track,
      showVotes,
      canSort,
      submissions: await Promise.all(rows.map((row) => enrichSubmission(ctx, row, { showVotes, visibleAwardIds }))),
    }
  },
})

export const getById = query({
  args: { ...actorArgs, id: v.id("techDaySubmissions") },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    const submission = await ctx.db.get(args.id)
    if (!submission) return null
    if (!canViewSubmission(principal, submission)) throw new Error("无权查看该投稿")
    const settings = await ctx.db.query("techDaySettings").withIndex("by_key", (q) => q.eq("key", "default")).first()
    const includePrivate = Boolean(principal.techDayUser?._id === submission.authorId || isTechDayAdmin(principal))
    const visibleAwardIds = settings?.visibleAwardIds?.map(String)
    return await enrichSubmission(ctx, submission, {
      principal,
      showVotes: Boolean(settings?.showVoteData),
      includeLogs: includePrivate,
      includePrivate,
      visibleAwardIds,
    })
  },
})

export const listMine = query({
  args: actorArgs,
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    const user = requireSubmissionAuthor(principal)
    if (!user) return []
    const rows = await ctx.db
      .query("techDaySubmissions")
      .withIndex("by_author_createdAt", (q) => q.eq("authorId", user._id))
      .order("desc")
      .collect()
    return await Promise.all(rows.map((row) => enrichSubmission(ctx, row, { principal, showVotes: true, includePrivate: true })))
  },
})

export const create = mutation({
  args: { ...actorArgs, ...submissionArgs },
  handler: async (ctx, args) => {
    const { user } = await ensureSubmissionAuthor(ctx, args)
    if (!user) throw new Error("作者账号不存在")

    const now = Date.now()
    return await ctx.db.insert("techDaySubmissions", {
      title: normalizeText(args.title),
      abstract: normalizeLongText(args.abstract),
      contact: normalizeText(args.contact),
      venue: normalizeText(args.venue),
      authors: args.authors ? normalizeText(args.authors) : undefined,
      track: args.track,
      reviewStatus: "pending",
      publicationStatus: args.publicationStatus,
      archiveConsent: args.archiveConsent,
      directionId: args.directionId,
      authorId: user._id,
      year: args.year || new Date().getFullYear(),
      voteInnovation: 0,
      voteImpact: 0,
      voteFeasibility: 0,
      paperUrl: args.paperUrl ? normalizeText(args.paperUrl) : undefined,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateMine = mutation({
  args: { ...actorArgs, id: v.id("techDaySubmissions"), ...submissionArgs },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    const submission = await ctx.db.get(args.id)
    if (!submission) throw new Error("投稿不存在")
    if (submission.authorId) {
      requireOwnerOrAdmin(principal, submission.authorId)
    } else {
      requireAdmin(principal)
    }

    await ctx.db.patch(args.id, {
      title: normalizeText(args.title),
      abstract: normalizeLongText(args.abstract),
      contact: normalizeText(args.contact),
      venue: normalizeText(args.venue),
      authors: args.authors ? normalizeText(args.authors) : undefined,
      track: args.track,
      reviewStatus: "pending",
      publicationStatus: args.publicationStatus,
      archiveConsent: args.archiveConsent,
      directionId: args.directionId,
      paperUrl: args.paperUrl ? normalizeText(args.paperUrl) : undefined,
      updatedAt: Date.now(),
    })
    return args.id
  },
})

export const removeMine = mutation({
  args: { ...actorArgs, id: v.id("techDaySubmissions") },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    const submission = await ctx.db.get(args.id)
    if (!submission) throw new Error("投稿不存在")
    if (submission.authorId) {
      requireOwnerOrAdmin(principal, submission.authorId)
    } else {
      requireAdmin(principal)
    }
    await cascadeDeleteSubmission(ctx, args.id)
    return args.id
  },
})

const cascadeDeleteSubmission = async (ctx: any, id: any) => {
  const [logs, awards, recommendations] = await Promise.all([
    ctx.db.query("techDaySubmissionVoteLogs").withIndex("by_submission_createdAt", (q: any) => q.eq("submissionId", id)).collect(),
    ctx.db.query("techDaySubmissionAwards").withIndex("by_submission", (q: any) => q.eq("submissionId", id)).collect(),
    ctx.db.query("techDayReviewRecommendations").withIndex("by_submission", (q: any) => q.eq("submissionId", id)).collect(),
  ])
  for (const row of [...logs, ...awards, ...recommendations]) {
    await ctx.db.delete(row._id)
  }
  await ctx.db.delete(id)
}

export const listAdmin = query({
  args: { ...actorArgs, track: v.optional(trackValidator), reviewStatus: v.optional(reviewStatusValidator), year: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    requireAdmin(principal)
    let rows = await ctx.db.query("techDaySubmissions").order("desc").collect()
    if (args.track) rows = rows.filter((row) => row.track === args.track)
    if (args.reviewStatus) rows = rows.filter((row) => row.reviewStatus === args.reviewStatus)
    if (args.year !== undefined) rows = rows.filter((row) => row.year === args.year)
    return await Promise.all(rows.map((row) => enrichSubmission(ctx, row, { principal, showVotes: true, includePrivate: true })))
  },
})

export const adminUpdate = mutation({
  args: {
    ...actorArgs,
    id: v.id("techDaySubmissions"),
    reviewStatus: v.optional(reviewStatusValidator),
    awardText: v.optional(v.string()),
    track: v.optional(trackValidator),
    directionId: v.optional(v.id("techDayDirections")),
    publicationStatus: v.optional(publicationStatusValidator),
  },
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const patch: any = { updatedAt: Date.now() }
    if (args.reviewStatus) {
      patch.reviewStatus = args.reviewStatus
      if (args.reviewStatus !== "approved") patch.sequenceNo = undefined
    }
    if (args.awardText !== undefined) patch.awardText = normalizeText(args.awardText)
    if (args.track) patch.track = args.track
    if (args.directionId !== undefined) patch.directionId = args.directionId
    if (args.publicationStatus) patch.publicationStatus = args.publicationStatus
    await ctx.db.patch(args.id, patch)
    return args.id
  },
})

export const adminDelete = mutation({
  args: { ...actorArgs, id: v.id("techDaySubmissions") },
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    await cascadeDeleteSubmission(ctx, args.id)
    return args.id
  },
})

export const renumber = mutation({
  args: { ...actorArgs, track: trackValidator, year: v.optional(v.number()) },
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    let rows = await ctx.db
      .query("techDaySubmissions")
      .withIndex("by_track_status_year_updatedAt", (q) =>
        args.year === undefined
          ? q.eq("track", args.track).eq("reviewStatus", "approved")
          : q.eq("track", args.track).eq("reviewStatus", "approved").eq("year", args.year)
      )
      .collect()
    rows = rows.sort((a, b) => a.createdAt - b.createdAt)
    for (let index = 0; index < rows.length; index += 1) {
      await ctx.db.patch(rows[index]._id, { sequenceNo: index + 1, updatedAt: Date.now() })
    }
    return { renumbered: rows.length }
  },
})

export const updateVotes = mutation({
  args: {
    ...actorArgs,
    id: v.id("techDaySubmissions"),
    voteInnovation: v.optional(v.number()),
    voteImpact: v.optional(v.number()),
    voteFeasibility: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    const actor = requireRole(principal, "admin")
    if (!actor) throw new Error("请先同步 TechDay 管理员账号")
    const submission = await ctx.db.get(args.id)
    if (!submission) throw new Error("投稿不存在")
    const fields = ["voteInnovation", "voteImpact", "voteFeasibility"] as const
    const patch: any = { updatedAt: Date.now() }
    for (const field of fields) {
      if (args[field] !== undefined) {
        await ctx.db.insert("techDaySubmissionVoteLogs", {
          submissionId: args.id,
          userId: actor._id,
          fieldName: field,
          oldValue: submission[field],
          newValue: args[field],
          createdAt: Date.now(),
        })
        patch[field] = args[field]
      }
    }
    await ctx.db.patch(args.id, patch)
    return args.id
  },
})

export const exportRows = query({
  args: { ...actorArgs, track: v.optional(trackValidator), directionId: v.optional(v.id("techDayDirections")), year: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    requireAdmin(principal)
    let rows = await ctx.db
      .query("techDaySubmissions")
      .filter((q) => q.eq(q.field("reviewStatus"), "approved"))
      .collect()
    if (args.track) rows = rows.filter((row) => row.track === args.track)
    if (args.directionId) rows = rows.filter((row) => row.directionId === args.directionId)
    if (args.year !== undefined) rows = rows.filter((row) => row.year === args.year)
    const enriched = await Promise.all(rows.map((row) => enrichSubmission(ctx, row, { principal, showVotes: true, includePrivate: true })))
    return enriched.map((submission: any) => ({
      title: submission.title,
      direction: submission.directionName || "",
      author: submission.authorName || "",
      authors: submission.authors || "",
      year: submission.year || "",
      venue: submission.venue,
      status: submission.reviewStatus,
      track: submission.track,
      archive_consent: submission.archiveConsent ? "true" : "false",
      paper_url: submission.paperUrl || "",
      poster_path: submission.legacyPosterPath || "",
      award: submission.awardTags?.join(";") || "",
    }))
  },
})
