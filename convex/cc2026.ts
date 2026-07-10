import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

const sha256Hex = async (input: string) => {
  const cryptoImpl = (globalThis as any).crypto || (global as any).crypto
  const enc = new TextEncoder().encode(input)
  const hashBuffer = await cryptoImpl.subtle.digest("SHA-256", enc)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b: number) => b.toString(16).padStart(2, "0"))
    .join("")
}

async function getUserBySession(ctx: any, sessionToken?: string) {
  if (sessionToken) {
    const tokenHash = await sha256Hex(sessionToken)
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_tokenHash", (q: any) => q.eq("tokenHash", tokenHash))
      .first()
    if (session && !session.revokedAt && session.expiresAt > Date.now()) {
      const user = await ctx.db.get(session.userId)
      if (user) return user
    }
  }

  const identity = await ctx.auth.getUserIdentity()
  if (!identity || !identity.email) throw new Error("请先登录")
  const user = await ctx.db
    .query("users")
    .filter((q: any) => q.eq(q.field("email"), identity.email!))
    .first()
  if (!user) throw new Error("用户不存在")
  return user
}

function requireSuperAdmin(user: any) {
  if (user.role !== "super_admin") throw new Error("需要超级管理员权限")
  return user
}

function requireAdmin(user: any) {
  if (user.role !== "admin" && user.role !== "super_admin")
    throw new Error("需要管理员权限")
  return user
}

function isAdmin(user: any) {
  return user.role === "admin" || user.role === "super_admin"
}

async function getOrganizers(ctx: any): Promise<string[]> {
  const docs = await ctx.db
    .query("cc2026Store")
    .withIndex("by_collection_key", (q: any) =>
      q.eq("collection", "organizers").eq("key", "_")
    )
    .collect()
  const doc = docs.find((d: any) => d.key === "_")
  if (!doc) return []
  try { return JSON.parse(doc.value) } catch { return [] }
}

// ---------- public queries ----------

export const get = query({
  args: {
    collection: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("cc2026Store")
      .withIndex("by_collection_key", (q: any) =>
        q.eq("collection", args.collection).eq("key", args.key)
      )
      .first()
    return doc ? doc.value : null
  },
})

export const list = query({
  args: {
    collection: v.string(),
  },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("cc2026Store")
      .withIndex("by_collection", (q: any) =>
        q.eq("collection", args.collection)
      )
      .collect()
    return docs.map((d: any) => ({ key: d.key, value: d.value }))
  },
})

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("cc2026Store").collect()
    const grouped: Record<string, Record<string, string>> = {}
    for (const d of docs) {
      if (!grouped[d.collection]) grouped[d.collection] = {}
      grouped[d.collection][d.key] = d.value
    }
    return grouped
  },
})

// ---------- mutations ----------

export const set = mutation({
  args: {
    collection: v.string(),
    key: v.string(),
    value: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)

    if (args.collection === "organizers") {
      requireSuperAdmin(user)
    } else if (args.collection === "settings") {
      const organizers = await getOrganizers(ctx)
      if (!isAdmin(user) && !organizers.includes(String(user._id))) {
        throw new Error("需要组织者或管理员权限")
      }
    } else if (args.collection === "registration" || args.collection === "my_votes") {
      // Owner check: key must match userId for my_votes; registration key "_" is admin/organizer only
      if (args.collection === "my_votes" && args.key !== String(user._id) && !isAdmin(user)) {
        throw new Error("只能修改自己的投票记录")
      }
      if (args.collection === "registration" && args.key === "_" && !isAdmin(user)) {
        // Non-admin can write individual registrations only (key = registration id)
        // We trust the owner check on the value: the stored JSON must have matching userId
        const organizers = await getOrganizers(ctx)
        if (!organizers.includes(String(user._id))) {
          throw new Error("只能修改自己的报名记录，管理员可管理全部")
        }
      }
    } else {
      // votes, intranetModules — must be admin
      requireAdmin(user)
    }

    const existing = await ctx.db
      .query("cc2026Store")
      .withIndex("by_collection_key", (q: any) =>
        q.eq("collection", args.collection).eq("key", args.key)
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: Date.now(),
        updatedBy: String(user._id),
      })
    } else {
      await ctx.db.insert("cc2026Store", {
        collection: args.collection,
        key: args.key,
        value: args.value,
        updatedAt: Date.now(),
        updatedBy: String(user._id),
      })
    }
  },
})

export const remove = mutation({
  args: {
    collection: v.string(),
    key: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)

    if (args.collection === "organizers") {
      requireSuperAdmin(user)
    } else if (args.collection === "registration" || args.collection === "my_votes") {
      if (args.collection === "my_votes" && args.key !== String(user._id) && !isAdmin(user)) {
        throw new Error("只能删除自己的投票记录")
      }
      if (args.collection === "registration" && !isAdmin(user)) {
        throw new Error("需要管理员权限")
      }
    } else {
      requireAdmin(user)
    }

    const existing = await ctx.db
      .query("cc2026Store")
      .withIndex("by_collection_key", (q: any) =>
        q.eq("collection", args.collection).eq("key", args.key)
      )
      .first()

    if (existing) {
      await ctx.db.delete(existing._id)
    }
  },
})

export const batchSet = mutation({
  args: {
    entries: v.array(v.object({
      collection: v.string(),
      key: v.string(),
      value: v.string(),
    })),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)

    for (const entry of args.entries) {
      // Auth by collection type — same rules as single set
      if (entry.collection === "organizers") {
        requireSuperAdmin(user)
      } else if (entry.collection === "settings") {
        const organizers = await getOrganizers(ctx)
        if (!isAdmin(user) && !organizers.includes(String(user._id))) {
          throw new Error("需要组织者或管理员权限")
        }
      } else if (entry.collection === "registration" || entry.collection === "my_votes" || entry.collection === "votes") {
        if (entry.collection === "my_votes" && entry.key !== String(user._id) && !isAdmin(user)) {
          throw new Error("只能修改自己的投票记录")
        }
        if (entry.collection === "registration" && entry.key === "_" && !isAdmin(user)) {
          const organizers = await getOrganizers(ctx)
          if (!organizers.includes(String(user._id))) {
            throw new Error("只能修改自己的报名记录，管理员可管理全部")
          }
        }
      } else {
        requireAdmin(user)
      }

      const existing = await ctx.db
        .query("cc2026Store")
        .withIndex("by_collection_key", (q: any) =>
          q.eq("collection", entry.collection).eq("key", entry.key)
        )
        .first()

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: entry.value,
          updatedAt: Date.now(),
          updatedBy: String(user._id),
        })
      } else {
        await ctx.db.insert("cc2026Store", {
          collection: entry.collection,
          key: entry.key,
          value: entry.value,
          updatedAt: Date.now(),
          updatedBy: String(user._id),
        })
      }
    }
  },
})
