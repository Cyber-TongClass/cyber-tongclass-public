import type { Id } from "./_generated/dataModel"
import { mutation } from "./_generated/server"
import { v } from "convex/values"

type VoteTargetType = "treeholePost" | "treeholeReply" | "courseReview"
type VoteValue = 1 | -1

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

function normalizeVoteValue(value: number | undefined): VoteValue | undefined {
  if (value === undefined) return undefined
  if (value === 1 || value === -1) return value
  throw new Error("投票参数无效")
}

export async function getVoteSummaryMap(
  ctx: any,
  targetType: VoteTargetType,
  targetIds: string[],
  currentUserId?: Id<"users"> | string
) {
  const uniqueTargetIds = Array.from(new Set(targetIds.filter(Boolean)))
  const entries = await Promise.all(
    uniqueTargetIds.map(async (targetId) => {
      const votes = await ctx.db
        .query("contentVotes")
        .withIndex("by_target", (q: any) => q.eq("targetType", targetType).eq("targetId", targetId))
        .collect()

      let likes = 0
      let dislikes = 0
      let currentUserVote: VoteValue | undefined

      for (const vote of votes) {
        if (vote.value === 1) likes += 1
        if (vote.value === -1) dislikes += 1
        if (currentUserId && String(vote.userId) === String(currentUserId)) {
          currentUserVote = vote.value === 1 ? 1 : -1
        }
      }

      return [
        targetId,
        {
          likes,
          dislikes,
          score: likes - dislikes,
          currentUserVote,
        },
      ] as const
    })
  )

  return new Map(entries)
}

async function setVote(
  ctx: any,
  args: { sessionToken: string; id: any; value?: number },
  targetType: VoteTargetType
) {
  const actor = await getActorOrThrow(ctx, args.sessionToken)
  const target = await ctx.db.get(args.id)
  if (!target) {
    throw new Error("内容不存在")
  }

  const value = normalizeVoteValue(args.value)
  const targetId = String(args.id)
  const existing = await ctx.db
    .query("contentVotes")
    .withIndex("by_user_target", (q: any) =>
      q.eq("userId", actor._id).eq("targetType", targetType).eq("targetId", targetId)
    )
    .first()

  const now = Date.now()
  if (value === undefined) {
    if (existing) {
      await ctx.db.delete(existing._id)
    }
  } else if (existing) {
    await ctx.db.patch(existing._id, { value, updatedAt: now })
  } else {
    await ctx.db.insert("contentVotes", {
      userId: actor._id,
      targetType,
      targetId,
      value,
      createdAt: now,
      updatedAt: now,
    })
  }

  const summaries = await getVoteSummaryMap(ctx, targetType, [targetId], actor._id)
  return summaries.get(targetId) || { likes: 0, dislikes: 0, score: 0, currentUserVote: undefined }
}

export const voteTreeholePost = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("treeholePosts"),
    value: v.optional(v.number()),
  },
  handler: async (ctx, args) => setVote(ctx, args, "treeholePost"),
})

export const voteTreeholeReply = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("treeholeReplies"),
    value: v.optional(v.number()),
  },
  handler: async (ctx, args) => setVote(ctx, args, "treeholeReply"),
})

export const voteCourseReview = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("courseReviews"),
    value: v.optional(v.number()),
  },
  handler: async (ctx, args) => setVote(ctx, args, "courseReview"),
})
