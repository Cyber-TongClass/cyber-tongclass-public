import { mutation } from "./_generated/server"
import { v } from "convex/values"

import { classifyLegacyPublicationAuthors } from "./lib/publicationAuthorshipMigration"
import { getUserBySession } from "./reviewer/lib"

export const backfillBatch = mutation({
  args: {
    sessionToken: v.string(),
    cursor: v.optional(v.string()),
    numItems: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    if (actor.role !== "super_admin") throw new Error("只有超级管理员可以运行论文作者关系迁移")
    const numItems = Math.min(100, Math.max(1, Math.floor(args.numItems || 10)))
    const page = await ctx.db.query("publications").paginate({ cursor: args.cursor || null, numItems })
    const totals = { scanned: page.page.length, inserted: 0, updated: 0, unchanged: 0, skipped: 0 }
    const conflicts: Array<{ publicationId: string; authorOrder: number; reason: string }> = []

    for (const publication of page.page) {
      const accountIds = Array.from(new Set(publication.authors.flatMap((snapshot) => {
        const match = String(snapshot).match(/\s*\[tc-author:([^\]]*)\]\s*$/i)
        if (!match) return []
        try {
          const parsed = JSON.parse(decodeURIComponent(match[1]))
          return parsed?.isTongClass === true && typeof parsed.userId === "string" ? [parsed.userId.trim()] : []
        } catch { return [] }
      }).filter(Boolean)))
      const bindingPairs = await Promise.all(accountIds.map(async (accountId) => {
        const rows = await ctx.db
          .query("institutePeople")
          .withIndex("by_accountUserId", (index) => index.eq("accountUserId", accountId as any))
          .collect()
        return [accountId, rows.map((row) => ({ _id: String(row._id), kind: row.kind }))] as const
      }))
      const existingRows = await ctx.db
        .query("publicationAuthorships")
        .withIndex("by_publication_order", (index) => index.eq("publicationId", publication._id))
        .collect()
      const existingByNaturalKey = new Map(existingRows.map((row) => [row.naturalKey, {
        _id: String(row._id), naturalKey: row.naturalKey, role: row.role,
        authorOrder: row.authorOrder, isPrimary: row.isPrimary,
      }]))
      const decisions = classifyLegacyPublicationAuthors(
        { _id: String(publication._id), authors: publication.authors },
        new Map(bindingPairs), existingByNaturalKey, Date.now(),
      )
      for (const decision of decisions) {
        if (decision.kind === "insert") {
          const naturalKey = String(decision.value.naturalKey)
          const replay = await ctx.db.query("publicationAuthorships").withIndex("by_naturalKey", (index) => index.eq("naturalKey", naturalKey)).first()
          if (replay) { totals.unchanged += 1; continue }
          await ctx.db.insert("publicationAuthorships", decision.value as any); totals.inserted += 1
        } else if (decision.kind === "patch") {
          await ctx.db.patch(decision.id as any, decision.value); totals.updated += 1
        } else if (decision.kind === "unchanged") totals.unchanged += 1
        else if (decision.kind === "skipped") totals.skipped += 1
        else conflicts.push({ publicationId: String(publication._id), authorOrder: decision.authorOrder, reason: decision.reason })
      }
    }
    return { ...totals, conflicts, nextCursor: page.continueCursor, isDone: page.isDone }
  },
})
