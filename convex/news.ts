import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

const audienceValidator = v.union(
  v.literal("undergraduate"),
  v.literal("graduate"),
  v.literal("teacher"),
)

function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]
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
    return allNews.slice(skip, skip + limit)
  },
})

// Get all news including unpublished (admin only)
export const listAll = query({
  args: {
    skip: v.optional(v.number()),
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
  args: { id: v.id("news") },
  handler: async (ctx, args) => {
    const news = await ctx.db.get(args.id)
    return news
  },
})

// Create a new news
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    sourceUrl: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    showOnHomepage: v.optional(v.boolean()),
    homepageSubtitle: v.optional(v.string()),
    authorId: v.optional(v.id("users")),
    category: v.string(),
    audiences: v.optional(v.array(audienceValidator)),
    tags: v.optional(v.array(v.string())),
    publishedAt: v.optional(v.number()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { title, content, category } = args
    let authorId = args.authorId

    if (!authorId) {
      const fallbackUser = await ctx.db.query("users").first()
      if (!fallbackUser) {
        throw new Error("No user found to set as news author")
      }
      authorId = fallbackUser._id
    }

    const newsId = await ctx.db.insert("news", {
      title,
      content,
      sourceUrl: args.sourceUrl?.trim() || undefined,
      coverImageUrl: args.coverImageUrl?.trim() || undefined,
      showOnHomepage: args.showOnHomepage || false,
      homepageSubtitle: args.homepageSubtitle?.trim() || undefined,
      authorId,
      category,
      audiences: args.audiences,
      tags: args.tags ? normalizeTags(args.tags) : undefined,
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
    id: v.id("news"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    showOnHomepage: v.optional(v.boolean()),
    homepageSubtitle: v.optional(v.string()),
    category: v.optional(v.string()),
    audiences: v.optional(v.array(audienceValidator)),
    tags: v.optional(v.array(v.string())),
    publishedAt: v.optional(v.number()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    const news = await ctx.db.get(id)
    if (!news) {
      throw new Error("News not found")
    }
    await ctx.db.patch(id, {
      ...updates,
      ...(updates.sourceUrl !== undefined ? { sourceUrl: updates.sourceUrl.trim() || undefined } : {}),
      ...(updates.coverImageUrl !== undefined ? { coverImageUrl: updates.coverImageUrl.trim() || undefined } : {}),
      ...(updates.homepageSubtitle !== undefined ? { homepageSubtitle: updates.homepageSubtitle.trim() || undefined } : {}),
      ...(updates.tags !== undefined ? { tags: normalizeTags(updates.tags) } : {}),
      updatedAt: Date.now(),
    })
    return id
  },
})

// Delete a news
export const remove = mutation({
  args: { id: v.id("news") },
  handler: async (ctx, args) => {
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
