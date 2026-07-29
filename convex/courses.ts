import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { getUserBySession } from "./reviewer/lib"
import { requireContentAdmin, requireTongClassMember } from "./lib/contentAuthorization"

// Get all courses with review statistics
export const list = query({
  args: {
    skip: v.optional(v.number()),
    limit: v.optional(v.number()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    requireTongClassMember(await getUserBySession(ctx, args.sessionToken))
    const allCourses = (await ctx.db.query("courses").order("desc").collect()).filter(
      (course) => course.isActive !== false
    )
    const skip = args.skip || 0
    const limit = args.limit || 50
    return allCourses.slice(skip, skip + limit)
  },
})

// Get a single course by ID
export const getById = query({
  args: { id: v.id("courses"), sessionToken: v.string() },
  handler: async (ctx, args) => {
    requireTongClassMember(await getUserBySession(ctx, args.sessionToken))
    const course = await ctx.db.get(args.id)
    return course?.isActive === false ? null : course
  },
})

// Get a single course by name
export const getByName = query({
  args: { name: v.string(), sessionToken: v.string() },
  handler: async (ctx, args) => {
    requireTongClassMember(await getUserBySession(ctx, args.sessionToken))
    const courses = await ctx.db
      .query("courses")
      .filter((q) => q.eq(q.field("name"), args.name))
      .collect()
    return courses.find((course) => course.isActive !== false) || null
  },
})

// Create a new course
export const create = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    isTongClassCourse: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    requireContentAdmin(await getUserBySession(ctx, args.sessionToken))
    const normalizedName = args.name.trim()
    if (!normalizedName) {
      throw new Error("Course name is required")
    }

    // Check if course already exists
    const existing = await ctx.db
      .query("courses")
      .filter((q) => q.eq(q.field("name"), normalizedName))
      .collect()
      .then((courses) => courses.find((course) => course.isActive !== false))

    if (existing) {
      throw new Error("Course already exists")
    }

    const courseId = await ctx.db.insert("courses", {
      name: normalizedName,
      isTongClassCourse: args.isTongClassCourse ?? false,
      reviewCount: 0,
      averageRating: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    return courseId
  },
})

// Update a course
export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("courses"),
    name: v.optional(v.string()),
    isTongClassCourse: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    requireContentAdmin(await getUserBySession(ctx, args.sessionToken))
    const { id, sessionToken: _sessionToken, ...updates } = args
    const course = await ctx.db.get(id)

    if (!course) {
      throw new Error("Course not found")
    }

    // Check if new name already exists (if name is being changed)
    const normalizedName = updates.name?.trim()
    if (normalizedName && normalizedName !== course.name) {
      const existing = await ctx.db
        .query("courses")
        .filter((q) => q.eq(q.field("name"), normalizedName))
        .collect()
        .then((courses) =>
          courses.find((item) => item.isActive !== false && item._id !== id)
        )

      if (existing) {
        throw new Error("Course name already exists")
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      ...(normalizedName ? { name: normalizedName } : {}),
      updatedAt: Date.now(),
    })
    return id
  },
})

// Update course review statistics
export const updateReviewStats = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("courses"),
    reviewCount: v.number(),
    averageRating: v.number(),
  },
  handler: async (ctx, args) => {
    requireContentAdmin(await getUserBySession(ctx, args.sessionToken))
    const course = await ctx.db.get(args.id)

    if (!course) {
      throw new Error("Course not found")
    }

    await ctx.db.patch(args.id, {
      reviewCount: args.reviewCount,
      averageRating: args.averageRating,
      updatedAt: Date.now(),
    })
    return args.id
  },
})

// Delete a course
export const remove = mutation({
  args: { id: v.id("courses"), sessionToken: v.string() },
  handler: async (ctx, args) => {
    requireContentAdmin(await getUserBySession(ctx, args.sessionToken))
    const course = await ctx.db.get(args.id)

    if (!course) {
      throw new Error("Course not found")
    }

    // Hard-delete related reviews first so the course disappears everywhere,
    // including direct course detail pages and admin review lists.
    const reviews = await ctx.db
      .query("courseReviews")
      .filter((q) => q.eq(q.field("courseName"), course.name))
      .collect()

    for (const review of reviews) {
      await ctx.db.delete(review._id)
    }

    await ctx.db.delete(args.id)

    return args.id
  },
})

// Get courses count
export const count = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    requireTongClassMember(await getUserBySession(ctx, args.sessionToken))
    const courses = await ctx.db.query("courses").collect()
    return courses.filter((course) => course.isActive !== false).length
  },
})

// Search courses by name
export const search = query({
  args: { query: v.string(), sessionToken: v.string() },
  handler: async (ctx, args) => {
    requireTongClassMember(await getUserBySession(ctx, args.sessionToken))
    const all = (await ctx.db.query("courses").collect()).filter((course) => course.isActive !== false)
    const q = args.query.trim().toLowerCase()
    if (!q) return []
    const filtered = all.filter((c) => c.name && c.name.toLowerCase().includes(q)).slice(0, 20)
    return filtered
  },
})
