import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { getUserBySession } from "./reviewer/lib"
import { requireContentAdmin } from "./lib/contentAuthorization"

const audienceValidator = v.array(v.union(v.literal("undergrad"), v.literal("graduate")))

function canViewEvent(event: { audiences?: string[] }, actor: any | null) {
  return !event.audiences?.length
    || (actor?.identityType !== undefined && event.audiences.includes(actor.identityType))
}

// Get all events
export const list = query({
  args: {
    skip: v.optional(v.number()),
    limit: v.optional(v.number()),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const allEvents = await ctx.db.query("events").order("asc").collect()
    let filtered = allEvents
    if (args.fromDate) {
      filtered = filtered.filter((e) => e.date >= args.fromDate!)
    }
    if (args.toDate) {
      filtered = filtered.filter((e) => e.date <= args.toDate!)
    }
    const actor = args.sessionToken ? await getUserBySession(ctx, args.sessionToken) : null
    filtered = filtered.filter((event) => canViewEvent(event, actor))
    const skip = args.skip || 0
    const limit = args.limit || 50
    return filtered.slice(skip, skip + limit)
  },
})

// Get a single event by ID
export const getById = query({
  args: { id: v.id("events"), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id)
    if (!event) return null
    const actor = args.sessionToken ? await getUserBySession(ctx, args.sessionToken) : null
    return canViewEvent(event, actor) ? event : null
  },
})

export const adminList = query({
  args: {
    sessionToken: v.string(),
    skip: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    requireContentAdmin(await getUserBySession(ctx, args.sessionToken))
    const rows = await ctx.db.query("events").order("asc").collect()
    const skip = args.skip || 0
    return rows.slice(skip, skip + (args.limit || 200))
  },
})

// Create a new event
export const create = mutation({
  args: {
    sessionToken: v.string(),
    title: v.string(),
    date: v.string(),
    time: v.optional(v.string()),
    endDate: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    url: v.optional(v.string()),
    color: v.optional(v.string()),
    audiences: v.optional(audienceValidator),
  },
  handler: async (ctx, args) => {
    requireContentAdmin(await getUserBySession(ctx, args.sessionToken))
    const eventId = await ctx.db.insert("events", {
      title: args.title,
      date: args.date,
      time: args.time,
      endDate: args.endDate,
      endTime: args.endTime,
      location: args.location,
      description: args.description,
      url: args.url,
      color: args.color || "#0F4C81",
      audiences: args.audiences,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    return eventId
  },
})

// Update an event
export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("events"),
    title: v.optional(v.string()),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    endDate: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    url: v.optional(v.string()),
    color: v.optional(v.string()),
    audiences: v.optional(audienceValidator),
  },
  handler: async (ctx, args) => {
    requireContentAdmin(await getUserBySession(ctx, args.sessionToken))
    const { id, sessionToken: _sessionToken, ...updates } = args
    const event = await ctx.db.get(id)
    if (!event) {
      throw new Error("Event not found")
    }
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() })
    return id
  },
})

// Delete an event
export const remove = mutation({
  args: { id: v.id("events"), sessionToken: v.string() },
  handler: async (ctx, args) => {
    requireContentAdmin(await getUserBySession(ctx, args.sessionToken))
    const event = await ctx.db.get(args.id)
    if (!event) {
      throw new Error("Event not found")
    }
    await ctx.db.delete(args.id)
    return args.id
  },
})

// Get events count
export const count = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = args.sessionToken ? await getUserBySession(ctx, args.sessionToken) : null
    const events = await ctx.db.query("events").collect()
    return events.filter((event) => canViewEvent(event, actor)).length
  },
})
