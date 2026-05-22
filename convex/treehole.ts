import type { Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { getVoteSummaryMap } from "./contentVotes"

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

function isValidSerialNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
}

function formatSerialNumber(value: number) {
  return String(value).padStart(7, "0")
}

function sortPostsByCreationOrder(posts: any[]) {
  return [...posts].sort((a, b) => {
    const createdDelta = (a.createdAt || 0) - (b.createdAt || 0)
    if (createdDelta !== 0) return createdDelta
    return String(a._id).localeCompare(String(b._id))
  })
}

function buildPostSerialMap(posts: any[]) {
  const serialMap = new Map<string, number>()
  const used = new Set<number>()
  let nextSerial = 1

  for (const post of sortPostsByCreationOrder(posts)) {
    let serial = isValidSerialNumber(post.serialNumber) ? post.serialNumber : undefined

    if (!serial || used.has(serial)) {
      while (used.has(nextSerial)) nextSerial += 1
      serial = nextSerial
    }

    serialMap.set(String(post._id), serial)
    used.add(serial)
    nextSerial = Math.max(nextSerial, serial + 1)
  }

  return serialMap
}

async function getNextTreeholeSerialNumber(ctx: any) {
  const posts = await ctx.db.query("treeholePosts").collect()
  const serialMap = buildPostSerialMap(posts)
  const currentMax = Array.from(serialMap.values()).reduce((max, serial) => Math.max(max, serial), 0)
  return currentMax + 1
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

function getEmptyVoteSummary() {
  return { likes: 0, dislikes: 0, score: 0, currentUserVote: undefined }
}

function mapPostForClient(
  post: any,
  usersMap: Map<string, any>,
  aliasMap: Map<string, string>,
  replyCount: number,
  voteSummary?: any,
  serialNumber?: number
) {
  const ownerKey = String(post.authorId)
  const user = usersMap.get(ownerKey)
  const publicAuthorName = post.isAnonymous ? "匿名洞主" : getDisplayName(user)
  const summary = voteSummary || getEmptyVoteSummary()
  const displaySerialNumber = serialNumber || (isValidSerialNumber(post.serialNumber) ? post.serialNumber : undefined)

  return {
    ...post,
    serialNumber: displaySerialNumber,
    serialLabel: displaySerialNumber ? formatSerialNumber(displaySerialNumber) : undefined,
    publicAuthorName,
    realAuthorName: getDisplayName(user),
    anonymousAlias: post.isAnonymous ? "匿名洞主" : undefined,
    replyCount,
    likes: summary.likes,
    dislikes: summary.dislikes,
    voteScore: summary.score,
    currentUserVote: summary.currentUserVote,
  }
}

function mapReplyForClient(reply: any, post: any, usersMap: Map<string, any>, aliasMap: Map<string, string>, voteSummary?: any) {
  const ownerKey = String(reply.authorId)
  const user = usersMap.get(ownerKey)
  const publicAuthorName = reply.isAnonymous
    ? isAnonymousPostOwner(post, reply.authorId)
      ? "匿名洞主"
      : aliasMap.get(ownerKey) || "匿名洞友"
    : getDisplayName(user)
  const summary = voteSummary || getEmptyVoteSummary()

  return {
    ...reply,
    publicAuthorName,
    realAuthorName: getDisplayName(user),
    anonymousAlias: reply.isAnonymous
      ? isAnonymousPostOwner(post, reply.authorId)
        ? "匿名洞主"
        : aliasMap.get(ownerKey) || "匿名洞友"
      : undefined,
    likes: summary.likes,
    dislikes: summary.dislikes,
    voteScore: summary.score,
    currentUserVote: summary.currentUserVote,
  }
}

export const list = query({
  args: {
    sessionToken: v.string(),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await getActorOrThrow(ctx, args.sessionToken)
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
    const serialSearch = search.replace(/^#/, "")
    const serialMap = buildPostSerialMap(posts)
    const voteSummaries = await getVoteSummaryMap(ctx, "treeholePost", posts.map((post) => String(post._id)), actor._id)

    const mapped = posts.map((post) => {
      const threadReplies = repliesByPost.get(String(post._id)) || []
      const aliasMap = buildAliasMap(post, threadReplies)
      return mapPostForClient(
        post,
        usersMap,
        aliasMap,
        threadReplies.length,
        voteSummaries.get(String(post._id)),
        serialMap.get(String(post._id))
      )
    })

    if (!search) return mapped

    return mapped.filter((post) => {
      return (
        post.title.toLowerCase().includes(search) ||
        post.content.toLowerCase().includes(search) ||
        post.publicAuthorName.toLowerCase().includes(search) ||
        String(post.serialNumber || "").includes(serialSearch) ||
        String(post.serialLabel || "").includes(serialSearch)
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
    const actor = await getActorOrThrow(ctx, args.sessionToken)
    const post = await ctx.db.get(args.id)
    if (!post) return null

    const replies = await ctx.db.query("treeholeReplies").withIndex("by_post", (q) => q.eq("postId", args.id)).collect()
    replies.sort((a, b) => a.createdAt - b.createdAt)

    const usersMap = await getUsersMap(ctx, [post.authorId, ...replies.map((reply) => reply.authorId)])
    const aliasMap = buildAliasMap(post, replies)
    const allPosts = await ctx.db.query("treeholePosts").collect()
    const serialMap = buildPostSerialMap(allPosts)
    const postVoteSummaries = await getVoteSummaryMap(ctx, "treeholePost", [String(post._id)], actor._id)
    const replyVoteSummaries = await getVoteSummaryMap(
      ctx,
      "treeholeReply",
      replies.map((reply) => String(reply._id)),
      actor._id
    )

    return {
      post: mapPostForClient(
        post,
        usersMap,
        aliasMap,
        replies.length,
        postVoteSummaries.get(String(post._id)),
        serialMap.get(String(post._id))
      ),
      replies: replies.map((reply) =>
        mapReplyForClient(reply, post, usersMap, aliasMap, replyVoteSummaries.get(String(reply._id)))
      ),
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
    const serialSearch = search.replace(/^#/, "")
    const serialMap = buildPostSerialMap(posts)
    const voteSummaries = await getVoteSummaryMap(ctx, "treeholePost", posts.map((post) => String(post._id)), actor._id)

    const mapped = posts.map((post) => {
      const threadReplies = repliesByPost.get(String(post._id)) || []
      const aliasMap = buildAliasMap(post, threadReplies)
      const base = mapPostForClient(
        post,
        usersMap,
        aliasMap,
        threadReplies.length,
        voteSummaries.get(String(post._id)),
        serialMap.get(String(post._id))
      )
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
        post.realAuthorName.toLowerCase().includes(search) ||
        String(post.serialNumber || "").includes(serialSearch) ||
        String(post.serialLabel || "").includes(serialSearch)
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
    const allPosts = await ctx.db.query("treeholePosts").collect()
    const serialMap = buildPostSerialMap(allPosts)
    const postVoteSummaries = await getVoteSummaryMap(ctx, "treeholePost", [String(detail._id)], actor._id)
    const replyVoteSummaries = await getVoteSummaryMap(
      ctx,
      "treeholeReply",
      replies.map((reply) => String(reply._id)),
      actor._id
    )

    const postUser = usersMap.get(String(detail.authorId))

    return {
      post: {
        ...mapPostForClient(
          detail,
          usersMap,
          aliasMap,
          replies.length,
          postVoteSummaries.get(String(detail._id)),
          serialMap.get(String(detail._id))
        ),
        authorOrganization: postUser?.organization,
        authorCohort: postUser?.cohort,
      },
      replies: replies.map((reply) => {
        const user = usersMap.get(String(reply.authorId))
        return {
          ...mapReplyForClient(reply, detail, usersMap, aliasMap, replyVoteSummaries.get(String(reply._id))),
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
      serialNumber: await getNextTreeholeSerialNumber(ctx),
      title,
      content,
      isAnonymous: args.isAnonymous ?? false,
      authorId: actor._id,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const ensureSerialNumbers = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await getActorOrThrow(ctx, args.sessionToken)

    const posts = await ctx.db.query("treeholePosts").collect()
    const serialMap = buildPostSerialMap(posts)
    let updated = 0

    for (const post of posts) {
      const serialNumber = serialMap.get(String(post._id))
      if (!serialNumber || post.serialNumber === serialNumber) continue
      await ctx.db.patch(post._id, { serialNumber, updatedAt: Date.now() })
      updated += 1
    }

    return updated
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
