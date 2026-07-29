import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { getUserBySession } from "./reviewer/lib"
import { requireContentAdmin } from "./lib/contentAuthorization"

function publicNewsDto(news: any) {
  const {
    authorId: _authorId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...publicFields
  } = news
  return publicFields
}

// Get all published news with pagination
export const list = query({
  args: {
    skip: v.optional(v.number()),
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("news").filter((q) => q.eq(q.field("isPublished"), true))
    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category))
    }
    const allNews = await query.order("desc").collect()
    const skip = args.skip || 0
    const limit = args.limit || 50
    return allNews.slice(skip, skip + limit).map(publicNewsDto)
  },
})

// Get all news including unpublished (admin only)
export const listAll = query({
  args: {
    sessionToken: v.string(),
    skip: v.optional(v.number()),
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireContentAdmin(await getUserBySession(ctx, args.sessionToken))
    let query = ctx.db.query("news")
    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category))
    }
    const allNews = await query.order("desc").collect()
    const skip = args.skip || 0
    const limit = args.limit || 50
    return allNews.slice(skip, skip + limit)
  },
})

// Get a single news by ID
export const getById = query({
  args: { id: v.id("news"), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const news = await ctx.db.get(args.id)
    if (news && !news.isPublished) {
      if (!args.sessionToken) return null
      requireContentAdmin(await getUserBySession(ctx, args.sessionToken))
      return news
    }
    return news ? publicNewsDto(news) : null
  },
})

// Create a new news
export const create = mutation({
  args: {
    sessionToken: v.string(),
    title: v.string(),
    content: v.string(),
    sourceUrl: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    showOnHomepage: v.optional(v.boolean()),
    homepageSubtitle: v.optional(v.string()),
    authorId: v.optional(v.id("users")),
    category: v.string(),
    publishedAt: v.optional(v.number()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const actor = requireContentAdmin(await getUserBySession(ctx, args.sessionToken))
    const { title, content, category } = args
    const authorId = args.authorId || actor._id

    const newsId = await ctx.db.insert("news", {
      title,
      content,
      sourceUrl: args.sourceUrl?.trim() || undefined,
      coverImageUrl: args.coverImageUrl?.trim() || undefined,
      showOnHomepage: args.showOnHomepage || false,
      homepageSubtitle: args.homepageSubtitle?.trim() || undefined,
      authorId,
      category,
      publishedAt: args.publishedAt || Date.now(),
      isPublished: args.isPublished || false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    return newsId
  },
})

// Update a news
export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("news"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    showOnHomepage: v.optional(v.boolean()),
    homepageSubtitle: v.optional(v.string()),
    category: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    requireContentAdmin(await getUserBySession(ctx, args.sessionToken))
    const { id, sessionToken: _sessionToken, ...updates } = args
    const news = await ctx.db.get(id)
    if (!news) {
      throw new Error("News not found")
    }
    await ctx.db.patch(id, {
      ...updates,
      ...(updates.sourceUrl !== undefined ? { sourceUrl: updates.sourceUrl.trim() || undefined } : {}),
      ...(updates.coverImageUrl !== undefined ? { coverImageUrl: updates.coverImageUrl.trim() || undefined } : {}),
      ...(updates.homepageSubtitle !== undefined ? { homepageSubtitle: updates.homepageSubtitle.trim() || undefined } : {}),
      updatedAt: Date.now(),
    })
    return id
  },
})

// Delete a news
export const remove = mutation({
  args: { id: v.id("news"), sessionToken: v.string() },
  handler: async (ctx, args) => {
    requireContentAdmin(await getUserBySession(ctx, args.sessionToken))
    const news = await ctx.db.get(args.id)
    if (!news) {
      throw new Error("News not found")
    }
    await ctx.db.delete(args.id)
    return args.id
  },
})

// Get news count
export const count = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let query = ctx.db.query("news").filter((q) => q.eq(q.field("isPublished"), true))
    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category))
    }
    const news = await query.collect()
    return news.length
  },
})
