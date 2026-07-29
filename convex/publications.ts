import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { ensurePublicationVenue } from "./publicationVenues"
import { getUserBySession } from "./reviewer/lib"
import { assertPublicationWriteAccess } from "./lib/contentAuthorization"

function publicPublicationDto(publication: any) {
  const {
    userId: _userId,
    siteScope: _siteScope,
    visibility: _visibility,
    ...publicFields
  } = publication
  return publicFields
}

async function optionalActor(ctx: any, sessionToken?: string) {
  if (!sessionToken) return null
  try {
    return await getUserBySession(ctx, sessionToken)
  } catch {
    return null
  }
}

function isContentAdmin(actor: any) {
  return actor?.role === "admin" || actor?.role === "super_admin"
}

function isPublicationOwner(actor: any, publication: any) {
  return Boolean(actor) && String(actor._id) === String(publication.userId)
}

function mayViewPublication(actor: any, publication: any) {
  if (isContentAdmin(actor)) return true
  if (publication.siteScope === "institute") return false
  return publication.visibility !== "hidden" || isPublicationOwner(actor, publication)
}

function publicationForActor(actor: any, publication: any) {
  return isContentAdmin(actor) || isPublicationOwner(actor, publication)
    ? publication
    : publicPublicationDto(publication)
}

// Get all publications with pagination
export const list = query({
  args: {
    sessionToken: v.optional(v.string()),
    skip: v.optional(v.number()),
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actor = await optionalActor(ctx, args.sessionToken)
    let query = ctx.db.query("publications")

    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category))
    }
    if (args.year) {
      query = query.filter((q) => q.eq(q.field("year"), args.year))
    }

    const allPublications = await query.order("desc").collect()
    const visiblePublications = allPublications.filter((publication) => mayViewPublication(actor, publication))
    const skip = args.skip || 0
    const limit = args.limit || 50
    const page = visiblePublications.slice(skip, skip + limit)
    return page.map((publication) => publicationForActor(actor, publication))
  },
})

// Get publications by user ID
export const listByUser = query({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const isAdmin = actor.role === "admin" || actor.role === "super_admin"
    if (!isAdmin && String(actor._id) !== String(args.userId)) throw new Error("无权查看该用户的成果记录")
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
    sessionToken: v.optional(v.string()),
    id: v.id("publications"),
  },
  handler: async (ctx, args) => {
    const publication = await ctx.db.get(args.id)
    if (!publication) return null
    const actor = await optionalActor(ctx, args.sessionToken)
    if (!mayViewPublication(actor, publication)) return null
    return publicationForActor(actor, publication)
  },
})

// Create a new publication
export const create = mutation({
  args: {
    sessionToken: v.string(),
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
    const actor = await getUserBySession(ctx, args.sessionToken)
    assertPublicationWriteAccess(actor, args.userId)
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
    sessionToken: v.string(),
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
    const actor = await getUserBySession(ctx, args.sessionToken)
    const { id, sessionToken: _sessionToken, ...updates } = args
    const publication = await ctx.db.get(id)

    if (!publication) {
      throw new Error("Publication not found")
    }
    assertPublicationWriteAccess(actor, publication.userId)

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
  args: { id: v.id("publications"), sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const publication = await ctx.db.get(args.id)

    if (!publication) {
      throw new Error("Publication not found")
    }
    assertPublicationWriteAccess(actor, publication.userId)

    await ctx.db.delete(args.id)
    return args.id
  },
})

// Get publications count
export const count = query({
  args: {
    sessionToken: v.optional(v.string()),
    category: v.optional(v.string()),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actor = await optionalActor(ctx, args.sessionToken)
    let query = ctx.db.query("publications")

    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category))
    }
    if (args.year) {
      query = query.filter((q) => q.eq(q.field("year"), args.year))
    }

    const publications = await query.collect()
    return publications.filter((publication) => mayViewPublication(actor, publication)).length
  },
})

// Search publications
export const search = query({
  args: { query: v.string(), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await optionalActor(ctx, args.sessionToken)
    const stored = await ctx.db.query("publications").collect()
    const all = stored.filter((publication) => mayViewPublication(actor, publication))
    const q = args.query.trim().toLowerCase()
    if (!q) return []
    const filtered = all.filter((p) => {
      const inTitle = p.title && p.title.toLowerCase().includes(q)
      const inAuthors = p.authors && p.authors.join(" ").toLowerCase().includes(q)
      return inTitle || inAuthors
    }).slice(0, 20)
    return filtered.map((publication) => publicationForActor(actor, publication))
  },
})
