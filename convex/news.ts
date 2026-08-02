import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { getUserBySession } from "./reviewer/lib"
import {
  requireContentManager,
  requireSuperAdminForDirectContentCreate,
} from "./lib/contentAuthorization"
import { loadOAUserScopeContext, userMatchesOAUserScope } from "./lib/oaWorkflow"

function canViewNews(news: { targetScope?: any }, actor: any | null, scopeContext?: any) {
  if (news.targetScope) {
    if (!actor || !scopeContext) return false
    return userMatchesOAUserScope(
      actor,
      news.targetScope,
      scopeContext.researchGroupId,
      scopeContext.userGroupIds,
    )
  }
  return true
}

async function loadNewsViewer(ctx: any, sessionToken?: string) {
  if (!sessionToken) return { actor: null, scopeContext: undefined }
  try {
    const actor = await getUserBySession(ctx, sessionToken)
    const scopeContext = await loadOAUserScopeContext(ctx, actor._id)
    return { actor, scopeContext }
  } catch {
    return { actor: null, scopeContext: undefined }
  }
}

function publicNewsDto(news: any) {
  const {
    authorId: _authorId,
    targetScope: _targetScope,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...publicFields
  } = news
  return publicFields
}

function managerNewsDto(news: any) {
  return {
    _id: news._id,
    title: news.title,
    content: news.content,
    sourceUrl: news.sourceUrl,
    coverImageUrl: news.coverImageUrl,
    showOnHomepage: news.showOnHomepage,
    homepageSubtitle: news.homepageSubtitle,
    category: news.category,
    publishedAt: news.publishedAt,
    isPublished: news.isPublished,
  }
}

// Get all published news with pagination
export const list = query({
  args: {
    skip: v.optional(v.number()),
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("news").filter((q) => q.eq(q.field("isPublished"), true))
    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category))
    }
    const allNews = await query.order("desc").collect()
    const { actor, scopeContext } = await loadNewsViewer(ctx, args.sessionToken)
    const visibleNews = allNews.filter((news) => canViewNews(news, actor, scopeContext))
    const skip = args.skip || 0
    const limit = args.limit || 50
    return visibleNews.slice(skip, skip + limit).map(publicNewsDto)
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
    const actor = await getUserBySession(ctx, args.sessionToken)
    await requireContentManager(ctx, actor, "news")
    let query = ctx.db.query("news")
    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category))
    }
    const allNews = await query.order("desc").collect()
    const skip = args.skip || 0
    const limit = args.limit || 50
    return allNews.slice(skip, skip + limit).map(managerNewsDto)
  },
})

// Get a single news by ID
export const getById = query({
  args: { id: v.id("news"), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const news = await ctx.db.get(args.id)
    if (news && !news.isPublished) {
      if (!args.sessionToken) return null
      const actor = await getUserBySession(ctx, args.sessionToken)
      await requireContentManager(ctx, actor, "news")
      return managerNewsDto(news)
    }
    if (!news) return null
    const { actor, scopeContext } = await loadNewsViewer(ctx, args.sessionToken)
    return canViewNews(news, actor, scopeContext) ? publicNewsDto(news) : null
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
    const actor = requireSuperAdminForDirectContentCreate(
      await getUserBySession(ctx, args.sessionToken),
    )
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
    const actor = await getUserBySession(ctx, args.sessionToken)
    await requireContentManager(ctx, actor, "news")
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
    const actor = await getUserBySession(ctx, args.sessionToken)
    await requireContentManager(ctx, actor, "news")
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
  args: {
    category: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("news").filter((q) => q.eq(q.field("isPublished"), true))
    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category))
    }
    const news = await query.collect()
    const { actor, scopeContext } = await loadNewsViewer(ctx, args.sessionToken)
    return news.filter((news) => canViewNews(news, actor, scopeContext)).length
  },
})
