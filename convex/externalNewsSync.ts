import {
  actionGeneric,
  internalActionGeneric,
  internalMutationGeneric,
  internalQueryGeneric,
  makeFunctionReference,
  mutationGeneric,
  queryGeneric,
} from "convex/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { createPublicationApprovalTasks } from "./contentReview"
import { assertActorCanUseScope } from "./lib/oaScopeAuthorization"
import { resolveOAWorkflowRecipients } from "./lib/oaWorkflow"
import {
  canonicalizeExternalNewsUrl,
  decideExternalNewsIngest,
  decideExternalReview,
  externalNewsSyncLimits,
  externalNewsIdentity,
  intersectActiveReviewers,
  shouldExecuteExternalNewsSync,
  sourceSnapshotHash,
  type ExternalNewsFailureCode,
  type ExternalNewsSourceKey,
  type ExternalNewsSyncTrigger,
} from "./lib/externalNewsModel"
import { fetchExternalNewsHtml, mapWithConcurrency } from "./lib/externalNewsFetch"
import {
  EXTERNAL_NEWS_SOURCES,
  parseExternalNewsDetail,
  parseExternalNewsList,
} from "./lib/externalNewsSources"
import { contentReviewTaskNaturalKey, contentSubmissionFingerprint } from "./lib/contentReviewWorkflow"
import { getUserBySession } from "./reviewer/lib"

type SyncMode = "observation" | "draft"
type ReviewerMode = "scope" | "all_reviewers"
type ReviewDecision = "accept" | "request_changes" | "reject"

const sourceKeyValidator = v.union(
  v.literal("news"),
  v.literal("notices"),
  v.literal("research_progress"),
  v.literal("academic_lectures"),
)
const scopeValidator = v.object({
  identityTypes: v.optional(v.array(v.string())),
  roles: v.optional(v.array(v.string())),
  userIds: v.optional(v.array(v.id("users"))),
  researchGroupIds: v.optional(v.array(v.id("researchGroups"))),
  userGroupIds: v.optional(v.array(v.id("userGroups"))),
})

const ref = <T extends "query" | "mutation" | "action">(name: string) =>
  makeFunctionReference<T>(`externalNewsSync:${name}`) as any

const requireSuperAdminRef = ref<"query">("requireSuperAdmin")
const getRunConfigurationRef = ref<"query">("getRunConfiguration")
const beginRunRef = ref<"mutation">("beginRun")
const finishRunRef = ref<"mutation">("finishRun")
const recordSourceHealthRef = ref<"mutation">("recordSourceHealth")
const ingestFetchedItemRef = ref<"mutation">("ingestFetchedItem")
const executeRunRef = ref<"action">("executeRun")

function normalizeText(value: unknown, max = 100_000) {
  return String(value ?? "").trim().slice(0, max)
}

function normalizeScope(scope: any) {
  const unique = (values: unknown) => [...new Set(
    (Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean),
  )]
  return {
    ...(unique(scope?.identityTypes).length ? { identityTypes: unique(scope.identityTypes) } : {}),
    ...(unique(scope?.roles).length ? { roles: unique(scope.roles) } : {}),
    ...(unique(scope?.userIds).length ? { userIds: unique(scope.userIds) } : {}),
    ...(unique(scope?.researchGroupIds).length ? { researchGroupIds: unique(scope.researchGroupIds) } : {}),
    ...(unique(scope?.userGroupIds).length ? { userGroupIds: unique(scope.userGroupIds) } : {}),
  } as any
}

function userName(user: any) {
  return user?.chineseName || user?.englishName || user?.username || "未知账号"
}

async function requireSuperAdminUser(ctx: any, token: string) {
  const user = await getUserBySession(ctx, token)
  if (user.role !== "super_admin") throw new Error("只有超级管理员可以管理外网新闻同步")
  return user
}

async function newsReviewGrants(ctx: any) {
  const grants = await ctx.db
    .query("contentPermissions")
    .withIndex("by_category_user", (q: any) => q.eq("category", "news"))
    .collect()
  const users = await ctx.db.query("users").collect()
  const userById = new Map<string, any>(users.map((user: any) => [String(user._id), user]))
  return grants.map((grant: any) => ({
    id: String(grant.userId),
    canReview: grant.canReview === true,
    disabled: userById.get(String(grant.userId))?.accountStatus === "disabled"
      || !userById.has(String(grant.userId)),
  }))
}

async function resolveReviewers(ctx: any, settings: any) {
  const grants = await newsReviewGrants(ctx)
  const resolved = settings.reviewerMode === "all_reviewers"
    ? grants.map((grant: { id: string }) => grant.id)
    : (await resolveOAWorkflowRecipients(ctx, settings.reviewerScope || {}))
      .map((user: any) => String(user._id))
  return intersectActiveReviewers(resolved, grants)
}

async function notifyReviewer(ctx: any, input: {
  userId: Id<"users">
  submissionId: Id<"contentSubmissions">
  title: string
  body: string
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
    resourceId: input.submissionId,
    naturalKey: input.naturalKey,
    createdAt: input.now,
  })
}

async function assignedSourceTask(ctx: any, taskId: Id<"contentReviewTasks">, userId: Id<"users">) {
  const task = await ctx.db.get(taskId)
  if (!task || String(task.userId) !== String(userId) || task.stage !== "source_review") {
    throw new Error("外网新闻审阅任务不存在")
  }
  const submission = await ctx.db.get(task.submissionId)
  if (!submission || submission.origin !== "external_news_sync" || submission.category !== "news") {
    throw new Error("外网新闻审阅稿不存在")
  }
  return { task, submission }
}

function safeFailureCode(error: unknown): ExternalNewsFailureCode {
  const message = error instanceof Error ? error.message : String(error)
  const codes: ExternalNewsFailureCode[] = [
    "invalid_url", "blocked_host", "redirect_blocked", "timeout", "response_too_large",
    "invalid_content_type", "http_error", "list_parse_failed", "detail_parse_failed",
    "empty_reviewer_set", "ingest_failed",
  ]
  return codes.find((code) => message.includes(code)) ?? "ingest_failed"
}

export const requireSuperAdmin = internalQueryGeneric({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const user = await requireSuperAdminUser(ctx, args.sessionToken)
    return { userId: user._id }
  },
})

export const getRunConfiguration = internalQueryGeneric({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("externalNewsSyncSettings")
      .withIndex("by_singletonKey", (q: any) => q.eq("singletonKey", "default"))
      .first()
    return settings ?? null
  },
})

export const beginRun = internalMutationGeneric({
  args: {
    trigger: v.union(v.literal("cron"), v.literal("manual")),
    requestedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("externalNewsSyncSettings")
      .withIndex("by_singletonKey", (q: any) => q.eq("singletonKey", "default"))
      .first()
    const now = Date.now()
    return await ctx.db.insert("externalNewsSyncRuns", {
      trigger: args.trigger,
      requestedBy: args.requestedBy,
      mode: settings?.mode ?? "observation",
      status: "running",
      discoveredCount: 0,
      draftCount: 0,
      failureCount: 0,
      startedAt: now,
    })
  },
})

export const finishRun = internalMutationGeneric({
  args: {
    runId: v.id("externalNewsSyncRuns"),
    discoveredCount: v.number(),
    draftCount: v.number(),
    failureCount: v.number(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    if (!run) return false
    await ctx.db.patch(args.runId, {
      status: args.failureCount === 0
        ? "completed"
        : args.discoveredCount > 0 ? "partial_failure" : "failed",
      discoveredCount: args.discoveredCount,
      draftCount: args.draftCount,
      failureCount: args.failureCount,
      finishedAt: Date.now(),
    })
    return true
  },
})

export const recordSourceHealth = internalMutationGeneric({
  args: {
    sourceKey: sourceKeyValidator,
    success: v.boolean(),
    failureCode: v.optional(v.string()),
    discoveredCount: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("externalNewsSourceHealth")
      .withIndex("by_sourceKey", (q: any) => q.eq("sourceKey", args.sourceKey))
      .first()
    const values = {
      sourceKey: args.sourceKey,
      lastAttemptAt: now,
      ...(args.success ? { lastSuccessAt: now, lastFailureCode: undefined } : { lastFailureCode: args.failureCode }),
      consecutiveFailures: args.success ? 0 : (existing?.consecutiveFailures ?? 0) + 1,
      lastDiscoveredCount: args.discoveredCount,
      updatedAt: now,
    }
    if (existing) await ctx.db.patch(existing._id, values)
    else await ctx.db.insert("externalNewsSourceHealth", values)
  },
})

export const ingestFetchedItem = internalMutationGeneric({
  args: {
    mode: v.union(v.literal("observation"), v.literal("draft")),
    sourceKey: sourceKeyValidator,
    canonicalUrl: v.string(),
    title: v.string(),
    markdown: v.string(),
    category: v.string(),
    coverImageUrl: v.optional(v.string()),
    sourcePublishedAt: v.optional(v.number()),
    contentHash: v.string(),
  },
  handler: async (ctx, args) => {
    const canonicalUrl = canonicalizeExternalNewsUrl(args.canonicalUrl)
    const identity = externalNewsIdentity(args.sourceKey as ExternalNewsSourceKey, canonicalUrl)
    const now = Date.now()
    let ledger = await ctx.db
      .query("externalNewsSyncLedger")
      .withIndex("by_identity", (q: any) => q.eq("identity", identity))
      .first()

    let historicalSubmission: any = null
    let historicalNews: any = null
    if (!ledger) {
      const newsRows = await ctx.db.query("news").collect()
      historicalNews = newsRows.find((row: any) => {
        try { return row.sourceUrl && canonicalizeExternalNewsUrl(row.sourceUrl) === canonicalUrl } catch { return false }
      })
      const submissions = await ctx.db.query("contentSubmissions").collect()
      historicalSubmission = submissions.find((row: any) => {
        try { return row.payload?.sourceUrl && canonicalizeExternalNewsUrl(row.payload.sourceUrl) === canonicalUrl } catch { return false }
      })
    }
    const historicalMatch = Boolean(historicalSubmission || historicalNews)
    const decision = decideExternalNewsIngest({
      mode: args.mode as SyncMode,
      ledger: ledger ? { currentHash: ledger.currentHash, submissionId: ledger.submissionId && String(ledger.submissionId) } : null,
      incomingHash: args.contentHash,
      historicalMatch,
    })

    if (!ledger) {
      const ledgerId = await ctx.db.insert("externalNewsSyncLedger", {
        identity,
        sourceKey: args.sourceKey,
        canonicalUrl,
        sourcePublishedAt: args.sourcePublishedAt,
        firstSeenAt: now,
        lastSeenAt: now,
        lastFetchedAt: now,
        currentHash: decision === "adopt_historical" || decision === "observe" ? args.contentHash : undefined,
        status: historicalNews ? "published" : historicalSubmission ? "draft_created" : "observed",
        submissionId: historicalSubmission?._id,
        createdAt: now,
        updatedAt: now,
      })
      ledger = await ctx.db.get(ledgerId)
    }
    if (!ledger) throw new Error("ingest_failed")

    let snapshot = await ctx.db
      .query("externalNewsSourceSnapshots")
      .withIndex("by_ledger_hash", (q: any) => q.eq("ledgerId", ledger._id).eq("contentHash", args.contentHash))
      .first()
    if (!snapshot) {
      const snapshotId = await ctx.db.insert("externalNewsSourceSnapshots", {
        ledgerId: ledger._id,
        contentHash: args.contentHash,
        title: normalizeText(args.title, 300),
        markdown: normalizeText(args.markdown),
        category: normalizeText(args.category, 80),
        sourceUrl: canonicalUrl,
        coverImageUrl: args.coverImageUrl,
        sourcePublishedAt: args.sourcePublishedAt,
        fetchedAt: now,
      })
      snapshot = await ctx.db.get(snapshotId)
    }
    if (!snapshot) throw new Error("ingest_failed")

    if (decision === "touch" || decision === "adopt_historical") {
      await ctx.db.patch(ledger._id, { lastSeenAt: now, lastFetchedAt: now, updatedAt: now })
      return { decision, ledgerId: ledger._id }
    }
    if (decision === "observe") {
      await ctx.db.patch(ledger._id, {
        lastSeenAt: now,
        lastFetchedAt: now,
        currentHash: args.contentHash,
        sourcePublishedAt: args.sourcePublishedAt,
        updatedAt: now,
      })
      return { decision, ledgerId: ledger._id }
    }
    if (decision === "record_update") {
      const submission = ledger.submissionId ? await ctx.db.get(ledger.submissionId) : null
      if (submission) {
        await ctx.db.patch(submission._id, {
          pendingSourceSnapshotId: snapshot._id,
          sourceUpdateAvailable: true,
          updatedAt: now,
        })
      }
      await ctx.db.patch(ledger._id, {
        status: "update_available",
        lastSeenAt: now,
        lastFetchedAt: now,
        updatedAt: now,
      })
      return { decision, ledgerId: ledger._id }
    }

    const settings = await ctx.db
      .query("externalNewsSyncSettings")
      .withIndex("by_singletonKey", (q: any) => q.eq("singletonKey", "default"))
      .first()
    if (!settings) throw new Error("empty_reviewer_set")
    const reviewerIds = await resolveReviewers(ctx, settings)
    if (reviewerIds.length === 0) throw new Error("empty_reviewer_set")
    const title = normalizeText(args.title, 300)
    const markdown = normalizeText(args.markdown)
    if (!title || !markdown) throw new Error("detail_parse_failed")
    const payload = {
      content: markdown,
      sourceUrl: canonicalUrl,
      ...(args.coverImageUrl ? { coverImageUrl: args.coverImageUrl } : {}),
      newsCategory: normalizeText(args.category, 80) || "学院新闻",
    }
    const requestFingerprint = contentSubmissionFingerprint({ category: "news", title, payload, targetScope: {} })
    const submissionId = await ctx.db.insert("contentSubmissions", {
      category: "news",
      title,
      payload,
      targetScope: {},
      createdBy: settings.updatedBy,
      creatorName: "AIA 官网同步机器人",
      idempotencyKey: `external-news:${identity}`.slice(0, 120),
      requestFingerprint,
      origin: "external_news_sync",
      workflowStage: "source_review",
      sourceReviewStatus: "pending",
      sourceLedgerId: ledger._id,
      activeSourceSnapshotId: snapshot._id,
      sourcePublishedAt: args.sourcePublishedAt,
      sourceUpdateAvailable: false,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    for (const reviewerId of reviewerIds) {
      const naturalKey = contentReviewTaskNaturalKey(submissionId, reviewerId, "source_review")
      await ctx.db.insert("contentReviewTasks", {
        submissionId,
        userId: reviewerId as Id<"users">,
        stage: "source_review",
        status: "pending",
        naturalKey,
        createdAt: now,
        updatedAt: now,
      })
      await notifyReviewer(ctx, {
        userId: reviewerId as Id<"users">,
        submissionId,
        title: "新的外网新闻待审阅",
        body: `AIA 官网同步了「${title}」，等待内容审阅。`,
        naturalKey: `external-news:source-review:${String(submissionId)}:${reviewerId}`,
        now,
      })
    }
    await ctx.db.patch(ledger._id, {
      submissionId,
      currentHash: args.contentHash,
      sourcePublishedAt: args.sourcePublishedAt,
      status: "draft_created",
      lastSeenAt: now,
      lastFetchedAt: now,
      updatedAt: now,
    })
    return { decision, ledgerId: ledger._id, submissionId }
  },
})

async function runSync(
  ctx: any,
  runId: Id<"externalNewsSyncRuns">,
  trigger: ExternalNewsSyncTrigger,
) {
  const settings = await ctx.runQuery(getRunConfigurationRef, {})
  if (!shouldExecuteExternalNewsSync(trigger, settings)) {
    await ctx.runMutation(finishRunRef, { runId, discoveredCount: 0, draftCount: 0, failureCount: 0 })
    return
  }
  let discoveredCount = 0
  let draftCount = 0
  let failureCount = 0
  const limits = externalNewsSyncLimits(trigger)

  for (const source of EXTERNAL_NEWS_SOURCES) {
    let sourceDiscovered = 0
    let sourceFailures = 0
    let sourceFailureCode: ExternalNewsFailureCode | undefined
    try {
      const items = new Map<string, { title: string; url: string; sourcePublishedAt?: number; coverImageUrl?: string }>()
      let pageUrl: string | undefined = source.listUrl
      for (let page = 0; page < limits.maxPages && pageUrl; page += 1) {
        const html = await fetchExternalNewsHtml(pageUrl)
        const parsed = parseExternalNewsList(source.key, html, pageUrl)
        for (const item of parsed.items) items.set(item.url, item)
        pageUrl = parsed.nextPageUrl
      }
      const selectedItems = [...items.values()].slice(0, limits.maxItemsPerSource)
      sourceDiscovered = selectedItems.length
      discoveredCount += selectedItems.length
      const outcomes = await mapWithConcurrency(selectedItems, 2, async (item) => {
        try {
          const html = await fetchExternalNewsHtml(item.url)
          const detail = parseExternalNewsDetail(source.key, html, item.url)
          const sourcePublishedAt = detail.sourcePublishedAt ?? item.sourcePublishedAt
          const contentHash = await sourceSnapshotHash({
            title: detail.title,
            markdown: detail.markdown,
            sourcePublishedAt,
          })
          return await ctx.runMutation(ingestFetchedItemRef, {
            mode: settings.mode,
            sourceKey: source.key,
            canonicalUrl: item.url,
            title: detail.title,
            markdown: detail.markdown,
            category: source.category,
            coverImageUrl: detail.coverImageUrl ?? item.coverImageUrl,
            sourcePublishedAt,
            contentHash,
          })
        } catch (error) {
          sourceFailures += 1
          sourceFailureCode = safeFailureCode(error)
          return null
        }
      })
      draftCount += outcomes.filter((result: any) => result?.decision === "create_draft").length
    } catch (error) {
      sourceFailures += 1
      sourceFailureCode = safeFailureCode(error)
    }
    failureCount += sourceFailures
    await ctx.runMutation(recordSourceHealthRef, {
      sourceKey: source.key,
      success: sourceFailures === 0,
      failureCode: sourceFailureCode,
      discoveredCount: sourceDiscovered,
    })
  }
  await ctx.runMutation(finishRunRef, { runId, discoveredCount, draftCount, failureCount })
}

export const executeRun = internalActionGeneric({
  args: {
    runId: v.id("externalNewsSyncRuns"),
    trigger: v.union(v.literal("cron"), v.literal("manual")),
  },
  handler: async (ctx, args) => await runSync(ctx, args.runId, args.trigger),
})

export const runScheduled = internalActionGeneric({
  args: {},
  handler: async (ctx) => {
    const runId = await ctx.runMutation(beginRunRef, { trigger: "cron" })
    await runSync(ctx, runId, "cron")
    return runId
  },
})

export const runNow = actionGeneric({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await ctx.runQuery(requireSuperAdminRef, { sessionToken: args.sessionToken })
    const runId = await ctx.runMutation(beginRunRef, { trigger: "manual", requestedBy: actor.userId })
    await ctx.scheduler.runAfter(0, executeRunRef, { runId, trigger: "manual" })
    return runId
  },
})

export const getOperations = queryGeneric({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireSuperAdminUser(ctx, args.sessionToken)
    const settings = await ctx.db
      .query("externalNewsSyncSettings")
      .withIndex("by_singletonKey", (q: any) => q.eq("singletonKey", "default"))
      .first()
    const healthRows = await ctx.db.query("externalNewsSourceHealth").collect()
    const healthBySource = new Map(healthRows.map((row: any) => [row.sourceKey, row]))
    const runs = await ctx.db.query("externalNewsSyncRuns").withIndex("by_startedAt").order("desc").take(20)
    const reviewerIds = settings ? await resolveReviewers(ctx, settings) : []
    const reviewerUsers = await Promise.all(reviewerIds.map((id) => ctx.db.get(id as Id<"users">)))
    return {
      settings: {
        enabled: settings?.enabled ?? false,
        mode: settings?.mode ?? "observation",
        reviewerMode: settings?.reviewerMode ?? "all_reviewers",
        reviewerScope: settings?.reviewerScope,
      },
      reviewerPreview: {
        count: reviewerIds.length,
        labels: reviewerUsers.filter(Boolean).map(userName),
      },
      sources: EXTERNAL_NEWS_SOURCES.map((source) => ({
        key: source.key,
        label: source.label,
        listUrl: source.listUrl,
        health: healthBySource.get(source.key) ?? null,
      })),
      runs,
    }
  },
})

export const saveSettings = mutationGeneric({
  args: {
    sessionToken: v.string(),
    enabled: v.boolean(),
    mode: v.union(v.literal("observation"), v.literal("draft")),
    reviewerMode: v.union(v.literal("scope"), v.literal("all_reviewers")),
    reviewerScope: v.optional(scopeValidator),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdminUser(ctx, args.sessionToken)
    const reviewerScope = args.reviewerMode === "scope" ? normalizeScope(args.reviewerScope || {}) : undefined
    if (args.reviewerMode === "scope") {
      await assertActorCanUseScope(ctx, admin, reviewerScope, "workflow_approver")
    }
    const proposed = { reviewerMode: args.reviewerMode as ReviewerMode, reviewerScope }
    const reviewerIds = await resolveReviewers(ctx, proposed)
    if (reviewerIds.length === 0) throw new Error("所选范围内没有已启用且具有新闻审阅权限的账号")
    const now = Date.now()
    const existing = await ctx.db
      .query("externalNewsSyncSettings")
      .withIndex("by_singletonKey", (q: any) => q.eq("singletonKey", "default"))
      .first()
    const values = {
      singletonKey: "default" as const,
      enabled: args.enabled,
      mode: args.mode,
      reviewerMode: args.reviewerMode,
      reviewerScope,
      updatedBy: admin._id,
      updatedAt: now,
    }
    if (existing) await ctx.db.patch(existing._id, values)
    else await ctx.db.insert("externalNewsSyncSettings", { ...values, createdAt: now })
    const users = await Promise.all(reviewerIds.map((id) => ctx.db.get(id as Id<"users">)))
    return { reviewerCount: reviewerIds.length, reviewerLabels: users.filter(Boolean).map(userName) }
  },
})

export const listMyReviewQueue = queryGeneric({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const statuses = ["pending", "changes_requested"] as const
    const tasks = (await Promise.all(statuses.map((status) => ctx.db
      .query("contentReviewTasks")
      .withIndex("by_user_status_createdAt", (q: any) => q.eq("userId", user._id).eq("status", status))
      .order("desc")
      .collect()))).flat()
    const rows = []
    for (const task of tasks) {
      if (task.stage !== "source_review") continue
      const submission = await ctx.db.get(task.submissionId)
      if (!submission || submission.origin !== "external_news_sync") continue
      const ledger = submission.sourceLedgerId ? await ctx.db.get(submission.sourceLedgerId) : null
      rows.push({
        taskId: String(task._id),
        submissionId: String(submission._id),
        title: submission.title,
        category: submission.payload?.newsCategory || "学院新闻",
        sourceUrl: submission.payload?.sourceUrl,
        sourcePublishedAt: submission.sourcePublishedAt,
        sourceUpdateAvailable: submission.sourceUpdateAvailable === true,
        taskStatus: task.status,
        lastFetchedAt: ledger?.lastFetchedAt,
        createdAt: submission.createdAt,
      })
    }
    return rows.sort((left, right) => right.createdAt - left.createdAt)
  },
})

async function projectReviewDraft(ctx: any, task: any, submission: any) {
  const pendingSnapshot = submission.pendingSourceSnapshotId
    ? await ctx.db.get(submission.pendingSourceSnapshotId)
    : null
  return {
    submissionId: String(submission._id),
    taskId: String(task._id),
    title: submission.title,
    content: submission.payload?.content || "",
    category: submission.payload?.newsCategory || "学院新闻",
    sourceUrl: submission.payload?.sourceUrl || "",
    coverImageUrl: submission.payload?.coverImageUrl,
    sourcePublishedAt: submission.sourcePublishedAt,
    sourceReviewStatus: submission.sourceReviewStatus,
    taskStatus: task.status,
    sourceUpdateAvailable: submission.sourceUpdateAvailable === true,
    internalUpdatedAt: submission.updatedAt,
    sourceSnapshot: pendingSnapshot ? {
      title: pendingSnapshot.title,
      content: pendingSnapshot.markdown,
      fetchedAt: pendingSnapshot.fetchedAt,
    } : undefined,
  }
}

export const getReviewDraft = queryGeneric({
  args: { sessionToken: v.string(), taskId: v.id("contentReviewTasks") },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const { task, submission } = await assignedSourceTask(ctx, args.taskId, user._id)
    return await projectReviewDraft(ctx, task, submission)
  },
})

export const saveReviewDraft = mutationGeneric({
  args: {
    sessionToken: v.string(),
    taskId: v.id("contentReviewTasks"),
    title: v.string(),
    content: v.string(),
    category: v.string(),
    coverImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const { task, submission } = await assignedSourceTask(ctx, args.taskId, user._id)
    if (task.status !== "pending" && task.status !== "changes_requested") throw new Error("该审阅任务已处理")
    const title = normalizeText(args.title, 300)
    const content = normalizeText(args.content)
    if (!title || !content) throw new Error("标题和正文不能为空")
    await ctx.db.patch(submission._id, {
      title,
      payload: {
        ...submission.payload,
        content,
        newsCategory: normalizeText(args.category, 80) || "学院新闻",
        ...(normalizeText(args.coverImageUrl, 2_000) ? { coverImageUrl: normalizeText(args.coverImageUrl, 2_000) } : {}),
      },
      updatedAt: Date.now(),
    })
    return await projectReviewDraft(ctx, task, await ctx.db.get(submission._id))
  },
})

export const adoptPendingSnapshot = mutationGeneric({
  args: { sessionToken: v.string(), taskId: v.id("contentReviewTasks") },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const { task, submission } = await assignedSourceTask(ctx, args.taskId, user._id)
    if (task.status !== "pending" && task.status !== "changes_requested") throw new Error("该审阅任务已处理")
    if (!submission.pendingSourceSnapshotId) throw new Error("没有可采用的官网更新")
    const snapshot = await ctx.db.get(submission.pendingSourceSnapshotId)
    if (!snapshot) throw new Error("官网更新快照不存在")
    const now = Date.now()
    await ctx.db.patch(submission._id, {
      title: snapshot.title,
      payload: {
        ...submission.payload,
        content: snapshot.markdown,
        sourceUrl: snapshot.sourceUrl,
        newsCategory: snapshot.category,
        ...(snapshot.coverImageUrl ? { coverImageUrl: snapshot.coverImageUrl } : {}),
      },
      sourcePublishedAt: snapshot.sourcePublishedAt,
      activeSourceSnapshotId: snapshot._id,
      pendingSourceSnapshotId: undefined,
      sourceUpdateAvailable: false,
      updatedAt: now,
    })
    if (submission.sourceLedgerId) {
      await ctx.db.patch(submission.sourceLedgerId, {
        currentHash: snapshot.contentHash,
        status: "draft_created",
        updatedAt: now,
      })
    }
    return await projectReviewDraft(ctx, task, await ctx.db.get(submission._id))
  },
})

export const decideReview = mutationGeneric({
  args: {
    sessionToken: v.string(),
    taskId: v.id("contentReviewTasks"),
    decision: v.union(v.literal("accept"), v.literal("request_changes"), v.literal("reject")),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const { task, submission } = await assignedSourceTask(ctx, args.taskId, user._id)
    const decision = args.decision as ReviewDecision
    const comment = normalizeText(args.comment, 2_000)
    if ((decision === "request_changes" || decision === "reject") && !comment) {
      throw new Error("退回修改或拒绝时必须填写意见")
    }
    const title = normalizeText(submission.title, 300)
    const content = normalizeText(submission.payload?.content)
    if (decision === "accept" && (!title || !content)) throw new Error("标题和正文不能为空")
    const tasks = await ctx.db
      .query("contentReviewTasks")
      .withIndex("by_submission", (q: any) => q.eq("submissionId", submission._id))
      .collect()
    const sourceTasks = tasks.filter((candidate: any) => candidate.stage === "source_review")
    const transition = decideExternalReview(
      sourceTasks.map((candidate: any) => ({ id: String(candidate._id), status: candidate.status })),
      String(task._id),
      decision,
    )
    const now = Date.now()
    const taskById = new Map(sourceTasks.map((candidate: any) => [String(candidate._id), candidate]))
    for (const update of transition.taskUpdates) {
      const candidate = taskById.get(update.id)
      if (!candidate) continue
      await ctx.db.patch(candidate._id, {
        status: update.status,
        ...(candidate._id === task._id && comment ? { comment } : {}),
        ...(update.status === "accepted" || update.status === "rejected" ? { decidedAt: now } : {}),
        updatedAt: now,
      })
    }
    if (decision === "request_changes") {
      await ctx.db.patch(submission._id, {
        sourceReviewStatus: "needs_changes",
        workflowStage: "source_review",
        reviewComment: comment,
        updatedAt: now,
      })
      return { status: "needs_changes" as const }
    }
    if (decision === "reject") {
      await ctx.db.patch(submission._id, {
        sourceReviewStatus: "rejected",
        workflowStage: "complete",
        status: "rejected",
        reviewedBy: user._id,
        reviewerName: userName(user),
        reviewComment: comment,
        reviewedAt: now,
        updatedAt: now,
      })
      if (submission.sourceLedgerId) {
        await ctx.db.patch(submission.sourceLedgerId, { status: "rejected", updatedAt: now })
      }
      return { status: "rejected" as const }
    }

    await ctx.db.patch(submission._id, {
      sourceReviewStatus: "accepted",
      workflowStage: "publication_approval",
      updatedAt: now,
    })
    await createPublicationApprovalTasks(ctx, await ctx.db.get(submission._id), now)
    return { status: "accepted" as const }
  },
})
