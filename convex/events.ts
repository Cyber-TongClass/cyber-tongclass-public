import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { getUserBySession } from "./reviewer/lib"
import {
  requireContentManager,
  requireSuperAdminForDirectContentCreate,
} from "./lib/contentAuthorization"
import { loadOAUserScopeContext, userMatchesOAUserScope } from "./lib/oaWorkflow"

const audienceValidator = v.array(v.union(v.literal("undergrad"), v.literal("graduate")))

function canViewEvent(event: { audiences?: string[]; targetScope?: any }, actor: any | null, scopeContext?: any) {
  if (event.targetScope) {
    // Scoped events are members-only: logged-out visitors never see them.
    if (!actor || !scopeContext) return false
    if (!userMatchesOAUserScope(actor, event.targetScope, scopeContext.researchGroupId, scopeContext.userGroupIds)) return false
  }
  return !event.audiences?.length
    || (actor?.identityType !== undefined && event.audiences.includes(actor.identityType))
}

async function loadActorWithScopeContext(ctx: any, sessionToken?: string) {
  if (!sessionToken) return { actor: null, scopeContext: undefined }
  try {
    const actor = await getUserBySession(ctx, sessionToken)
    const scopeContext = await loadOAUserScopeContext(ctx, actor._id)
    return { actor, scopeContext }
  } catch {
    return { actor: null, scopeContext: undefined }
  }
}

function publicEventDto(event: any) {
  return {
    _id: event._id,
    title: event.title,
    date: event.date,
    time: event.time,
    endDate: event.endDate,
    endTime: event.endTime,
    location: event.location,
    description: event.description,
    url: event.url,
    color: event.color,
  }
}

function managerEventDto(event: any) {
  return {
    ...publicEventDto(event),
    audiences: event.audiences,
  }
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
    const { actor, scopeContext } = await loadActorWithScopeContext(ctx, args.sessionToken)
    filtered = filtered.filter((event) => canViewEvent(event, actor, scopeContext))
    const skip = args.skip || 0
    const limit = args.limit || 50
    return filtered.slice(skip, skip + limit).map(publicEventDto)
  },
})

// Get a single event by ID
export const getById = query({
  args: { id: v.id("events"), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id)
    if (!event) return null
    const { actor, scopeContext } = await loadActorWithScopeContext(ctx, args.sessionToken)
    return canViewEvent(event, actor, scopeContext) ? publicEventDto(event) : null
  },
})

export const adminList = query({
  args: {
    sessionToken: v.string(),
    skip: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    await requireContentManager(ctx, actor, "events")
    const rows = await ctx.db.query("events").order("asc").collect()
    const skip = args.skip || 0
    return rows.slice(skip, skip + (args.limit || 200)).map(managerEventDto)
  },
})

export const adminGetById = query({
  args: {
    sessionToken: v.string(),
    id: v.id("events"),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    await requireContentManager(ctx, actor, "events")
    const event = await ctx.db.get(args.id)
    return event ? managerEventDto(event) : null
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
    requireSuperAdminForDirectContentCreate(
      await getUserBySession(ctx, args.sessionToken),
    )
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
    const actor = await getUserBySession(ctx, args.sessionToken)
    await requireContentManager(ctx, actor, "events")
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
    const actor = await getUserBySession(ctx, args.sessionToken)
    await requireContentManager(ctx, actor, "events")
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
    const { actor, scopeContext } = await loadActorWithScopeContext(ctx, args.sessionToken)
    const events = await ctx.db.query("events").collect()
    return events.filter((event) => canViewEvent(event, actor, scopeContext)).length
  },
})
