import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

const PREPRINT_VENUE = "arXiv Preprint"

function normalizeVenue(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function venueKey(value: string) {
  return normalizeVenue(value).toLowerCase()
}

function isPreprintVenue(value: string) {
  return venueKey(value) === venueKey(PREPRINT_VENUE)
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

function assertSuperAdmin(actor: any) {
  if (actor?.role !== "super_admin") {
    throw new Error("只有超级管理员可以维护会议/期刊名称库")
  }
}

async function findStoredVenueByName(ctx: any, name: string) {
  const key = venueKey(name)
  const venues = await ctx.db.query("publicationVenues").collect()
  return venues.find((venue: any) => venueKey(venue.name) === key) || null
}

export async function ensurePublicationVenue(ctx: any, venueName: string, createdBy?: any) {
  const name = normalizeVenue(venueName)
  if (!name || isPreprintVenue(name)) return null

  const existing = await findStoredVenueByName(ctx, name)
  if (existing) return existing._id

  const now = Date.now()
  return await ctx.db.insert("publicationVenues", {
    name,
    createdBy,
    createdAt: now,
    updatedAt: now,
  })
}

export const list = query({
  handler: async (ctx) => {
    const storedVenues = await ctx.db.query("publicationVenues").collect()
    const publications = await ctx.db.query("publications").collect()
    const byKey = new Map<string, { _id?: string; name: string; source: "manual" | "publication"; updatedAt?: number }>()

    for (const venue of storedVenues) {
      const name = normalizeVenue(venue.name)
      if (!name || isPreprintVenue(name)) continue
      byKey.set(venueKey(name), {
        _id: String(venue._id),
        name,
        source: "manual",
        updatedAt: venue.updatedAt,
      })
    }

    for (const publication of publications) {
      const name = normalizeVenue(publication.venue || "")
      if (!name || isPreprintVenue(name)) continue
      const key = venueKey(name)
      if (byKey.has(key)) continue
      byKey.set(key, {
        name,
        source: "publication",
        updatedAt: publication.updatedAt,
      })
    }

    return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name))
  },
})

export const create = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await getActorOrThrow(ctx, args.sessionToken)
    assertSuperAdmin(actor)

    const name = normalizeVenue(args.name)
    if (!name) throw new Error("请填写会议/期刊名称")
    if (isPreprintVenue(name)) throw new Error("Preprint 已由系统自动处理，不需要加入名称库")

    const existing = await findStoredVenueByName(ctx, name)
    if (existing) return existing._id

    return await ensurePublicationVenue(ctx, name, actor._id)
  },
})

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("publicationVenues"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await getActorOrThrow(ctx, args.sessionToken)
    assertSuperAdmin(actor)

    const venue = await ctx.db.get(args.id)
    if (!venue) throw new Error("名称不存在")

    const name = normalizeVenue(args.name)
    if (!name) throw new Error("请填写会议/期刊名称")
    if (isPreprintVenue(name)) throw new Error("Preprint 已由系统自动处理，不需要加入名称库")

    const existing = await findStoredVenueByName(ctx, name)
    if (existing && String(existing._id) !== String(args.id)) {
      throw new Error("这个名称已经存在")
    }

    await ctx.db.patch(args.id, { name, updatedAt: Date.now() })
    return args.id
  },
})
