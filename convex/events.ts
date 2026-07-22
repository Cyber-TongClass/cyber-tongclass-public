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

// Get all events
export const list = query({
  args: {
    skip: v.optional(v.number()),
    limit: v.optional(v.number()),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
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
    const skip = args.skip || 0
    const limit = args.limit || 50
    return filtered.slice(skip, skip + limit)
  },
})

// Get a single event by ID
export const getById = query({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id)
    return event
  },
})

// Create a new event
export const create = mutation({
  args: {
    title: v.string(),
    date: v.string(),
    time: v.optional(v.string()),
    endDate: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    url: v.optional(v.string()),
    color: v.optional(v.string()),
    audiences: v.optional(v.array(audienceValidator)),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
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
      tags: args.tags ? normalizeTags(args.tags) : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    return eventId
  },
})

// Update an event
export const update = mutation({
  args: {
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
    audiences: v.optional(v.array(audienceValidator)),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    const event = await ctx.db.get(id)
    if (!event) {
      throw new Error("Event not found")
    }
    await ctx.db.patch(id, {
      ...updates,
      ...(updates.tags !== undefined ? { tags: normalizeTags(updates.tags) } : {}),
      updatedAt: Date.now(),
    })
    return id
  },
})

// Delete an event
export const remove = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
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
  handler: async (ctx) => {
    const events = await ctx.db.query("events").collect()
    return events.length
  },
})
