import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { ensurePublicationVenue } from "./publicationVenues"

// Get all publications with pagination
export const list = query({
  args: {
    skip: v.optional(v.number()),
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("publications")

    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category))
    }
    if (args.year) {
      query = query.filter((q) => q.eq(q.field("year"), args.year))
    }

    const allPublications = await query.order("desc").collect()
    const skip = args.skip || 0
    const limit = args.limit || 50
    return allPublications.slice(skip, skip + limit)
  },
})

// Get publications by user ID
export const listByUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const publications = await ctx.db
      .query("publications")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .order("desc")
      .collect()

    return publications
  },
})

// Get a single publication by ID
export const getById = query({
  args: {
    id: v.id("publications"),
  },
  handler: async (ctx, args) => {
    const publication = await ctx.db.get(args.id)
    return publication
  },
})

// Create a new publication
export const create = mutation({
  args: {
    title: v.string(),
    authors: v.array(v.string()),
    venue: v.string(),
    year: v.number(),
    abstract: v.string(),
    url: v.optional(v.string()),
    category: v.string(),
    subCategory: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { title, authors, venue, year, abstract, category, userId } = args

    const publicationId = await ctx.db.insert("publications", {
      title,
      authors,
      venue,
      year,
      abstract,
      url: args.url,
      category,
      subCategory: args.subCategory,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    await ensurePublicationVenue(ctx, venue, userId)

    return publicationId
  },
})

// Update a publication
export const update = mutation({
  args: {
    id: v.id("publications"),
    title: v.optional(v.string()),
    authors: v.optional(v.array(v.string())),
    venue: v.optional(v.string()),
    year: v.optional(v.number()),
    abstract: v.optional(v.string()),
    url: v.optional(v.string()),
    category: v.optional(v.string()),
    subCategory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    const publication = await ctx.db.get(id)

    if (!publication) {
      throw new Error("Publication not found")
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    })
    if (updates.venue !== undefined) {
      await ensurePublicationVenue(ctx, updates.venue, publication.userId)
    }

    return id
  },
})

// Delete a publication
export const remove = mutation({
  args: { id: v.id("publications") },
  handler: async (ctx, args) => {
    const publication = await ctx.db.get(args.id)

    if (!publication) {
      throw new Error("Publication not found")
    }

    await ctx.db.delete(args.id)
    return args.id
  },
})

// Get publications count
export const count = query({
  args: {
    category: v.optional(v.string()),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("publications")

    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category))
    }
    if (args.year) {
      query = query.filter((q) => q.eq(q.field("year"), args.year))
    }

    const publications = await query.collect()
    return publications.length
  },
})

// Search publications
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("publications").collect()
    const q = args.query.trim().toLowerCase()
    if (!q) return []
    const filtered = all.filter((p) => {
      const inTitle = p.title && p.title.toLowerCase().includes(q)
      const inAuthors = p.authors && p.authors.join(" ").toLowerCase().includes(q)
      return inTitle || inAuthors
    }).slice(0, 20)
    return filtered
  },
})
