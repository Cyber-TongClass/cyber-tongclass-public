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

function isChallengeManager(user: any, organizers: string[]) {
  return isAdmin(user) || organizers.includes(String(user._id))
}

function requireChallengeManager(user: any, organizers: string[]) {
  if (!isChallengeManager(user, organizers)) {
    throw new Error("需要挑战赛组织者或管理员权限")
  }
  return user
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

function parseRegistrationValue(value: string) {
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" && typeof parsed.id === "string" ? parsed : null
  } catch {
    return null
  }
}

function sortRegistrations(registrations: any[]) {
  return registrations.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

function preferNewerRegistration(current: any | undefined, next: any) {
  if (!current) return next
  return (next.updatedAt || 0) >= (current.updatedAt || 0) ? next : current
}

async function getRegistrationDocs(ctx: any) {
  return ctx.db
    .query("cc2026Store")
    .withIndex("by_collection", (q: any) => q.eq("collection", "registration"))
    .collect()
}

async function getRegistrationDoc(ctx: any, id: string) {
  return ctx.db
    .query("cc2026Store")
    .withIndex("by_collection_key", (q: any) =>
      q.eq("collection", "registration").eq("key", id)
    )
    .first()
}

async function getMergedRegistrations(ctx: any) {
  const docs = await getRegistrationDocs(ctx)
  const byId = new Map<string, any>()

  for (const doc of docs) {
    if (doc.key === "_") {
      try {
        const legacyItems = JSON.parse(doc.value)
        if (Array.isArray(legacyItems)) {
          for (const item of legacyItems) {
            if (item && typeof item === "object" && typeof item.id === "string") {
              byId.set(item.id, preferNewerRegistration(byId.get(item.id), item))
            }
          }
        }
      } catch {
        // Ignore malformed legacy aggregate data.
      }
      continue
    }

    const registration = parseRegistrationValue(doc.value)
    if (registration) {
      byId.set(registration.id, preferNewerRegistration(byId.get(registration.id), registration))
    }
  }

  return sortRegistrations(Array.from(byId.values()))
}

function registrationBelongsToUser(registration: any, user: any) {
  const userId = String(user._id)
  const studentId = user.studentId ? String(user.studentId) : ""

  if (registration.ownerUserId && String(registration.ownerUserId) === userId) return true
  if (registration.submitterUserId && String(registration.submitterUserId) === userId) return true
  if (studentId && registration.leaderStudentId && String(registration.leaderStudentId) === studentId) return true

  if (Array.isArray(registration.members)) {
    return registration.members.some((member: any) => {
      if (!member || typeof member !== "object") return false
      if (member.userId && String(member.userId) === userId) return true
      return Boolean(studentId && member.studentId && String(member.studentId) === studentId)
    })
  }

  return false
}

function normalizeRegistrationForUser(incoming: any, existing: any, user: any, isManager: boolean) {
  if (!incoming || typeof incoming !== "object" || typeof incoming.id !== "string") {
    throw new Error("报名记录格式不正确")
  }

  const now = Date.now()
  const base = {
    ...incoming,
    ownerUserId: existing?.ownerUserId || incoming.ownerUserId || String(user._id),
    submitterUserId: existing?.submitterUserId || incoming.submitterUserId || String(user._id),
    createdAt: typeof incoming.createdAt === "number" ? incoming.createdAt : existing?.createdAt || now,
    updatedAt: now,
  }

  if (isManager) {
    return {
      ...base,
      status: base.status || existing?.status || "submitted",
      adminNote: typeof base.adminNote === "string" ? base.adminNote : existing?.adminNote || "",
      score: typeof base.score === "number" || base.score === null ? base.score : existing?.score ?? null,
    }
  }

  if (existing?.finalSubmittedAt) {
    throw new Error("该项目已最终提交，不能再修改")
  }

  return {
    ...base,
    status: existing?.status || "submitted",
    adminNote: existing?.adminNote || "",
    score: existing?.score ?? null,
  }
}

// ---------- public queries ----------

export const get = query({
  args: {
    collection: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.collection === "registration" && args.key === "_") {
      // Backward compatibility for already-deployed clients that still read
      // the legacy aggregate registration record.
      return JSON.stringify(await getMergedRegistrations(ctx))
    }

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
    if (args.collection === "registration") {
      // Backward compatibility for already-deployed clients that still call
      // list("registration") and expect a single "_" aggregate document.
      return [{ key: "_", value: JSON.stringify(await getMergedRegistrations(ctx)) }]
    }

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
      if (d.collection === "registration") continue
      if (!grouped[d.collection]) grouped[d.collection] = {}
      grouped[d.collection][d.key] = d.value
    }
    grouped.registration = { _: JSON.stringify(await getMergedRegistrations(ctx)) }
    return grouped
  },
})

export const listMyRegistrations = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const registrations = await getMergedRegistrations(ctx)
    return registrations.filter((registration) => registrationBelongsToUser(registration, user))
  },
})

export const listPublishedRegistrations = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getUserBySession(ctx, args.sessionToken)
    const registrations = await getMergedRegistrations(ctx)
    return registrations.filter((registration) => registration.finalSubmittedAt)
  },
})

export const listManageRegistrations = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const organizers = await getOrganizers(ctx)
    requireChallengeManager(user, organizers)
    return getMergedRegistrations(ctx)
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
      if (args.collection === "registration") {
        const organizers = await getOrganizers(ctx)
        if (!isChallengeManager(user, organizers)) {
          throw new Error("请使用挑战赛报名专用提交接口")
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
        if (entry.collection === "registration") {
          const organizers = await getOrganizers(ctx)
          if (!isChallengeManager(user, organizers)) {
            throw new Error("请使用挑战赛报名专用提交接口")
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

export const upsertRegistration = mutation({
  args: {
    registration: v.any(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const organizers = await getOrganizers(ctx)
    const isManager = isChallengeManager(user, organizers)
    const incoming = args.registration
    if (!incoming || typeof incoming !== "object" || typeof incoming.id !== "string") {
      throw new Error("报名记录格式不正确")
    }

    const existingDoc = await getRegistrationDoc(ctx, incoming.id)
    const existing = existingDoc
      ? parseRegistrationValue(existingDoc.value)
      : (await getMergedRegistrations(ctx)).find((registration) => registration.id === incoming.id) || null

    if (existing && !isManager && !registrationBelongsToUser(existing, user)) {
      throw new Error("只能修改自己的报名记录")
    }

    const nextRegistration = normalizeRegistrationForUser(incoming, existing, user, isManager)

    if (existingDoc) {
      await ctx.db.patch(existingDoc._id, {
        value: JSON.stringify(nextRegistration),
        updatedAt: Date.now(),
        updatedBy: String(user._id),
      })
    } else {
      await ctx.db.insert("cc2026Store", {
        collection: "registration",
        key: nextRegistration.id,
        value: JSON.stringify(nextRegistration),
        updatedAt: Date.now(),
        updatedBy: String(user._id),
      })
    }

    return nextRegistration
  },
})

export const removeRegistration = mutation({
  args: {
    id: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const organizers = await getOrganizers(ctx)
    requireChallengeManager(user, organizers)

    const existingDoc = await getRegistrationDoc(ctx, args.id)
    if (existingDoc) {
      await ctx.db.delete(existingDoc._id)
    }

    const legacyDoc = await getRegistrationDoc(ctx, "_")
    if (legacyDoc) {
      try {
        const legacyItems = JSON.parse(legacyDoc.value)
        if (Array.isArray(legacyItems)) {
          await ctx.db.patch(legacyDoc._id, {
            value: JSON.stringify(legacyItems.filter((item: any) => item?.id !== args.id)),
            updatedAt: Date.now(),
            updatedBy: String(user._id),
          })
        }
      } catch {
        // Leave malformed legacy data untouched.
      }
    }
  },
})
