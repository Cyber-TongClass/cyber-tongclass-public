import type { Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

function getDisplayName(user: any) {
  return user?.chineseName?.trim() || user?.englishName?.trim() || user?.username || "用户"
}

function toAlphabetCode(index: number) {
  let current = index
  let result = ""

  do {
    result = String.fromCharCode(65 + (current % 26)) + result
    current = Math.floor(current / 26) - 1
  } while (current >= 0)

  return result
}

function getAnonymousAlias(index: number) {
  return `匿名洞友${toAlphabetCode(index)}`
}

function isAnonymousPostOwner(post: any, authorId: Id<"users"> | string | undefined) {
  return !!post?.isAnonymous && !!authorId && String(post.authorId) === String(authorId)
}

function normalizeSearch(value?: string) {
  return value?.trim().toLowerCase() || ""
}

async function sha256Hex(input: string) {
  const cryptoImpl = (globalThis as any).crypto || (global as any).crypto
  const enc = new TextEncoder().encode(input)
  const hashBuffer = await cryptoImpl.subtle.digest("SHA-256", enc)
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

async function getActorOrThrow(ctx: any, sessionToken: string | undefined) {
  if (!sessionToken) {
    throw new Error("请先登录")
  }

  const tokenHash = await sha256Hex(sessionToken)
  const session = await ctx.db
    .query("authSessions")
    .withIndex("by_tokenHash", (q: any) => q.eq("tokenHash", tokenHash))
    .first()
  if (!session || session.revokedAt || session.expiresAt <= Date.now()) {
    throw new Error("请先登录")
  }

  const actor = await ctx.db.get(session.userId)
  if (!actor) {
    throw new Error("用户不存在")
  }

  return actor
}

function canModerate(actor: any) {
  return actor?.role === "admin" || actor?.role === "super_admin"
}

function assertCanDelete(actor: any, ownerId: Id<"users">) {
  if (canModerate(actor)) return
  if (String(actor._id) !== String(ownerId)) {
    throw new Error("无权删除该内容")
  }
}

async function getUsersMap(ctx: any, ids: Array<Id<"users"> | undefined>) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean).map((id) => String(id))))
  const entries = await Promise.all(
    uniqueIds.map(async (id) => {
      const user = await ctx.db.get(id as Id<"users">)
      return [id, user] as const
    })
  )
  return new Map(entries)
}

function buildAliasMap(post: any, replies: any[]) {
  const map = new Map<string, string>()
  const anonymousItems = [
    { authorId: post.authorId, isAnonymous: post.isAnonymous, createdAt: post.createdAt },
    ...replies.map((reply) => ({
      authorId: reply.authorId,
      isAnonymous: reply.isAnonymous,
      createdAt: reply.createdAt,
    })),
  ]
    .filter((item) => item.isAnonymous && item.authorId && !isAnonymousPostOwner(post, item.authorId))
    .sort((a, b) => a.createdAt - b.createdAt)

  let aliasIndex = 0
  for (const item of anonymousItems) {
    const key = String(item.authorId)
    if (map.has(key)) continue
    map.set(key, getAnonymousAlias(aliasIndex))
    aliasIndex += 1
  }

  return map
}

function mapPostForClient(post: any, usersMap: Map<string, any>, aliasMap: Map<string, string>, replyCount: number) {
  const ownerKey = String(post.authorId)
  const user = usersMap.get(ownerKey)
  const publicAuthorName = post.isAnonymous ? "匿名洞主" : getDisplayName(user)

  return {
    ...post,
    publicAuthorName,
    realAuthorName: getDisplayName(user),
    anonymousAlias: post.isAnonymous ? "匿名洞主" : undefined,
    replyCount,
  }
}

function mapReplyForClient(reply: any, post: any, usersMap: Map<string, any>, aliasMap: Map<string, string>) {
  const ownerKey = String(reply.authorId)
  const user = usersMap.get(ownerKey)
  const publicAuthorName = reply.isAnonymous
    ? isAnonymousPostOwner(post, reply.authorId)
      ? "匿名洞主"
      : aliasMap.get(ownerKey) || "匿名洞友"
    : getDisplayName(user)

  return {
    ...reply,
    publicAuthorName,
    realAuthorName: getDisplayName(user),
    anonymousAlias: reply.isAnonymous
      ? isAnonymousPostOwner(post, reply.authorId)
        ? "匿名洞主"
        : aliasMap.get(ownerKey) || "匿名洞友"
      : undefined,
  }
}

export const list = query({
  args: {
    sessionToken: v.string(),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getActorOrThrow(ctx, args.sessionToken)
    const posts = await ctx.db.query("treeholePosts").order("desc").collect()
    const replies = await ctx.db.query("treeholeReplies").collect()
    const repliesByPost = new Map<string, any[]>()

    for (const reply of replies) {
      const key = String(reply.postId)
      const bucket = repliesByPost.get(key) || []
      bucket.push(reply)
      repliesByPost.set(key, bucket)
    }

    const usersMap = await getUsersMap(
      ctx,
      posts.map((post) => post.authorId).concat(replies.map((reply) => reply.authorId))
    )
    const search = normalizeSearch(args.search)

    const mapped = posts.map((post) => {
      const threadReplies = repliesByPost.get(String(post._id)) || []
      const aliasMap = buildAliasMap(post, threadReplies)
      return mapPostForClient(post, usersMap, aliasMap, threadReplies.length)
    })

    if (!search) return mapped

    return mapped.filter((post) => {
      return (
        post.title.toLowerCase().includes(search) ||
        post.content.toLowerCase().includes(search) ||
        post.publicAuthorName.toLowerCase().includes(search)
      )
    })
  },
})

export const getById = query({
  args: {
    sessionToken: v.string(),
    id: v.id("treeholePosts"),
  },
  handler: async (ctx, args) => {
    await getActorOrThrow(ctx, args.sessionToken)
    const post = await ctx.db.get(args.id)
    if (!post) return null

    const replies = await ctx.db.query("treeholeReplies").withIndex("by_post", (q) => q.eq("postId", args.id)).collect()
    replies.sort((a, b) => a.createdAt - b.createdAt)

    const usersMap = await getUsersMap(ctx, [post.authorId, ...replies.map((reply) => reply.authorId)])
    const aliasMap = buildAliasMap(post, replies)

    return {
      post: mapPostForClient(post, usersMap, aliasMap, replies.length),
      replies: replies.map((reply) => mapReplyForClient(reply, post, usersMap, aliasMap)),
    }
  },
})

export const listAdmin = query({
  args: {
    sessionToken: v.string(),
    actorId: v.optional(v.id("users")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await getActorOrThrow(ctx, args.sessionToken)
    if (!canModerate(actor)) {
      throw new Error("无权访问树洞管理")
    }

    const posts = await ctx.db.query("treeholePosts").order("desc").collect()
    const replies = await ctx.db.query("treeholeReplies").collect()
    const repliesByPost = new Map<string, any[]>()

    for (const reply of replies) {
      const key = String(reply.postId)
      const bucket = repliesByPost.get(key) || []
      bucket.push(reply)
      repliesByPost.set(key, bucket)
    }

    const usersMap = await getUsersMap(
      ctx,
      posts.map((post) => post.authorId).concat(replies.map((reply) => reply.authorId))
    )
    const search = normalizeSearch(args.search)

    const mapped = posts.map((post) => {
      const threadReplies = repliesByPost.get(String(post._id)) || []
      const aliasMap = buildAliasMap(post, threadReplies)
      const base = mapPostForClient(post, usersMap, aliasMap, threadReplies.length)
      return {
        ...base,
        authorOrganization: usersMap.get(String(post.authorId))?.organization,
        authorCohort: usersMap.get(String(post.authorId))?.cohort,
      }
    })

    if (!search) return mapped

    return mapped.filter((post) => {
      return (
        post.title.toLowerCase().includes(search) ||
        post.content.toLowerCase().includes(search) ||
        post.publicAuthorName.toLowerCase().includes(search) ||
        post.realAuthorName.toLowerCase().includes(search)
      )
    })
  },
})

export const getByIdAdmin = query({
  args: {
    sessionToken: v.string(),
    actorId: v.optional(v.id("users")),
    id: v.id("treeholePosts"),
  },
  handler: async (ctx, args) => {
    const actor = await getActorOrThrow(ctx, args.sessionToken)
    if (!canModerate(actor)) {
      throw new Error("无权访问树洞管理")
    }

    const detail = await ctx.db.get(args.id)
    if (!detail) return null

    const replies = await ctx.db.query("treeholeReplies").withIndex("by_post", (q) => q.eq("postId", args.id)).collect()
    replies.sort((a, b) => a.createdAt - b.createdAt)
    const usersMap = await getUsersMap(ctx, [detail.authorId, ...replies.map((reply) => reply.authorId)])
    const aliasMap = buildAliasMap(detail, replies)

    const postUser = usersMap.get(String(detail.authorId))

    return {
      post: {
        ...mapPostForClient(detail, usersMap, aliasMap, replies.length),
        authorOrganization: postUser?.organization,
        authorCohort: postUser?.cohort,
      },
      replies: replies.map((reply) => {
        const user = usersMap.get(String(reply.authorId))
        return {
          ...mapReplyForClient(reply, detail, usersMap, aliasMap),
          authorOrganization: user?.organization,
          authorCohort: user?.cohort,
        }
      }),
    }
  },
})

export const createPost = mutation({
  args: {
    sessionToken: v.string(),
    title: v.string(),
    content: v.string(),
    isAnonymous: v.optional(v.boolean()),
    authorId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const actor = await getActorOrThrow(ctx, args.sessionToken)

    const title = args.title.trim()
    const content = args.content.trim()
    if (!title || !content) {
      throw new Error("标题和内容不能为空")
    }

    const now = Date.now()
    return ctx.db.insert("treeholePosts", {
      title,
      content,
      isAnonymous: args.isAnonymous ?? false,
      authorId: actor._id,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const createReply = mutation({
  args: {
    sessionToken: v.string(),
    postId: v.id("treeholePosts"),
    content: v.string(),
    isAnonymous: v.optional(v.boolean()),
    authorId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const actor = await getActorOrThrow(ctx, args.sessionToken)

    const post = await ctx.db.get(args.postId)
    if (!post) {
      throw new Error("帖子不存在")
    }

    const content = args.content.trim()
    if (!content) {
      throw new Error("回复内容不能为空")
    }

    const now = Date.now()
    return ctx.db.insert("treeholeReplies", {
      postId: args.postId,
      content,
      isAnonymous: args.isAnonymous ?? false,
      authorId: actor._id,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const removePost = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("treeholePosts"),
    actorId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const actor = await getActorOrThrow(ctx, args.sessionToken)
    const post = await ctx.db.get(args.id)
    if (!post) {
      throw new Error("帖子不存在")
    }

    assertCanDelete(actor, post.authorId)

    const replies = await ctx.db.query("treeholeReplies").withIndex("by_post", (q) => q.eq("postId", args.id)).collect()
    await Promise.all(replies.map((reply) => ctx.db.delete(reply._id)))
    await ctx.db.delete(args.id)
    return args.id
  },
})

export const removeReply = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("treeholeReplies"),
    actorId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const actor = await getActorOrThrow(ctx, args.sessionToken)
    const reply = await ctx.db.get(args.id)
    if (!reply) {
      throw new Error("回复不存在")
    }

    assertCanDelete(actor, reply.authorId)

    await ctx.db.delete(args.id)
    return args.id
  },
})
