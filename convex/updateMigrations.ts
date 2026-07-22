import { mutation } from "./_generated/server"
import { v } from "convex/values"

const DEFAULT_AUDIENCES = ["undergraduate", "graduate", "teacher"] as const
const MAX_BATCH_SIZE = 100

export const backfillDefaultAudiences = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit || MAX_BATCH_SIZE, MAX_BATCH_SIZE))
    const [news, events] = await Promise.all([
      ctx.db.query("news").collect(),
      ctx.db.query("events").collect(),
    ])

    const newsMissingAudiences = news.filter((document) => !document.audiences?.length)
    const eventsMissingAudiences = events.filter((document) => !document.audiences?.length)
    const newsBatch = newsMissingAudiences.slice(0, limit)
    const eventsBatch = eventsMissingAudiences.slice(0, limit)

    await Promise.all([
      ...newsBatch.map((document) => ctx.db.patch(document._id, { audiences: [...DEFAULT_AUDIENCES] })),
      ...eventsBatch.map((document) => ctx.db.patch(document._id, { audiences: [...DEFAULT_AUDIENCES] })),
    ])

    return {
      newsUpdated: newsBatch.length,
      eventsUpdated: eventsBatch.length,
      remaining: newsMissingAudiences.length - newsBatch.length + eventsMissingAudiences.length - eventsBatch.length,
    }
  },
})
