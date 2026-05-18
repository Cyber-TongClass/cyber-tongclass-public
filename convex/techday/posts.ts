import { mutation, query } from "../_generated/server"
import { v } from "convex/values"
import {
  canViewPost,
  ensureUnique,
  isTechDayAdmin,
  normalizeLongText,
  normalizeStringList,
  normalizeText,
  postVisibilityValidator,
  resolvePrincipal,
} from "./lib"

const actorArgs = {
  mainSessionToken: v.optional(v.string()),
  techDaySessionToken: v.optional(v.string()),
}

const postArgs = {
  title: v.string(),
  date: v.string(),
  category: v.optional(v.string()),
  summary: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  visibility: v.array(postVisibilityValidator),
  published: v.optional(v.boolean()),
  content: v.string(),
}

const slugify = (value: string) => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
  return slug || "post"
}

const buildSummary = (markdown: string) => {
  const clean = markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`+/g, "")
    .replace(/[*_>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return clean.length > 160 ? `${clean.slice(0, 160)}...` : clean
}

const normalizeVisibility = (visibility: Array<"public" | "authenticated" | "volunteer" | "author" | "reviewer" | "admin">) => {
  const list = Array.from(new Set(visibility))
  return list.length ? list : ["public"]
}

const serializePost = (post: any, includeContent = false) => ({
  _id: post._id,
  slug: post.slug,
  title: post.title,
  date: post.date,
  category: post.category,
  summary: post.summary,
  tags: post.tags,
  visibility: post.visibility,
  authorName: post.authorName,
  authorId: post.authorId,
  published: post.published,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  content: includeContent ? post.content : undefined,
})

const requirePublisher = async (ctx: any, args: any) => {
  const principal = await resolvePrincipal(ctx, args)
  const user = principal.techDayUser
  if (isTechDayAdmin(principal) || user?.canPublishNews) return { principal, user }
  throw new Error("需要新闻发布权限")
}

export const listPublished = query({
  args: actorArgs,
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    const posts = await ctx.db
      .query("techDayPosts")
      .withIndex("by_published_date", (q) => q.eq("published", true))
      .order("desc")
      .collect()
    return posts.filter((post) => canViewPost(principal, post)).map((post) => serializePost(post))
  },
})

export const getBySlug = query({
  args: { ...actorArgs, slug: v.string() },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    const post = await ctx.db.query("techDayPosts").withIndex("by_slug", (q) => q.eq("slug", args.slug)).first()
    if (!post) return null
    if (!canViewPost(principal, post)) throw new Error("无权查看该公告")
    return serializePost(post, true)
  },
})

export const listManage = query({
  args: actorArgs,
  handler: async (ctx, args) => {
    const { user } = await requirePublisher(ctx, args)
    let posts = await ctx.db.query("techDayPosts").order("desc").collect()
    if (user?.role !== "admin") posts = posts.filter((post) => post.authorId === user?._id)
    return posts.map((post) => serializePost(post))
  },
})

export const exportRows = query({
  args: actorArgs,
  handler: async (ctx, args) => {
    const { user } = await requirePublisher(ctx, args)
    let posts = await ctx.db.query("techDayPosts").order("desc").collect()
    if (user?.role !== "admin") posts = posts.filter((post) => post.authorId === user?._id)
    return posts.map((post) => ({
      slug: post.slug,
      title: post.title,
      author: post.authorName || "",
      date: post.date,
      category: post.category || "",
      visibility: post.visibility?.join(";") || "public",
      published: post.published ? "已发布" : "草稿",
      summary: post.summary || "",
      tags: post.tags?.join(";") || "",
      created_at: new Date(post.createdAt).toISOString(),
      updated_at: new Date(post.updatedAt).toISOString(),
    }))
  },
})

export const create = mutation({
  args: { ...actorArgs, ...postArgs },
  handler: async (ctx, args) => {
    const { user } = await requirePublisher(ctx, args)
    const title = normalizeText(args.title)
    if (!title) throw new Error("标题不能为空")
    const content = normalizeLongText(args.content)
    if (!content) throw new Error("正文不能为空")
    const baseSlug = `${args.date || new Date().toISOString().slice(0, 10)}-${slugify(title)}`
    let slug = baseSlug
    let counter = 1
    while (await ctx.db.query("techDayPosts").withIndex("by_slug", (q: any) => q.eq("slug", slug)).first()) {
      counter += 1
      slug = `${baseSlug}-${counter}`
    }
    const now = Date.now()
    return await ctx.db.insert("techDayPosts", {
      slug,
      title,
      date: args.date || new Date().toISOString().slice(0, 10),
      category: args.category ? normalizeText(args.category) : undefined,
      summary: args.summary ? normalizeText(args.summary) : buildSummary(content),
      tags: normalizeStringList(args.tags),
      visibility: normalizeVisibility(args.visibility) as any,
      authorName: user?.name,
      authorId: user?._id,
      published: Boolean(args.published),
      content,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: { ...actorArgs, id: v.id("techDayPosts"), slug: v.string(), ...postArgs },
  handler: async (ctx, args) => {
    const { user } = await requirePublisher(ctx, args)
    const post = await ctx.db.get(args.id)
    if (!post) throw new Error("公告不存在")
    if (user?.role !== "admin" && post.authorId !== user?._id) throw new Error("无权编辑该公告")
    const slug = slugify(args.slug)
    await ensureUnique(ctx, "techDayPosts", "by_slug", "slug", slug, "slug 已存在", String(args.id))
    const content = normalizeLongText(args.content)
    await ctx.db.patch(args.id, {
      slug,
      title: normalizeText(args.title),
      date: args.date,
      category: args.category ? normalizeText(args.category) : undefined,
      summary: args.summary ? normalizeText(args.summary) : buildSummary(content),
      tags: normalizeStringList(args.tags),
      visibility: normalizeVisibility(args.visibility) as any,
      published: Boolean(args.published),
      content,
      updatedAt: Date.now(),
    })
    return args.id
  },
})

export const remove = mutation({
  args: { ...actorArgs, id: v.id("techDayPosts") },
  handler: async (ctx, args) => {
    const { user } = await requirePublisher(ctx, args)
    const post = await ctx.db.get(args.id)
    if (!post) throw new Error("公告不存在")
    if (user?.role !== "admin" && post.authorId !== user?._id) throw new Error("无权删除该公告")
    await ctx.db.delete(args.id)
    return args.id
  },
})

export const publish = mutation({
  args: { ...actorArgs, id: v.id("techDayPosts"), published: v.boolean() },
  handler: async (ctx, args) => {
    const { user } = await requirePublisher(ctx, args)
    const post = await ctx.db.get(args.id)
    if (!post) throw new Error("公告不存在")
    if (user?.role !== "admin" && post.authorId !== user?._id) throw new Error("无权发布该公告")
    await ctx.db.patch(args.id, { published: args.published, updatedAt: Date.now() })
    return args.id
  },
})
