import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { getUserBySession } from "./reviewer/lib"
import { resolveUserIdentityType } from "./lib/userIdentity"
import { assertActorCanUseScope } from "./lib/oaScopeAuthorization"
import { resolveOAWorkflowRecipients } from "./lib/oaWorkflow"
import {
  contentReviewTaskNaturalKey,
  contentSubmissionFingerprint,
  decideContentReviewOutcome,
  uniqueEligibleReviewerIds,
} from "./lib/contentReviewWorkflow"

/**
 * Permission-granted content publication: the super admin grants per-category
 * (news / events) create and manage rights; creators submit drafts that go
 * through a fixed two-stage flow (submit -> manager review) before appearing
 * as published news/events rows. Categories beyond news/events plug in by
 * extending contentCategoryValidator and the publish branch in review().
 */

const contentCategoryValidator = v.union(v.literal("news"), v.literal("events"))
const permissionCategoryValidator = v.union(
  v.literal("news"),
  v.literal("events"),
  v.literal("reimbursement"),
)

const contentScopeValidator = v.object({
  identityTypes: v.optional(v.array(v.union(
    v.literal("undergrad"),
    v.literal("graduate"),
    v.literal("teacher"),
    v.literal("other"),
  ))),
  roles: v.optional(v.array(v.union(
    v.literal("member"),
    v.literal("admin"),
    v.literal("super_admin"),
  ))),
  userIds: v.optional(v.array(v.id("users"))),
  researchGroupIds: v.optional(v.array(v.id("researchGroups"))),
  userGroupIds: v.optional(v.array(v.id("userGroups"))),
})

const contentPayloadValidator = v.object({
  content: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
  coverImageUrl: v.optional(v.string()),
  newsCategory: v.optional(v.string()),
  date: v.optional(v.string()),
  time: v.optional(v.string()),
  endDate: v.optional(v.string()),
  endTime: v.optional(v.string()),
  location: v.optional(v.string()),
  description: v.optional(v.string()),
  url: v.optional(v.string()),
  color: v.optional(v.string()),
})

type ContentCategory = "news" | "events"
type PermissionCategory = ContentCategory | "reimbursement"

const CATEGORY_LABELS: Record<PermissionCategory, string> = {
  news: "新闻",
  events: "活动",
  reimbursement: "报销",
}
const REVOKED_REVIEWER_AUDIT_COMMENT = "管理权限已撤销，系统跳过此审核任务"

function displayName(user: any): string {
  return user?.chineseName || user?.englishName || user?.username || "未知账号"
}

function normalizeText(value: unknown, fallback = ""): string {
  const text = typeof value === "string" ? value.trim() : ""
  return text || fallback
}

/** Same union semantics as OA scopes; an explicit empty scope means all institute accounts. */
function normalizeContentScope(scope: any, label: string) {
  const clean = (values: unknown) =>
    [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "")).filter(Boolean))]
  const identityTypes = clean(scope?.identityTypes)
  const roles = clean(scope?.roles)
  const userIds = clean(scope?.userIds)
  const researchGroupIds = clean(scope?.researchGroupIds)
  const userGroupIds = clean(scope?.userGroupIds)
  if (!scope || typeof scope !== "object") throw new Error(`${label}格式不正确`)
  return {
    ...(identityTypes.length ? { identityTypes } : {}),
    ...(roles.length ? { roles } : {}),
    ...(userIds.length ? { userIds } : {}),
    ...(researchGroupIds.length ? { researchGroupIds } : {}),
    ...(userGroupIds.length ? { userGroupIds } : {}),
  } as any
}

async function getPermission(ctx: any, category: PermissionCategory, userId: Id<"users">) {
  return await ctx.db
    .query("contentPermissions")
    .withIndex("by_category_user", (q: any) => q.eq("category", category).eq("userId", userId))
    .first()
}

function effectiveRights(_user: any, permission: any) {
  return {
    canCreate: permission?.canCreate === true,
    canReview: permission?.canReview === true,
    canManage: permission?.canManage === true,
  }
}

async function requireRights(
  ctx: any,
  sessionToken: string,
  category: PermissionCategory,
  right: "canCreate" | "canReview" | "canManage",
) {
  const user = await getUserBySession(ctx, sessionToken)
  const permission = await getPermission(ctx, category, user._id)
  const rights = effectiveRights(user, permission)
  if (!rights[right]) {
    throw new Error(
      right === "canCreate"
        ? `你没有创建${CATEGORY_LABELS[category]}的权限`
        : right === "canReview"
          ? `你没有审阅${CATEGORY_LABELS[category]}的权限`
          : `你没有管理${CATEGORY_LABELS[category]}的权限`,
    )
  }
  return user
}

async function notify(ctx: any, input: {
  userId: Id<"users">
  title: string
  body: string
  resourceId: Id<"contentSubmissions">
  naturalKey: string
  now: number
}) {
  const existing = await ctx.db
    .query("notifications")
    .withIndex("by_naturalKey", (q: any) => q.eq("naturalKey", input.naturalKey))
    .first()
  if (existing) return
  await ctx.db.insert("notifications", {
    userId: input.userId,
    kind: "content_review",
    title: input.title,
    body: input.body,
    resourceType: "content_review",
    resourceId: input.resourceId,
    naturalKey: input.naturalKey,
    createdAt: input.now,
  })
}

async function finalizeApprovedSubmission(ctx: any, submission: any, reviewerName: string, now: number, comment?: string) {
  if (submission.status !== "pending") return
  let publishedContentId = submission.publishedContentId
  if (!publishedContentId && submission.category === "news") {
    publishedContentId = String(await ctx.db.insert("news", {
      title: submission.title,
      content: submission.payload.content || "",
      sourceUrl: submission.payload.sourceUrl,
      coverImageUrl: submission.payload.coverImageUrl,
      authorId: submission.createdBy,
      authorName: submission.creatorName,
      category: submission.payload.newsCategory || "新闻",
      publishedAt: submission.sourcePublishedAt ?? now,
      isPublished: true,
      siteScope: "institute",
      targetScope: submission.targetScope,
      createdAt: now,
      updatedAt: now,
    }))
  } else if (!publishedContentId && submission.category === "events") {
    publishedContentId = String(await ctx.db.insert("events", {
      title: submission.title,
      date: submission.payload.date || "",
      time: submission.payload.time,
      endDate: submission.payload.endDate,
      endTime: submission.payload.endTime,
      location: submission.payload.location,
      description: submission.payload.description,
      url: submission.payload.url,
      color: submission.payload.color || "#0F4C81",
      targetScope: submission.targetScope,
      createdAt: now,
      updatedAt: now,
    }))
  }
  await ctx.db.patch(submission._id, {
    status: "approved",
    ...(submission.origin === "external_news_sync" ? { workflowStage: "complete" } : {}),
    reviewerName,
    reviewComment: normalizeText(comment) || undefined,
    reviewedAt: now,
    ...(publishedContentId ? { publishedContentId } : {}),
    updatedAt: now,
  })
  if (submission.origin === "external_news_sync" && submission.sourceLedgerId) {
    await ctx.db.patch(submission.sourceLedgerId, { status: "published", updatedAt: now })
  }
  await notify(ctx, {
    userId: submission.createdBy,
    title: `你的${CATEGORY_LABELS[submission.category as ContentCategory]}已发布`,
    body: `「${submission.title}」已通过审核并发布。`,
    resourceId: submission._id,
    naturalKey: `content_review:done:${String(submission._id)}:approved:${String(submission.createdBy)}`,
    now,
  })
}

/** Snapshot the active publication managers at stage activation. */
export async function createPublicationApprovalTasks(ctx: any, submission: any, now: number) {
  const grants = await ctx.db
    .query("contentPermissions")
    .withIndex("by_category_user", (q: any) => q.eq("category", submission.category))
    .collect()
  const users = await ctx.db.query("users").collect()
  const userById = new Map<string, any>(users.map((user: any) => [String(user._id), user]))
  const reviewerIds = uniqueEligibleReviewerIds(
    grants
      .filter((grant: any) => grant.canManage === true)
      .map((grant: any) => ({
        id: String(grant.userId),
        disabled: userById.get(String(grant.userId))?.accountStatus === "disabled"
          || !userById.has(String(grant.userId)),
      })),
  )
  if (reviewerIds.length === 0) throw new Error("当前没有可用发布审核人")

  for (const reviewerId of reviewerIds) {
    const naturalKey = contentReviewTaskNaturalKey(submission._id, reviewerId, "publication_approval")
    const existing = await ctx.db
      .query("contentReviewTasks")
      .withIndex("by_naturalKey", (q: any) => q.eq("naturalKey", naturalKey))
      .first()
    if (!existing) {
      await ctx.db.insert("contentReviewTasks", {
        submissionId: submission._id,
        userId: reviewerId as Id<"users">,
        stage: "publication_approval",
        status: "pending",
        naturalKey,
        createdAt: now,
        updatedAt: now,
      })
    }
    await notify(ctx, {
      userId: reviewerId as Id<"users">,
      title: `新的${CATEGORY_LABELS[submission.category as ContentCategory]}待发布审核`,
      body: `「${submission.title}」已进入发布审核。`,
      resourceId: submission._id,
      naturalKey: `content_review:publication_approval:${String(submission._id)}:${reviewerId}`,
      now,
    })
  }
  return reviewerIds
}

/**
 * Revoking a manager is also a workflow transition. Pending tasks are retained
 * as skipped audit records. The legacy approved-task branch finalizes content
 * created before the workflow switched from unanimous to first-decision wins.
 * Revocation is rejected atomically if it would strand such a legacy panel.
 */
async function retirePendingReviewTasks(
  ctx: any,
  userId: Id<"users">,
  category: PermissionCategory,
  now: number,
  stage: "source_review" | "publication_approval" = "publication_approval",
) {
  if (category === "reimbursement") return
  const statuses = stage === "source_review" ? ["pending", "changes_requested"] : ["pending"]
  const pendingTasks = (await Promise.all(statuses.map((status) => ctx.db
    .query("contentReviewTasks")
    .withIndex("by_user_status_createdAt", (q: any) => q.eq("userId", userId).eq("status", status))
    .collect()))).flat()
  const affected = new Map<string, any>()
  for (const task of pendingTasks) {
    if ((task.stage ?? "publication_approval") !== stage) continue
    const submission = await ctx.db.get(task.submissionId)
    if (!submission || submission.status !== "pending" || submission.category !== category) continue
    await ctx.db.patch(task._id, {
      status: "skipped",
      comment: REVOKED_REVIEWER_AUDIT_COMMENT,
      decidedAt: now,
      updatedAt: now,
    })
    affected.set(String(submission._id), submission)
  }
  for (const submission of affected.values()) {
    const tasks = await ctx.db
      .query("contentReviewTasks")
      .withIndex("by_submission", (q: any) => q.eq("submissionId", submission._id))
      .collect()
    if (tasks.some((task: any) => task.status === "pending")) continue
    if (!tasks.some((task: any) => (
      (task.stage ?? "publication_approval") === stage
      && (task.status === "approved" || task.status === "accepted")
    ))) {
      throw new Error("无法撤销管理权：仍有待审内容且没有其他已审核人员")
    }
    if (stage === "source_review") continue
    await finalizeApprovedSubmission(ctx, submission, "系统（审核权限撤销）", now, REVOKED_REVIEWER_AUDIT_COMMENT)
  }
}

// ---------------------------------------------------------------------------
// Super-admin permission management
// ---------------------------------------------------------------------------

export const listPermissions = queryGeneric({
  args: { sessionToken: v.string(), category: permissionCategoryValidator },
  handler: async (ctx, args) => {
    const admin = await getUserBySession(ctx, args.sessionToken)
    if (admin.role !== "super_admin") throw new Error("只有超级管理员可以管理内容权限")
    const rows = await ctx.db
      .query("contentPermissions")
      .withIndex("by_category_user", (q: any) => q.eq("category", args.category))
      .collect()
    const result = []
    for (const row of rows) {
      const user = await ctx.db.get(row.userId)
      if (!user) continue
      result.push({
        userId: String(row.userId),
        username: user.username,
        name: displayName(user),
        identityType: resolveUserIdentityType(user),
        canCreate: row.canCreate === true,
        canReview: row.canReview === true,
        canManage: row.canManage === true,
        updatedAt: row.updatedAt,
      })
    }
    return result.sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))
  },
})

export const setPermission = mutationGeneric({
  args: {
    sessionToken: v.string(),
    category: permissionCategoryValidator,
    userId: v.id("users"),
    canCreate: v.boolean(),
    canReview: v.optional(v.boolean()),
    canManage: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await getUserBySession(ctx, args.sessionToken)
    if (admin.role !== "super_admin") throw new Error("只有超级管理员可以管理内容权限")
    const target = await ctx.db.get(args.userId)
    if (!target) throw new Error("目标账号不存在")
    if (target.accountStatus === "disabled") throw new Error("目标账号不可用")
    const now = Date.now()
    const existing = await getPermission(ctx, args.category, args.userId)
    const canReview = args.category === "news" && args.canReview === true
    if (!args.canCreate && !canReview && !args.canManage) {
      if (existing) await ctx.db.delete(existing._id)
      if (existing?.canReview) await retirePendingReviewTasks(ctx, args.userId, args.category, now, "source_review")
      if (existing?.canManage) await retirePendingReviewTasks(ctx, args.userId, args.category, now)
      return true
    }
    if (existing) {
      await ctx.db.patch(existing._id, {
        canCreate: args.canCreate,
        canReview,
        canManage: args.canManage,
        grantedBy: admin._id,
        updatedAt: now,
      })
      if (existing.canManage && !args.canManage) {
        await retirePendingReviewTasks(ctx, args.userId, args.category, now)
      }
      if (existing.canReview && !canReview) {
        await retirePendingReviewTasks(ctx, args.userId, args.category, now, "source_review")
      }
    } else {
      await ctx.db.insert("contentPermissions", {
        category: args.category,
        userId: args.userId,
        canCreate: args.canCreate,
        canReview,
        canManage: args.canManage,
        grantedBy: admin._id,
        createdAt: now,
        updatedAt: now,
      })
    }
    return true
  },
})

/**
 * The selected scope is never expanded by the client. The super administrator
 * submits the original scope and the server resolves its current members.
 */
export const setPermissionsForScope = mutationGeneric({
  args: {
    sessionToken: v.string(),
    category: permissionCategoryValidator,
    scope: contentScopeValidator,
    canCreate: v.boolean(),
    canReview: v.optional(v.boolean()),
    canManage: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await getUserBySession(ctx, args.sessionToken)
    if (admin.role !== "super_admin") throw new Error("只有超级管理员可以管理内容权限")
    const scope = normalizeContentScope(args.scope, "授权范围")
    if (!scope.identityTypes?.length
      && !scope.roles?.length
      && !scope.userIds?.length
      && !scope.researchGroupIds?.length
      && !scope.userGroupIds?.length) {
      throw new Error("授权范围不能为空")
    }
    await assertActorCanUseScope(ctx, admin, scope)
    const recipients = await resolveOAWorkflowRecipients(ctx, scope)
    const targets = new Map<string, any>()
    for (const recipient of recipients) {
      if (recipient.accountStatus === "disabled") continue
      targets.set(String(recipient._id), recipient)
    }
    if (targets.size === 0) throw new Error("授权范围内没有可用账号")

    const now = Date.now()
    const canReview = args.category === "news" && args.canReview === true
    for (const target of targets.values()) {
      const existing = await getPermission(ctx, args.category, target._id)
      if (!args.canCreate && !canReview && !args.canManage) {
        if (existing) await ctx.db.delete(existing._id)
        if (existing?.canReview) await retirePendingReviewTasks(ctx, target._id, args.category, now, "source_review")
        if (existing?.canManage) await retirePendingReviewTasks(ctx, target._id, args.category, now)
        continue
      }
      if (existing) {
        await ctx.db.patch(existing._id, {
          canCreate: args.canCreate,
          canReview,
          canManage: args.canManage,
          grantedBy: admin._id,
          updatedAt: now,
        })
        if (existing.canManage && !args.canManage) {
          await retirePendingReviewTasks(ctx, target._id, args.category, now)
        }
        if (existing.canReview && !canReview) {
          await retirePendingReviewTasks(ctx, target._id, args.category, now, "source_review")
        }
      } else {
        await ctx.db.insert("contentPermissions", {
          category: args.category,
          userId: target._id,
          canCreate: args.canCreate,
          canReview,
          canManage: args.canManage,
          grantedBy: admin._id,
          createdAt: now,
          updatedAt: now,
        })
      }
    }
    return { updated: targets.size }
  },
})

export const removePermission = mutationGeneric({
  args: { sessionToken: v.string(), category: permissionCategoryValidator, userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await getUserBySession(ctx, args.sessionToken)
    if (admin.role !== "super_admin") throw new Error("只有超级管理员可以管理内容权限")
    const existing = await getPermission(ctx, args.category, args.userId)
    if (existing) await ctx.db.delete(existing._id)
    if (existing?.canReview) {
      await retirePendingReviewTasks(ctx, args.userId, args.category, Date.now(), "source_review")
    }
    if (existing?.canManage) {
      await retirePendingReviewTasks(ctx, args.userId, args.category, Date.now())
    }
    return true
  },
})

/** Rights of the signed-in account across every category (drives the portal section). */
export const myPermissions = queryGeneric({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const rows = await ctx.db
      .query("contentPermissions")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect()
    const byCategory = new Map(rows.map((row: any) => [row.category as PermissionCategory, row]))
    const categories: PermissionCategory[] = ["news", "events", "reimbursement"]
    const result: Record<string, { canCreate: boolean; canReview: boolean; canManage: boolean }> = {}
    for (const category of categories) {
      result[category] = effectiveRights(user, byCategory.get(category))
    }
    return result
  },
})

// ---------------------------------------------------------------------------
// Creation + fixed two-stage review
// ---------------------------------------------------------------------------

export const submit = mutationGeneric({
  args: {
    sessionToken: v.string(),
    category: contentCategoryValidator,
    title: v.string(),
    payload: contentPayloadValidator,
    targetScope: contentScopeValidator,
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRights(ctx, args.sessionToken, args.category, "canCreate")
    const title = normalizeText(args.title)
    if (!title) throw new Error("请填写标题")
    const targetScope = normalizeContentScope(args.targetScope, "可见范围")
    const payload: Record<string, string> = {}
    const put = (key: string, value: unknown) => {
      const text = normalizeText(value)
      if (text) payload[key] = text
    }
    if (args.category === "news") {
      const content = normalizeText(args.payload.content)
      if (!content) throw new Error("请填写新闻正文")
      payload.content = content
      put("newsCategory", args.payload.newsCategory)
      put("sourceUrl", args.payload.sourceUrl)
      put("coverImageUrl", args.payload.coverImageUrl)
    } else {
      const date = normalizeText(args.payload.date)
      if (!date) throw new Error("请填写活动日期")
      payload.date = date
      put("time", args.payload.time)
      put("endDate", args.payload.endDate)
      put("endTime", args.payload.endTime)
      put("location", args.payload.location)
      put("description", args.payload.description)
      put("url", args.payload.url)
      put("color", args.payload.color)
    }

    await assertActorCanUseScope(ctx, user, targetScope)
    const requestFingerprint = contentSubmissionFingerprint({
      category: args.category,
      title,
      payload,
      targetScope,
    })
    // Older callers do not yet send a request key. Falling back to the
    // fingerprint still makes network retries safe; updated clients can use a
    // fresh caller key when intentionally submitting identical content twice.
    const idempotencyKey = normalizeText(args.idempotencyKey).slice(0, 120) || requestFingerprint
    const existing = await ctx.db
      .query("contentSubmissions")
      .withIndex("by_creator_idempotency", (q: any) => (
        q.eq("createdBy", user._id).eq("idempotencyKey", idempotencyKey)
      ))
      .first()
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) {
        throw new Error("请求标识已用于不同内容")
      }
      return existing._id
    }

    const now = Date.now()
    const submissionId = await ctx.db.insert("contentSubmissions", {
      category: args.category,
      title,
      payload,
      targetScope,
      createdBy: user._id,
      creatorName: displayName(user),
      idempotencyKey,
      requestFingerprint,
      origin: "manual",
      status: "pending",
      workflowStage: "publication_approval",
      createdAt: now,
      updatedAt: now,
    })

    const submission = await ctx.db.get(submissionId)
    await createPublicationApprovalTasks(ctx, submission, now)
    return submissionId
  },
})

async function projectSubmissionWithTasks(
  ctx: any,
  submission: any,
  viewerId: Id<"users">,
  viewerCanReview = false,
) {
  const tasks = await ctx.db
    .query("contentReviewTasks")
    .withIndex("by_submission", (q: any) => q.eq("submissionId", submission._id))
    .collect()
  const projectedTasks = []
  for (const task of tasks) {
    if (submission.status === "pending") {
      const permission = await getPermission(ctx, submission.category, task.userId)
      const stage = task.stage ?? "publication_approval"
      if (stage === "source_review" ? permission?.canReview !== true : permission?.canManage !== true) continue
    }
    const reviewer = await ctx.db.get(task.userId)
    projectedTasks.push({
      _id: String(task._id),
      isMine: String(task.userId) === String(viewerId),
      reviewerName: displayName(reviewer),
      status: task.status,
      stage: task.stage ?? "publication_approval",
      comment: task.comment,
      decidedAt: task.decidedAt,
    })
  }
  const { idempotencyKey: _idempotencyKey, requestFingerprint: _requestFingerprint, ...safeSubmission } = submission
  return {
    ...safeSubmission,
    tasks: projectedTasks,
    myTaskId: projectedTasks.find((task) => task.isMine)?._id,
    canReview: viewerCanReview && submission.status === "pending",
  }
}

export const reviewQueue = queryGeneric({
  args: {
    sessionToken: v.string(),
    category: contentCategoryValidator,
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireRights(ctx, args.sessionToken, args.category, "canManage")
    const rows = args.status
      ? await ctx.db
        .query("contentSubmissions")
        .withIndex("by_category_status_createdAt", (q: any) => q.eq("category", args.category).eq("status", args.status))
        .order("desc")
        .collect()
      : (await ctx.db.query("contentSubmissions").collect())
        .filter((row: any) => row.category === args.category)
        .sort((left: any, right: any) => right.createdAt - left.createdAt)
    const eligibleRows = rows.filter((row: any) => (
      row.status !== "pending" || (row.workflowStage ?? "publication_approval") === "publication_approval"
    ))
    return await Promise.all(eligibleRows.map((row: any) => projectSubmissionWithTasks(ctx, row, reviewer._id, true)))
  },
})

export const mySubmissions = queryGeneric({
  args: { sessionToken: v.string(), category: contentCategoryValidator },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const rows = await ctx.db
      .query("contentSubmissions")
      .withIndex("by_creator_createdAt", (q: any) => q.eq("createdBy", user._id))
      .order("desc")
      .collect()
      .then((rows) => rows.filter((row: any) => row.category === args.category))
    return await Promise.all(rows.map((row: any) => projectSubmissionWithTasks(ctx, row, user._id)))
  },
})

/**
 * Exact detail lookup used by creator and review-task routes.
 *
 * Access is derived from the immutable submission/task relationship, not from
 * the actor's current category grant. Returning null for every unavailable
 * case keeps a deleted ID, a category mismatch, and an inaccessible ID
 * indistinguishable to the caller.
 */
export const getSubmissionDetail = queryGeneric({
  args: {
    sessionToken: v.string(),
    id: v.id("contentSubmissions"),
    category: contentCategoryValidator,
  },
  handler: async (ctx, args) => {
    const viewer = await getUserBySession(ctx, args.sessionToken)
    const submission = await ctx.db.get(args.id)
    if (!submission || submission.category !== args.category) return null

    const viewerTask = await ctx.db
      .query("contentReviewTasks")
      .withIndex("by_submission_user", (q: any) => (
        q.eq("submissionId", submission._id).eq("userId", viewer._id)
      ))
      .first()
    const canView = viewer.role === "super_admin"
      || String(submission.createdBy) === String(viewer._id)
      || viewerTask !== null
    if (!canView) return null

    return await projectSubmissionWithTasks(ctx, submission, viewer._id)
  },
})

export const review = mutationGeneric({
  args: {
    sessionToken: v.string(),
    taskId: v.optional(v.id("contentReviewTasks")),
    // Kept temporarily for old clients; it is resolved to this actor's stored
    // task and never authorizes review from the submission ID alone.
    id: v.optional(v.id("contentSubmissions")),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reviewer = await getUserBySession(ctx, args.sessionToken)
    let task = args.taskId ? await ctx.db.get(args.taskId) : null
    let submission = task
      ? await ctx.db.get(task.submissionId)
      : args.id
        ? await ctx.db.get(args.id)
        : null
    if (!submission) throw new Error("提交不存在")
    if ((task?.stage ?? "publication_approval") !== "publication_approval") {
      throw new Error("来源审阅任务必须在新闻审阅页面处理")
    }
    await requireRights(ctx, args.sessionToken, submission.category as ContentCategory, "canManage")

    if (!task) {
      const actorTasks = await ctx.db
        .query("contentReviewTasks")
        .withIndex("by_submission_user", (q: any) => (
          q.eq("submissionId", submission._id).eq("userId", reviewer._id)
        ))
        .collect()
      task = actorTasks.find((candidate: any) => (candidate.stage ?? "publication_approval") === "publication_approval") ?? null
      if (!task && submission.status === "pending") {
        const now = Date.now()
        const naturalKey = contentReviewTaskNaturalKey(submission._id, reviewer._id, "publication_approval")
        const existingTask = await ctx.db
          .query("contentReviewTasks")
          .withIndex("by_naturalKey", (q: any) => q.eq("naturalKey", naturalKey))
          .first()
        const taskId = existingTask?._id ?? await ctx.db.insert("contentReviewTasks", {
          submissionId: submission._id,
          userId: reviewer._id,
          stage: "publication_approval",
          status: "pending",
          naturalKey,
          createdAt: now,
          updatedAt: now,
        })
        task = await ctx.db.get(taskId)
      }
    }
    if (!task) throw new Error("审核任务不存在")
    if ((task.stage ?? "publication_approval") !== "publication_approval") {
      throw new Error("来源审阅任务必须在新闻审阅页面处理")
    }
    if (String(task.userId) !== String(reviewer._id)) throw new Error("无权处理该审核任务")
    if (String(task.submissionId) !== String(submission._id)) throw new Error("审核任务与提交不匹配")
    if (task.status === args.decision) return true
    if (task.status !== "pending") throw new Error("该审核任务已处理")
    if (submission.status !== "pending") throw new Error("该提交已完成审核")

    const now = Date.now()
    const tasks = await ctx.db
      .query("contentReviewTasks")
      .withIndex("by_submission", (q: any) => q.eq("submissionId", submission._id))
      .collect()
    const publicationTasks = tasks.filter((candidate: any) => (
      (candidate.stage ?? "publication_approval") === "publication_approval"
    ))
    const transition = decideContentReviewOutcome(
      publicationTasks.map((candidate: any) => ({ id: String(candidate._id), status: candidate.status })),
      String(task._id),
      args.decision,
    )
    const taskById = new Map(publicationTasks.map((candidate: any) => [String(candidate._id), candidate]))
    for (const update of transition.taskUpdates) {
      const candidate = taskById.get(update.id)
      if (!candidate) continue
      await ctx.db.patch(candidate._id, {
        status: update.status,
        ...(candidate._id === task._id && normalizeText(args.comment)
          ? { comment: normalizeText(args.comment) }
          : {}),
        ...(update.status === "approved" || update.status === "rejected" ? { decidedAt: now } : {}),
        updatedAt: now,
      })
    }

    if (transition.outcome === "pending") {
      await ctx.db.patch(submission._id, { updatedAt: now })
      return true
    }

    if (transition.outcome === "approved") {
      // The helper reuses submission.publishedContentId so an approval retry
      // cannot publish a second row.
      await finalizeApprovedSubmission(ctx, submission, displayName(reviewer), now, args.comment)
      return true
    }
    await ctx.db.patch(submission._id, {
      status: transition.outcome,
      ...(submission.origin === "external_news_sync" ? { workflowStage: "complete" } : {}),
      reviewedBy: reviewer._id,
      reviewerName: displayName(reviewer),
      reviewComment: normalizeText(args.comment) || undefined,
      reviewedAt: now,
      updatedAt: now,
    })
    if (submission.origin === "external_news_sync" && submission.sourceLedgerId) {
      await ctx.db.patch(submission.sourceLedgerId, { status: "rejected", updatedAt: now })
    }
    await notify(ctx, {
      userId: submission.createdBy,
      title: `你的${CATEGORY_LABELS[submission.category as ContentCategory]}未通过审核`,
      body: `「${submission.title}」未通过审核。${normalizeText(args.comment) ? `审核意见：${normalizeText(args.comment)}` : ""}`,
      resourceId: submission._id,
      naturalKey: `content_review:done:${String(submission._id)}:${transition.outcome}:${String(submission.createdBy)}`,
      now,
    })
    return true
  },
})
