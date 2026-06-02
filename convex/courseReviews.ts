import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { getVoteSummaryMap } from "./contentVotes"

type ReviewStatus = "pending" | "approved" | "rejected"

function normalizeTag(value: string) {
  return value.trim()
}

async function ensureTagMeta(ctx: any, tags: string[]) {
  const unique = Array.from(new Set(tags.map((tag) => normalizeTag(tag)).filter(Boolean)))
  if (unique.length === 0) return

  const existing = await ctx.db.query("reviewTags").collect()
  const existingSet = new Set(existing.map((t: any) => t.name))
  const now = Date.now()

  for (const tag of unique) {
    if (existingSet.has(tag)) continue
    await ctx.db.insert("reviewTags", {
      name: tag,
      color: undefined,
      createdAt: now,
      updatedAt: now,
    })
  }
}

function assertRatingRange(value: number, min: number, max: number, label: string) {
  if (value < min || value > max) {
    throw new Error(`${label} must be between ${min} and ${max}`)
  }
}

function getReviewRating(review: any) {
  if (typeof review.overallRating === "number") return review.overallRating
  if (typeof review.rating === "number") return review.rating
  return 0
}

function parseLegacySemester(value?: string) {
  if (!value) return {}

  const yearMatch = value.match(/\d{4}/)
  const year = yearMatch ? Number(yearMatch[0]) : undefined
  const term = value.includes("秋") || value.toLowerCase().includes("fall") ? "fall" : "spring"

  return { year, term: term as "spring" | "fall" }
}

async function sha256Hex(input: string) {
  const cryptoImpl = (globalThis as any).crypto || (global as any).crypto
  const enc = new TextEncoder().encode(input)
  const hashBuffer = await cryptoImpl.subtle.digest("SHA-256", enc)
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

async function getActorFromSession(ctx: any, sessionToken?: string) {
  if (!sessionToken) return undefined

  const tokenHash = await sha256Hex(sessionToken)
  const session = await ctx.db
    .query("authSessions")
    .withIndex("by_tokenHash", (q: any) => q.eq("tokenHash", tokenHash))
    .first()
  if (!session || session.revokedAt || session.expiresAt <= Date.now()) return undefined

  const actor = await ctx.db.get(session.userId)
  return actor || undefined
}

async function getActorIdFromSession(ctx: any, sessionToken?: string) {
  return (await getActorFromSession(ctx, sessionToken))?._id
}

function getEmptyVoteSummary() {
  return { likes: 0, dislikes: 0, score: 0, currentUserVote: undefined }
}

function normalizeReviewForClient(review: any, voteSummary?: any, actor?: any) {
  const legacySemester = parseLegacySemester(review.semester)
  const summary = voteSummary || getEmptyVoteSummary()
  const revealAuthor =
    !review.isAnonymous ||
    (actor && review.authorId && String(actor._id) === String(review.authorId)) ||
    actor?.role === "super_admin"
  const { authorId, ...publicReview } = review

  return {
    ...publicReview,
    ...(revealAuthor ? { authorId } : {}),
    authorIsRevealed: revealAuthor,
    instructor: review.instructor || "未知教师",
    semesterYear: review.semesterYear ?? legacySemester.year ?? new Date(review.createdAt || Date.now()).getFullYear(),
    semesterTerm: review.semesterTerm ?? legacySemester.term ?? "spring",
    overallRating: getReviewRating(review),
    likes: summary.likes,
    dislikes: summary.dislikes,
    voteScore: summary.score,
    currentUserVote: summary.currentUserVote,
  }
}

async function syncCourseStatsByName(ctx: any, courseName: string) {
  const normalizedCourseName = courseName.trim()
  if (!normalizedCourseName) return

  const courses = await ctx.db
    .query("courses")
    .filter((q: any) => q.eq(q.field("name"), normalizedCourseName))
    .collect()
  const course = courses.find((item: any) => item.isActive !== false) || null

  if (!course) return

  const approvedReviews = await ctx.db
    .query("courseReviews")
    .filter((q: any) => q.eq(q.field("courseName"), normalizedCourseName))
    .filter((q: any) => q.eq(q.field("status"), "approved"))
    .collect()
  const activeApprovedReviews = approvedReviews.filter((review: any) => review.active !== false)

  const reviewCount = activeApprovedReviews.length
  const averageRating = reviewCount > 0
    ? Math.round((activeApprovedReviews.reduce((sum: number, review: any) => sum + getReviewRating(review), 0) / reviewCount) * 10) / 10
    : 0

  await ctx.db.patch(course._id, {
    reviewCount,
    averageRating,
    updatedAt: Date.now(),
  })
}

export const listByCourse = query({
  args: {
    courseName: v.string(),
    instructor: v.optional(v.string()),
    semesterYear: v.optional(v.number()),
    semesterTerm: v.optional(v.union(v.literal("spring"), v.literal("fall"))),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let reviews = await ctx.db.query("courseReviews").order("desc").collect()
    // filter in JS so that missing `active` (older records) are treated as active
    reviews = reviews.filter((r) => r.status === "approved" && r.courseName === args.courseName && r.active !== false)
    const actor = await getActorFromSession(ctx, args.sessionToken)
    reviews = reviews.map((review) => normalizeReviewForClient(review, undefined, actor))

    if (args.instructor) {
      reviews = reviews.filter((review) => review.instructor === args.instructor)
    }

    if (args.semesterYear !== undefined) {
      reviews = reviews.filter((review) => review.semesterYear === args.semesterYear)
    }

    if (args.semesterTerm) {
      reviews = reviews.filter((review) => review.semesterTerm === args.semesterTerm)
    }

    const voteSummaries = await getVoteSummaryMap(ctx, "courseReview", reviews.map((review) => String(review._id)), actor?._id)

    return reviews.map((review) => normalizeReviewForClient(review, voteSummaries.get(String(review._id)), actor))
  },
})

export const listByCourseAll = query({
  args: {
    courseName: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let reviews = await ctx.db.query("courseReviews").order("desc").collect()

    if (args.courseName) {
      reviews = reviews.filter((review) => review.courseName === args.courseName)
    }

    if (args.status) {
      reviews = reviews.filter((review) => review.status === args.status)
    }

    const actor = await getActorFromSession(ctx, args.sessionToken)
    const voteSummaries = await getVoteSummaryMap(ctx, "courseReview", reviews.map((review) => String(review._id)), actor?._id)

    return reviews.map((review) => normalizeReviewForClient(review, voteSummaries.get(String(review._id)), actor))
  },
})

export const listPending = query({
  args: {
    skip: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("courseReviews")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .order("desc")
      .collect()

    const skip = args.skip || 0
    const limit = args.limit || 50
    return reviews.slice(skip, skip + limit).map(normalizeReviewForClient)
  },
})

export const listCourses = query({
  handler: async (ctx) => {
    const reviews = await ctx.db.query("courseReviews").order("desc").collect()

    const courseMap = new Map<string, { count: number; totalRating: number }>()

    for (const review of reviews) {
      if (review.status !== "approved") continue
      if (review.active === false) continue
      const existing = courseMap.get(review.courseName)
      const rating = getReviewRating(review)
      if (existing) {
        existing.count++
        existing.totalRating += rating
      } else {
        courseMap.set(review.courseName, { count: 1, totalRating: rating })
      }
    }

    return Array.from(courseMap.entries())
      .map(([name, data]) => ({
        name,
        reviewCount: data.count,
        averageRating: Math.round((data.totalRating / data.count) * 10) / 10,
      }))
      .sort((a, b) => b.reviewCount - a.reviewCount)
  },
})

export const create = mutation({
  args: {
    courseName: v.string(),
    instructor: v.string(),
    semesterYear: v.number(),
    semesterTerm: v.union(v.literal("spring"), v.literal("fall")),
    overallRating: v.number(),
    department: v.optional(v.string()),
    attendanceRequired: v.optional(v.boolean()),
    workload: v.optional(v.number()),
    pace: v.optional(v.number()),
    gradingFairness: v.optional(v.number()),
    courseAverageScore: v.optional(v.number()),
    personalScore: v.optional(v.number()),
    recommendedStudyMethod: v.optional(v.union(v.literal("attend"), v.literal("recording"), v.literal("self_study"))),
    content: v.string(),
    isAnonymous: v.optional(v.boolean()),
    authorId: v.optional(v.id("users")),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
  },
  handler: async (ctx, args) => {
    const courseName = args.courseName.trim()
    const instructor = args.instructor.trim()
    const content = args.content.trim()
    const department = args.department?.trim()

    if (!courseName || !instructor || !content) {
      throw new Error("Course name, instructor, and content are required")
    }

    assertRatingRange(args.overallRating, 1, 10, "Overall rating")
    if (args.workload !== undefined) assertRatingRange(args.workload, 1, 5, "Workload")
    if (args.pace !== undefined) assertRatingRange(args.pace, 1, 5, "Pace")
    if (args.gradingFairness !== undefined) assertRatingRange(args.gradingFairness, 1, 5, "Grading fairness")

    // Normal course submissions come from the local app auth state and pass authorId.
    // Admin imports/manual entries pass an explicit status and may not have an author.
    const identity = await ctx.auth.getUserIdentity()
    let user = null
    if (!identity || !identity.email) {
      user = args.authorId ? await ctx.db.get(args.authorId) : null
    } else {
      user = await ctx.db
        .query("users")
        .filter((q: any) => q.eq(q.field("email"), identity.email))
        .first()
    }

    const isAdminManagedEntry = args.status !== undefined && !args.authorId

    if (!isAdminManagedEntry) {
      if (!user) {
        throw new Error("Authentication required to create course reviews")
      }
    }

    const status: ReviewStatus = args.status ?? "approved"

    const reviewId = await ctx.db.insert("courseReviews", {
      courseName,
      instructor,
      semesterYear: args.semesterYear,
      semesterTerm: args.semesterTerm,
      overallRating: args.overallRating,
      department: department || undefined,
      attendanceRequired: args.attendanceRequired,
      workload: args.workload,
      pace: args.pace,
      gradingFairness: args.gradingFairness,
      courseAverageScore: args.courseAverageScore,
      personalScore: args.personalScore,
      recommendedStudyMethod: args.recommendedStudyMethod,
      content,
      isAnonymous: args.isAnonymous ?? false,
      authorId: user?._id,
      status,
      tags: [],
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    if (status === "approved") {
      await syncCourseStatsByName(ctx, courseName)
    }

    return reviewId
  },
})

export const update = mutation({
  args: {
    id: v.id("courseReviews"),
    courseName: v.optional(v.string()),
    instructor: v.optional(v.string()),
    semesterYear: v.optional(v.number()),
    semesterTerm: v.optional(v.union(v.literal("spring"), v.literal("fall"))),
    overallRating: v.optional(v.number()),
    department: v.optional(v.string()),
    attendanceRequired: v.optional(v.boolean()),
    workload: v.optional(v.number()),
    pace: v.optional(v.number()),
    gradingFairness: v.optional(v.number()),
    courseAverageScore: v.optional(v.number()),
    personalScore: v.optional(v.number()),
    recommendedStudyMethod: v.optional(v.union(v.literal("attend"), v.literal("recording"), v.literal("self_study"))),
    content: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    tags: v.optional(v.array(v.string())),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    const review = await ctx.db.get(id)
    if (!review) {
      throw new Error("Review not found")
    }

    const normalizedUpdates = {
      ...updates,
      ...(updates.courseName !== undefined ? { courseName: updates.courseName.trim() } : {}),
      ...(updates.instructor !== undefined ? { instructor: updates.instructor.trim() } : {}),
      ...(updates.department !== undefined ? { department: updates.department.trim() || undefined } : {}),
      ...(updates.content !== undefined ? { content: updates.content.trim() } : {}),
      ...(updates.tags !== undefined ? { tags: updates.tags } : {}),
      ...(updates.active !== undefined ? { active: updates.active } : {}),
    }

    if (normalizedUpdates.courseName !== undefined && !normalizedUpdates.courseName) {
      throw new Error("Course name is required")
    }
    if (normalizedUpdates.instructor !== undefined && !normalizedUpdates.instructor) {
      throw new Error("Instructor is required")
    }
    if (normalizedUpdates.content !== undefined && !normalizedUpdates.content) {
      throw new Error("Content is required")
    }
    if (normalizedUpdates.overallRating !== undefined) {
      assertRatingRange(normalizedUpdates.overallRating, 1, 10, "Overall rating")
    }
    if (normalizedUpdates.workload !== undefined) {
      assertRatingRange(normalizedUpdates.workload, 1, 5, "Workload")
    }
    if (normalizedUpdates.pace !== undefined) {
      assertRatingRange(normalizedUpdates.pace, 1, 5, "Pace")
    }
    if (normalizedUpdates.gradingFairness !== undefined) {
      assertRatingRange(normalizedUpdates.gradingFairness, 1, 5, "Grading fairness")
    }

    const oldCourseName = review.courseName
    if (updates.tags) {
      await ensureTagMeta(ctx, updates.tags)
    }
    await ctx.db.patch(id, { ...normalizedUpdates, updatedAt: Date.now() })

    const nextCourseName = normalizedUpdates.courseName ?? oldCourseName
    const affectedCourseNames = new Set<string>([oldCourseName, nextCourseName])
    for (const courseName of affectedCourseNames) {
      await syncCourseStatsByName(ctx, courseName)
    }

    return id
  },
})

export const approve = mutation({
  args: { id: v.id("courseReviews") },
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.id)
    if (!review) {
      throw new Error("Review not found")
    }
    await ctx.db.patch(args.id, { status: "approved", updatedAt: Date.now() })
    await syncCourseStatsByName(ctx, review.courseName)

    // Increment author's approved contributions count if author exists
    if (review.authorId) {
      const author = await ctx.db.get(review.authorId)
      if (author) {
        const current = author.approvedContributions || 0
        await ctx.db.patch(author._id, { approvedContributions: current + 1, updatedAt: Date.now() })
      }
    }

    return args.id
  },
})

export const reject = mutation({
  args: { id: v.id("courseReviews") },
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.id)
    if (!review) {
      throw new Error("Review not found")
    }
    await ctx.db.patch(args.id, { status: "rejected", updatedAt: Date.now() })
    await syncCourseStatsByName(ctx, review.courseName)
    return args.id
  },
})

export const remove = mutation({
  args: { id: v.id("courseReviews") },
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.id)
    if (!review) {
      throw new Error("Review not found")
    }
    await ctx.db.delete(args.id)
    await syncCourseStatsByName(ctx, review.courseName)
    return args.id
  },
})

// Assign reviews that have any of the given tags to a target course.
export const assignByTags = mutation({
  args: { tags: v.array(v.string()), targetCourseName: v.string() },
  handler: async (ctx, args) => {
    await ensureTagMeta(ctx, args.tags)
    const all = await ctx.db.query("courseReviews").order("desc").collect()
    const toAssign = all.filter((r) => {
      if (!r.tags || !Array.isArray(r.tags)) return false
      return r.tags.some((t: string) => args.tags.includes(t))
    })

    const updatedCourses = new Set<string>()
    for (const review of toAssign) {
      const oldCourse = review.courseName
      // remove any "[removed course] {OldName}" tag if present
      const removedTagPrefix = "[removed course] "
      const newTags = (review.tags || []).filter((t: string) => !t.startsWith(removedTagPrefix))

      await ctx.db.patch(review._id, {
        courseName: args.targetCourseName,
        tags: newTags,
        active: true,
        updatedAt: Date.now(),
      })

      updatedCourses.add(oldCourse)
      updatedCourses.add(args.targetCourseName)
    }

    for (const courseName of updatedCourses) {
      await syncCourseStatsByName(ctx, courseName)
    }

    return toAssign.length
  },
})

export const commonTags = query({
  handler: async () => {
    return ["shuike", "haoke", "bilei", "kexue", "daima"]
  },
})

// List tags with metadata (color if set), including tags appearing in reviews.
export const listTags = query({
  handler: async (ctx) => {
    const tagMeta = await ctx.db.query("reviewTags").collect()
    const colorByName = new Map(tagMeta.map((item: any) => [item.name, item.color]))
    const tagSet = new Set(tagMeta.map((item: any) => item.name))

    const reviews = await ctx.db.query("courseReviews").collect()
    for (const review of reviews) {
      const tags = Array.isArray(review.tags) ? review.tags : []
      for (const tag of tags) {
        const normalized = normalizeTag(tag)
        if (normalized) tagSet.add(normalized)
      }
    }

    return Array.from(tagSet)
      .map((name) => ({ name, color: colorByName.get(name) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  },
})

// Set or create tag color. If tag does not exist, it will be created.
export const setTagColor = mutation({
  args: {
    tag: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tag = normalizeTag(args.tag)
    if (!tag) {
      throw new Error("Tag is required")
    }

    const existing = await ctx.db
      .query("reviewTags")
      .filter((q: any) => q.eq(q.field("name"), tag))
      .first()

    const now = Date.now()
    if (existing) {
      await ctx.db.patch(existing._id, {
        color: args.color,
        updatedAt: now,
      })
      return existing._id
    }

    return await ctx.db.insert("reviewTags", {
      name: tag,
      color: args.color,
      createdAt: now,
      updatedAt: now,
    })
  },
})

// Edit tags globally: rename a tag or delete it from all reviews.
export const editTag = mutation({
  args: {
    oldTag: v.string(),
    action: v.union(v.literal("rename"), v.literal("delete")),
    newTag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const oldTag = normalizeTag(args.oldTag)
    if (!oldTag) {
      throw new Error("Old tag is required")
    }

    let newTag: string | null = null
    if (args.action === "rename") {
      newTag = normalizeTag(args.newTag || "")
      if (!newTag) {
        throw new Error("New tag is required for rename")
      }
    }

    const all = await ctx.db.query("courseReviews").collect()
    let updated = 0

    for (const review of all) {
      const tags = Array.isArray(review.tags) ? review.tags : []
      if (!tags.includes(oldTag)) continue

      let nextTags = tags.filter((t: string) => t !== oldTag)
      if (args.action === "rename" && newTag) {
        if (!nextTags.includes(newTag)) {
          nextTags = [...nextTags, newTag]
        }
      }

      await ctx.db.patch(review._id, { tags: nextTags, updatedAt: Date.now() })
      updated += 1
    }

    const existing = await ctx.db
      .query("reviewTags")
      .filter((q: any) => q.eq(q.field("name"), oldTag))
      .first()

    if (args.action === "delete") {
      if (existing) {
        await ctx.db.delete(existing._id)
      }
      return updated
    }

    if (args.action === "rename" && newTag) {
      if (existing) {
        await ctx.db.patch(existing._id, { name: newTag, updatedAt: Date.now() })
      } else {
        await ctx.db.insert("reviewTags", {
          name: newTag,
          color: undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }
    }

    return updated
  },
})

export const updateCourseName = mutation({
  args: {
    oldName: v.string(),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("courseReviews")
      .filter((q) => q.eq(q.field("courseName"), args.oldName))
      .collect()

    for (const review of reviews) {
      await ctx.db.patch(review._id, { courseName: args.newName, updatedAt: Date.now() })
    }

    await syncCourseStatsByName(ctx, args.oldName)
    await syncCourseStatsByName(ctx, args.newName)

    return reviews.length
  },
})
