import type { Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

function getDisplayName(user: any) {
  return user?.chineseName?.trim() || user?.englishName?.trim() || user?.username || "用户"
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

function assertAdmin(actor: any) {
  if (actor?.role !== "admin" && actor?.role !== "super_admin") {
    throw new Error("无权执行此操作")
  }
}

function assertCanDelete(actor: any, ownerId: Id<"users">) {
  if (actor?.role === "admin" || actor?.role === "super_admin") return
  if (String(actor._id) !== String(ownerId)) {
    throw new Error("无权删除该反馈")
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

function formatMonthString(timestamp: number) {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

export const list = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await getActorOrThrow(ctx, args.sessionToken)
    const entries = await ctx.db.query("feedbackEntries").order("desc").collect()
    const usersMap = await getUsersMap(ctx, entries.map((entry) => entry.authorId))

    return entries.map((entry) => {
      const user = usersMap.get(String(entry.authorId))
      return {
        ...entry,
        publicAuthorName: entry.isAnonymous ? "匿名" : getDisplayName(user),
      }
    })
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
    assertAdmin(actor)

    const entries = await ctx.db.query("feedbackEntries").order("desc").collect()
    const usersMap = await getUsersMap(ctx, entries.map((entry) => entry.authorId))
    const search = args.search?.trim().toLowerCase() || ""

    const mapped = entries.map((entry) => {
      const user = usersMap.get(String(entry.authorId))
      return {
        ...entry,
        publicAuthorName: entry.isAnonymous ? "匿名" : getDisplayName(user),
        realAuthorName: getDisplayName(user),
        authorOrganization: user?.organization,
        authorCohort: user?.cohort,
      }
    })

    if (!search) return mapped

    return mapped.filter((entry) => {
      return (
        entry.title.toLowerCase().includes(search) ||
        entry.content.toLowerCase().includes(search) ||
        entry.realAuthorName.toLowerCase().includes(search)
      )
    })
  },
})

export const exportMonthlyForAdmin = query({
  args: {
    sessionToken: v.string(),
    actorId: v.optional(v.id("users")),
    month: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await getActorOrThrow(ctx, args.sessionToken)
    assertAdmin(actor)

    const entries = await ctx.db.query("feedbackEntries").order("desc").collect()
    const filtered = entries.filter((entry) => formatMonthString(entry.createdAt) === args.month)
    const usersMap = await getUsersMap(ctx, filtered.map((entry) => entry.authorId))

    return filtered.map((entry) => {
      const user = usersMap.get(String(entry.authorId))
      return {
        createdAt: entry.createdAt,
        title: entry.title,
        content: entry.content,
        isAnonymous: entry.isAnonymous,
        displayName: entry.isAnonymous ? "匿名" : getDisplayName(user),
        organization: user?.organization || "",
        cohort: user?.cohort ?? "",
      }
    })
  },
})

export const create = mutation({
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
    return ctx.db.insert("feedbackEntries", {
      title,
      content,
      isAnonymous: args.isAnonymous ?? false,
      authorId: actor._id,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const remove = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("feedbackEntries"),
    actorId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const actor = await getActorOrThrow(ctx, args.sessionToken)
    const entry = await ctx.db.get(args.id)
    if (!entry) {
      throw new Error("反馈不存在")
    }

    assertCanDelete(actor, entry.authorId)
    await ctx.db.delete(args.id)
    return args.id
  },
})
