import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

import {
  advanceOAWorkflow,
  resumeOAWorkflow,
  startOAWorkflow,
} from "./lib/oaWorkflow"
import {
  createR2UploadTarget,
  getR2DownloadUrl,
  getR2ObjectKeyFromStorageId,
  r2StorageIdMatches,
} from "./lib/r2"
import {
  DEFAULT_TEACHER_RECOGNITION_CATEGORIES,
  TEACHER_RECOGNITION_FORM_SLUG,
  TEACHER_RECOGNITION_MAX_PROOF_BYTES,
  TEACHER_RECOGNITION_MAX_PROOF_FILES,
  TEACHER_RECOGNITION_PROOF_MIME_TYPES,
  TEACHER_RECOGNITION_SYSTEM_KEY,
  assertTeacherRecognitionApplicant,
  buildTeacherRecognitionAnnualStats,
  buildTeacherRecognitionSystemForm,
  canReadTeacherRecognitionProof,
  fingerprintTeacherRecognition,
  normalizeReviewerUserGroupIds,
  normalizeTeacherRecognitionCategories,
  normalizeTeacherRecognitionDraft,
  toPublicTeacherRecognition,
  validateTeacherRecognitionProof,
} from "./lib/teacherRecognition"
import { getUserBySession, requireSuperAdminBySession } from "./reviewer/lib"

const proofValidator = v.object({
  storageId: v.string(),
  fileName: v.string(),
  mimeType: v.string(),
  size: v.number(),
})

const draftValueValidator = v.object({
  reportingYear: v.number(),
  categoryId: v.id("teacherRecognitionCategories"),
  name: v.string(),
  organization: v.string(),
  startDate: v.string(),
  endDate: v.optional(v.string()),
  explanation: v.optional(v.string()),
  proof: v.array(proofValidator),
})

const categoryStatusValidator = v.union(v.literal("active"), v.literal("retired"))
const reviewStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("needs_changes"),
)
const taskStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("skipped"),
  v.literal("changes_requested"),
)
const reviewActionValidator = v.union(
  v.literal("approve"),
  v.literal("reject"),
  v.literal("request_changes"),
)

type RecognitionProof = {
  storageId: string
  fileName: string
  mimeType: string
  size: number
}

function displayName(user: any) {
  return user?.chineseName || user?.englishName || user?.username || user?.email || "教师"
}

function requireTeacherUser(user: any) {
  assertTeacherRecognitionApplicant(user)
  return user
}

async function requireTeacher(ctx: any, sessionToken?: string) {
  return requireTeacherUser(await getUserBySession(ctx, sessionToken))
}

function requiredText(value: unknown, message: string, maximum = 240) {
  const text = String(value ?? "").trim()
  if (!text) throw new Error(message)
  if (text.length > maximum) throw new Error(`${message}（最多 ${maximum} 个字符）`)
  return text
}

function optionalText(value: unknown, maximum: number) {
  const text = String(value ?? "").trim()
  if (!text) return undefined
  if (text.length > maximum) throw new Error(`内容最多 ${maximum} 个字符`)
  return text
}

function categoryDto(category: any) {
  return {
    id: category._id,
    key: category.key,
    label: category.label,
    sortOrder: category.sortOrder,
    status: category.status,
  }
}

function recognitionFields(categories: any[]) {
  return [
    { id: "reporting_year", type: "number" as const, label: "申报年度", required: true },
    {
      id: "category_id",
      type: "select" as const,
      label: "类别",
      required: true,
      options: categories
        .filter((category) => category.status === "active")
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((category) => ({ label: category.label, value: String(category._id) })),
    },
    { id: "category_label_snapshot", type: "text" as const, label: "类别快照", required: true },
    { id: "name", type: "text" as const, label: "荣誉、职务或专业服务", required: true },
    { id: "organization", type: "text" as const, label: "授予或任职机构", required: true },
    { id: "start_date", type: "date" as const, label: "开始日期", required: true },
    { id: "end_date", type: "date" as const, label: "结束日期" },
    { id: "explanation", type: "textarea" as const, label: "说明" },
    {
      id: "proof",
      type: "file" as const,
      label: "证明材料",
      required: true,
      acceptedMimeTypes: [...TEACHER_RECOGNITION_PROOF_MIME_TYPES],
      maxFiles: TEACHER_RECOGNITION_MAX_PROOF_FILES,
      maxFileSizeMB: TEACHER_RECOGNITION_MAX_PROOF_BYTES / 1024 / 1024,
    },
  ]
}

async function allCategories(ctx: any) {
  const rows = await ctx.db.query("teacherRecognitionCategories").collect()
  return rows.sort((left: any, right: any) =>
    left.sortOrder - right.sortOrder || String(left._id).localeCompare(String(right._id)),
  )
}

async function systemForm(ctx: any) {
  const byKey = await ctx.db
    .query("oaForms")
    .withIndex("by_systemKey", (index: any) => index.eq("systemKey", TEACHER_RECOGNITION_SYSTEM_KEY))
    .first()
  if (byKey) return byKey
  return await ctx.db
    .query("oaForms")
    .withIndex("by_slug", (index: any) => index.eq("slug", TEACHER_RECOGNITION_FORM_SLUG))
    .first()
}

async function settings(ctx: any) {
  return await ctx.db
    .query("teacherRecognitionSettings")
    .withIndex("by_singletonKey", (index: any) => index.eq("singletonKey", "default"))
    .first()
}

async function ensureDefaultCategories(ctx: any, actorId: any, now: number) {
  for (let index = 0; index < DEFAULT_TEACHER_RECOGNITION_CATEGORIES.length; index += 1) {
    const item = DEFAULT_TEACHER_RECOGNITION_CATEGORIES[index]
    const existing = await ctx.db
      .query("teacherRecognitionCategories")
      .withIndex("by_key", (q: any) => q.eq("key", item.key))
      .first()
    if (existing) continue
    await ctx.db.insert("teacherRecognitionCategories", {
      key: item.key,
      label: item.label,
      sortOrder: index,
      status: "active",
      createdByUserId: actorId,
      createdAt: now,
      updatedAt: now,
    })
  }
}

async function upsertSystemForm(
  ctx: any,
  actor: any,
  reviewerUserGroupIds: any[],
  now: number,
) {
  const categories = await allCategories(ctx)
  const contract = buildTeacherRecognitionSystemForm(reviewerUserGroupIds)
  const value = {
    systemKey: contract.systemKey,
    slug: contract.slug,
    title: contract.title,
    description: contract.description,
    category: contract.category,
    kind: contract.kind,
    visibility: contract.visibility,
    status: contract.status,
    allowMultipleSubmissions: contract.allowMultipleSubmissions,
    allowSubmissionEdits: contract.allowSubmissionEdits,
    targetScope: { identityTypes: ["teacher"] },
    workflowDefinition: contract.workflowDefinition,
    approvalSteps: [],
    fields: recognitionFields(categories),
    updatedBy: actor._id,
    updatedAt: now,
    publishedAt: now,
  }
  const existing = await systemForm(ctx)
  if (existing) {
    await ctx.db.patch(existing._id, value)
    return { ...existing, ...value }
  }
  const id = await ctx.db.insert("oaForms", {
    ...value,
    createdBy: actor._id,
    createdAt: now,
  })
  return await ctx.db.get(id)
}

async function refreshSystemForm(ctx: any, actor: any, now: number) {
  const configuration = await settings(ctx)
  if (!configuration?.reviewerUserGroupIds?.length) return null
  return await upsertSystemForm(ctx, actor, configuration.reviewerUserGroupIds, now)
}

async function normalizeProofForOwner(
  ctx: any,
  ownerId: any,
  proof: RecognitionProof[],
) {
  if (proof.length > TEACHER_RECOGNITION_MAX_PROOF_FILES) {
    throw new Error(`证明材料最多上传 ${TEACHER_RECOGNITION_MAX_PROOF_FILES} 个文件`)
  }
  const normalized = []
  for (const file of proof) {
    const storageId = requiredText(file.storageId, "证明材料上传凭证无效", 1000)
    const r2Key = getR2ObjectKeyFromStorageId(storageId)
    let observed = { ...file, storageId }
    if (r2Key) {
      if (!r2StorageIdMatches(storageId, {
        ownerId: String(ownerId),
        purpose: "teacher-recognition-proof",
      })) throw new Error("证明材料上传凭证无效")
    } else {
      const storageDoc = await ctx.db.system.get(storageId as any)
      if (!storageDoc) throw new Error("证明材料不存在或上传未完成")
      observed = {
        ...observed,
        mimeType: String(storageDoc.contentType || file.mimeType || "").toLowerCase(),
        size: Number(storageDoc.size),
      }
    }
    normalized.push(validateTeacherRecognitionProof(observed))
  }
  return normalized
}

async function normalizedValue(
  ctx: any,
  teacher: any,
  value: any,
  options: {
    proofRequired: boolean
    allowRetiredCategory?: boolean
    categoryLabelSnapshot?: string
  },
) {
  const category = await ctx.db.get(value.categoryId)
  if (!category || (category.status !== "active" && !options.allowRetiredCategory)) {
    throw new Error("申报类别不存在或已停用")
  }
  const proof = await normalizeProofForOwner(ctx, teacher._id, value.proof || [])
  const base = {
    reportingYear: value.reportingYear,
    categoryId: category._id,
    categoryLabel: options.categoryLabelSnapshot || category.label,
    name: value.name,
    organization: value.organization,
    startDate: value.startDate,
    endDate: value.endDate,
    explanation: value.explanation,
    proof,
  }
  if (options.proofRequired) return normalizeTeacherRecognitionDraft(base)

  // Drafts may be saved before proof is attached. All other fields still use
  // the strict domain validator by temporarily supplying a valid sentinel.
  const sentinel = {
    storageId: "r2:teacher-recognition-proof/2000/01/sentinel/sentinel-proof.pdf",
    fileName: "proof.pdf",
    mimeType: "application/pdf",
    size: 1,
  }
  const normalized = normalizeTeacherRecognitionDraft({ ...base, proof: proof.length ? proof : [sentinel] })
  return { ...normalized, proof }
}

function toAnswers(value: any) {
  return {
    reporting_year: value.reportingYear,
    category_id: String(value.categoryId),
    category_label_snapshot: value.categoryLabel,
    name: value.name,
    organization: value.organization,
    start_date: value.startDate,
    ...(value.endDate ? { end_date: value.endDate } : {}),
    ...(value.explanation ? { explanation: value.explanation } : {}),
    proof: value.proof,
  }
}

function fromAnswers(answers: any) {
  const source = answers && typeof answers === "object" ? answers : {}
  return {
    reportingYear: Number(source.reporting_year),
    categoryId: String(source.category_id || ""),
    categoryLabel: String(source.category_label_snapshot || ""),
    name: String(source.name || ""),
    organization: String(source.organization || ""),
    startDate: String(source.start_date || ""),
    ...(source.end_date ? { endDate: String(source.end_date) } : {}),
    ...(source.explanation ? { explanation: String(source.explanation) } : {}),
    proof: Array.isArray(source.proof) ? source.proof : [],
  }
}

function submissionStatus(submission: any) {
  return submission.workflowStatus || submission.reviewStatus
}

function formSnapshot(form: any) {
  return {
    title: form.title,
    description: form.description,
    fields: form.fields,
    allowSubmissionEdits: true,
  }
}

function submissionDto(submission: any) {
  const value = fromAnswers(submission.answers)
  return {
    id: submission._id,
    recordType: "submission" as const,
    ...value,
    reviewStatus: submissionStatus(submission),
    workflowVersion: submission.workflowVersion ?? 1,
    submittedAt: submission.submittedAt,
    updatedAt: submission.updatedAt,
    reviewedAt: submission.workflowCompletedAt || submission.reviewedAt,
    ...(submission.adminNote ? { latestReviewComment: submission.adminNote } : {}),
  }
}

function draftDto(draft: any) {
  return {
    id: draft._id,
    recordType: "draft" as const,
    reportingYear: draft.reportingYear,
    categoryId: draft.categoryId,
    categoryLabel: draft.categoryLabelSnapshot,
    name: draft.name,
    organization: draft.organization,
    startDate: draft.startDate,
    ...(draft.endDate ? { endDate: draft.endDate } : {}),
    ...(draft.explanation ? { explanation: draft.explanation } : {}),
    proof: draft.proof,
    version: draft.version,
    updatedAt: draft.updatedAt,
  }
}

async function reviewerTaskIds(ctx: any, submissionId: any) {
  const tasks = await ctx.db
    .query("oaApprovalTasks")
    .withIndex("by_submission_step", (index: any) => index.eq("submissionId", submissionId))
    .collect()
  return {
    tasks,
    reviewerIds: [...new Set(tasks.map((task: any) => String(task.userId)))],
  }
}

async function isCurrentReviewerGroupMember(ctx: any, actorId: any) {
  const configuration = await settings(ctx)
  if (!configuration) return false
  const memberships = await ctx.db
    .query("userGroupMemberships")
    .withIndex("by_userId", (index: any) => index.eq("userId", actorId))
    .collect()
  const configured = new Set(configuration.reviewerUserGroupIds.map(String))
  return memberships.some((membership: any) => configured.has(String(membership.groupId)))
}

async function isRecognitionSubmission(ctx: any, submission: any) {
  if (!submission) return false
  const form = await ctx.db.get(submission.formId)
  return form?.systemKey === TEACHER_RECOGNITION_SYSTEM_KEY
    || form?.slug === TEACHER_RECOGNITION_FORM_SLUG
}

async function reviewRow(ctx: any, task: any, submission: any) {
  const teacher = await ctx.db.get(submission.submitterId)
  return {
    taskId: task._id,
    taskStatus: task.status,
    workflowVersion: task.workflowVersion ?? 1,
    submission: {
      ...submissionDto(submission),
      teacherName: displayName(teacher),
      teacherEmail: teacher?.email,
    },
  }
}

export const getConfiguration = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireSuperAdminBySession(ctx, args.sessionToken)
    const [configuration, categories] = await Promise.all([settings(ctx), allCategories(ctx)])
    return {
      initialized: Boolean(configuration),
      reviewerUserGroupIds: (configuration?.reviewerUserGroupIds || []).map(String),
      systemFormId: configuration?.systemFormId,
      categories: categories.map(categoryDto),
    }
  },
})

export const setReviewerGroups = mutation({
  args: {
    sessionToken: v.string(),
    reviewerUserGroupIds: v.array(v.id("userGroups")),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdminBySession(ctx, args.sessionToken)
    const ids = normalizeReviewerUserGroupIds(args.reviewerUserGroupIds) as any[]
    const groups = await Promise.all(ids.map((id) => ctx.db.get(id)))
    if (groups.some((group) => !group)) throw new Error("审核用户组不存在")
    const now = Date.now()
    await ensureDefaultCategories(ctx, admin._id, now)
    const form = await upsertSystemForm(ctx, admin, ids, now)
    if (!form) throw new Error("教师奖励系统表单初始化失败")
    const existing = await settings(ctx)
    const value = {
      reviewerUserGroupIds: ids,
      systemFormId: form._id,
      updatedByUserId: admin._id,
      updatedAt: now,
    }
    if (existing) await ctx.db.patch(existing._id, value)
    else await ctx.db.insert("teacherRecognitionSettings", {
      singletonKey: "default",
      ...value,
      createdAt: now,
    })
    return { updated: true, systemFormId: form._id }
  },
})

export const upsertCategory = mutation({
  args: {
    sessionToken: v.string(),
    id: v.optional(v.id("teacherRecognitionCategories")),
    key: v.string(),
    label: v.string(),
    sortOrder: v.number(),
    status: v.optional(categoryStatusValidator),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdminBySession(ctx, args.sessionToken)
    const normalized = normalizeTeacherRecognitionCategories([args])[0]
    const duplicate = await ctx.db
      .query("teacherRecognitionCategories")
      .withIndex("by_key", (index: any) => index.eq("key", normalized.key))
      .first()
    const now = Date.now()
    let id = args.id
    if (id) {
      const existing = await ctx.db.get(id)
      if (!existing) throw new Error("教师奖励类别不存在")
      if (existing.key !== normalized.key) throw new Error("类别标识创建后不能修改")
      if (duplicate && String(duplicate._id) !== String(id)) throw new Error("类别标识不能重复")
      await ctx.db.patch(id, {
        label: normalized.label,
        sortOrder: normalized.sortOrder,
        status: normalized.status,
        updatedAt: now,
      })
    } else {
      if (duplicate) throw new Error("类别标识不能重复")
      id = await ctx.db.insert("teacherRecognitionCategories", {
        ...normalized,
        createdByUserId: admin._id,
        createdAt: now,
        updatedAt: now,
      })
    }
    await refreshSystemForm(ctx, admin, now)
    return id
  },
})

export const reorderCategories = mutation({
  args: {
    sessionToken: v.string(),
    categoryIds: v.array(v.id("teacherRecognitionCategories")),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdminBySession(ctx, args.sessionToken)
    const unique = new Set(args.categoryIds.map(String))
    if (unique.size !== args.categoryIds.length) throw new Error("类别排序不能包含重复项")
    const current = await allCategories(ctx)
    if (current.length !== args.categoryIds.length || current.some((row: any) => !unique.has(String(row._id)))) {
      throw new Error("类别排序必须包含全部现有类别")
    }
    const now = Date.now()
    await Promise.all(args.categoryIds.map((id, sortOrder) => ctx.db.patch(id, { sortOrder, updatedAt: now })))
    await refreshSystemForm(ctx, admin, now)
    return { updated: args.categoryIds.length }
  },
})

export const setCategoryStatus = mutation({
  args: {
    sessionToken: v.string(),
    categoryId: v.id("teacherRecognitionCategories"),
    status: categoryStatusValidator,
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdminBySession(ctx, args.sessionToken)
    const category = await ctx.db.get(args.categoryId)
    if (!category) throw new Error("教师奖励类别不存在")
    const now = Date.now()
    await ctx.db.patch(args.categoryId, { status: args.status, updatedAt: now })
    await refreshSystemForm(ctx, admin, now)
    return { updated: true }
  },
})

export const listCategories = query({
  args: { sessionToken: v.string(), includeRetired: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await getUserBySession(ctx, args.sessionToken)
    const rows = await allCategories(ctx)
    return rows.filter((row: any) => args.includeRetired || row.status === "active").map(categoryDto)
  },
})

export const saveDraft = mutation({
  args: {
    sessionToken: v.string(),
    draftId: v.optional(v.id("teacherRecognitionDrafts")),
    expectedVersion: v.optional(v.number()),
    value: draftValueValidator,
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx, args.sessionToken)
    const value = await normalizedValue(ctx, teacher, args.value, { proofRequired: false })
    const now = Date.now()
    if (args.draftId) {
      const draft = await ctx.db.get(args.draftId)
      if (!draft || String(draft.teacherId) !== String(teacher._id)) throw new Error("无权修改该草稿")
      if (draft.submittedSubmissionId) throw new Error("已提交的草稿不能修改")
      if (args.expectedVersion !== draft.version) throw new Error("草稿已在其他位置更新，请刷新后重试")
      await ctx.db.patch(draft._id, {
        teacherId: teacher._id,
        reportingYear: value.reportingYear,
        categoryId: value.categoryId,
        categoryLabelSnapshot: value.categoryLabel,
        name: value.name,
        organization: value.organization,
        startDate: value.startDate,
        endDate: value.endDate,
        explanation: value.explanation,
        proof: value.proof,
        version: draft.version + 1,
        updatedAt: now,
      })
      return { draftId: draft._id, version: draft.version + 1 }
    }
    const draftId = await ctx.db.insert("teacherRecognitionDrafts", {
      teacherId: teacher._id,
      reportingYear: value.reportingYear,
      categoryId: value.categoryId,
      categoryLabelSnapshot: value.categoryLabel,
      name: value.name,
      organization: value.organization,
      startDate: value.startDate,
      ...(value.endDate ? { endDate: value.endDate } : {}),
      ...(value.explanation ? { explanation: value.explanation } : {}),
      proof: value.proof,
      version: 1,
      createdAt: now,
      updatedAt: now,
    })
    return { draftId, version: 1 }
  },
})

export const removeDraft = mutation({
  args: {
    sessionToken: v.string(),
    draftId: v.id("teacherRecognitionDrafts"),
    expectedVersion: v.number(),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx, args.sessionToken)
    const draft = await ctx.db.get(args.draftId)
    if (!draft || String(draft.teacherId) !== String(teacher._id)) throw new Error("无权删除该草稿")
    if (draft.submittedSubmissionId) throw new Error("已提交的草稿不能删除")
    if (draft.version !== args.expectedVersion) throw new Error("草稿已在其他位置更新，请刷新后重试")
    await ctx.db.delete(draft._id)
    return { removed: true }
  },
})

export const generateProofUploadUrl = mutation({
  args: { sessionToken: v.string(), fileName: v.string(), mimeType: v.string() },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx, args.sessionToken)
    const fileName = requiredText(args.fileName, "证明材料文件名无效", 255)
    const mimeType = requiredText(args.mimeType, "不支持该证明材料类型", 200).toLowerCase()
    if (!(TEACHER_RECOGNITION_PROOF_MIME_TYPES as readonly string[]).includes(mimeType)) {
      throw new Error("不支持该证明材料类型")
    }
    const target = await createR2UploadTarget({
      purpose: "teacher-recognition-proof",
      ownerId: String(teacher._id),
      fileName,
      contentType: mimeType,
    })
    return target || await ctx.storage.generateUploadUrl()
  },
})

export const submitDraft = mutation({
  args: {
    sessionToken: v.string(),
    draftId: v.id("teacherRecognitionDrafts"),
    expectedVersion: v.number(),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx, args.sessionToken)
    const idempotencyKey = requiredText(args.idempotencyKey, "提交请求标识无效", 200)
    const draft = await ctx.db.get(args.draftId)
    if (!draft || String(draft.teacherId) !== String(teacher._id)) throw new Error("无权提交该草稿")
    const value = await normalizedValue(ctx, teacher, {
      reportingYear: draft.reportingYear,
      categoryId: draft.categoryId,
      name: draft.name,
      organization: draft.organization,
      startDate: draft.startDate,
      endDate: draft.endDate,
      explanation: draft.explanation,
      proof: draft.proof,
    }, {
      proofRequired: true,
      allowRetiredCategory: true,
      categoryLabelSnapshot: draft.categoryLabelSnapshot,
    })
    const fingerprint = await fingerprintTeacherRecognition(value)
    const replay = await ctx.db
      .query("oaFormSubmissions")
      .withIndex("by_submitter_idempotency", (index: any) =>
        index.eq("submitterId", teacher._id).eq("submissionIdempotencyKey", idempotencyKey))
      .first()
    if (replay) {
      if (replay.submissionRequestFingerprint !== fingerprint) {
        throw new Error("同一提交请求标识不能用于不同内容")
      }
      return replay._id
    }
    if (draft.submittedSubmissionId) throw new Error("该草稿已经提交")
    if (draft.version !== args.expectedVersion) throw new Error("草稿已在其他位置更新，请刷新后重试")
    const form = await systemForm(ctx)
    if (!form || form.status !== "published") throw new Error("教师奖励申报尚未开放")
    const configuration = await settings(ctx)
    if (!configuration?.reviewerUserGroupIds?.length) throw new Error("教师奖励审核组尚未配置")
    const now = Date.now()
    const submissionId = await ctx.db.insert("oaFormSubmissions", {
      formId: form._id,
      formSlug: form.slug,
      submitterId: teacher._id,
      submitterName: displayName(teacher),
      studentId: teacher.studentId || "",
      ...(teacher.email ? { submitterEmail: teacher.email } : {}),
      answers: toAnswers(value),
      formSnapshot: formSnapshot(form),
      reviewStatus: "pending",
      submissionIdempotencyKey: idempotencyKey,
      submissionRequestFingerprint: fingerprint,
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    const submission = await ctx.db.get(submissionId)
    if (!submission) throw new Error("申报创建失败")
    await startOAWorkflow(ctx, { form, submission, now })
    await ctx.db.patch(draft._id, {
      submittedSubmissionId: submissionId,
      version: draft.version + 1,
      updatedAt: now,
    })
    return submissionId
  },
})

export const updateNeedsChanges = mutation({
  args: {
    sessionToken: v.string(),
    submissionId: v.id("oaFormSubmissions"),
    expectedVersion: v.number(),
    value: draftValueValidator,
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx, args.sessionToken)
    const submission = await ctx.db.get(args.submissionId)
    if (!submission || String(submission.submitterId) !== String(teacher._id)) throw new Error("无权修改该申报")
    if (!await isRecognitionSubmission(ctx, submission)) throw new Error("教师奖励申报不存在")
    if (submission.workflowStatus !== "needs_changes") throw new Error("该申报当前不需要补充材料")
    if ((submission.workflowVersion ?? 1) !== args.expectedVersion) throw new Error("OA_WORKFLOW_VERSION_CONFLICT")
    const priorValue = fromAnswers(submission.answers)
    const categoryWasUnchanged = priorValue.categoryId === String(args.value.categoryId)
    const value = await normalizedValue(ctx, teacher, args.value, {
      proofRequired: true,
      allowRetiredCategory: categoryWasUnchanged,
      ...(categoryWasUnchanged ? { categoryLabelSnapshot: priorValue.categoryLabel } : {}),
    })
    const form = await ctx.db.get(submission.formId)
    if (!form) throw new Error("教师奖励系统表单不存在")
    const now = Date.now()
    await ctx.db.patch(submission._id, {
      answers: toAnswers(value),
      submissionRequestFingerprint: await fingerprintTeacherRecognition(value),
      reviewStatus: "pending",
      updatedAt: now,
    })
    const linkedDraft = await ctx.db
      .query("teacherRecognitionDrafts")
      .withIndex("by_submittedSubmissionId", (index: any) => index.eq("submittedSubmissionId", submission._id))
      .first()
    if (linkedDraft) {
      await ctx.db.patch(linkedDraft._id, {
        reportingYear: value.reportingYear,
        categoryId: value.categoryId,
        categoryLabelSnapshot: value.categoryLabel,
        name: value.name,
        organization: value.organization,
        startDate: value.startDate,
        endDate: value.endDate,
        explanation: value.explanation,
        proof: value.proof,
        version: linkedDraft.version + 1,
        updatedAt: now,
      })
    }
    await resumeOAWorkflow(ctx, { form, submission, actorUserId: teacher._id, now })
    return { updated: true, workflowVersion: args.expectedVersion + 1 }
  },
})

export const listMine = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx, args.sessionToken)
    const [drafts, form] = await Promise.all([
      ctx.db.query("teacherRecognitionDrafts")
        .withIndex("by_teacher_updatedAt", (index: any) => index.eq("teacherId", teacher._id))
        .order("desc").collect(),
      systemForm(ctx),
    ])
    const submissions = form
      ? await ctx.db.query("oaFormSubmissions")
        .withIndex("by_form_submitter_createdAt", (index: any) =>
          index.eq("formId", form._id).eq("submitterId", teacher._id))
        .order("desc").collect()
      : []
    const submittedDraftIds = new Set(
      drafts.filter((draft: any) => draft.submittedSubmissionId).map((draft: any) => String(draft._id)),
    )
    const rows = [
      ...drafts.filter((draft: any) => !submittedDraftIds.has(String(draft._id))).map(draftDto),
      ...submissions.map(submissionDto),
    ]
    return rows.sort((left: any, right: any) => right.updatedAt - left.updatedAt)
  },
})

export const getMine = query({
  args: {
    sessionToken: v.string(),
    draftId: v.optional(v.id("teacherRecognitionDrafts")),
    submissionId: v.optional(v.id("oaFormSubmissions")),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx, args.sessionToken)
    if (Boolean(args.draftId) === Boolean(args.submissionId)) throw new Error("请选择一个申报记录")
    if (args.draftId) {
      const draft = await ctx.db.get(args.draftId)
      return draft && String(draft.teacherId) === String(teacher._id) ? draftDto(draft) : null
    }
    const submission = await ctx.db.get(args.submissionId!)
    if (!submission || String(submission.submitterId) !== String(teacher._id)) return null
    if (!await isRecognitionSubmission(ctx, submission)) return null
    const events = await ctx.db.query("oaApprovalEvents")
      .withIndex("by_submission_createdAt", (index: any) => index.eq("submissionId", submission._id))
      .collect()
    return {
      ...submissionDto(submission),
      timeline: events.map((event: any) => ({
        action: event.action,
        ...(event.comment ? { comment: event.comment } : {}),
        createdAt: event.createdAt,
      })),
    }
  },
})

export const getAccess = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const tasks = await ctx.db.query("oaApprovalTasks")
      .withIndex("by_user_status_createdAt", (index: any) => index.eq("userId", actor._id))
      .collect()
    let hasRecognitionTask = false
    for (const task of tasks) {
      const submission = await ctx.db.get(task.submissionId)
      if (await isRecognitionSubmission(ctx, submission)) {
        hasRecognitionTask = true
        break
      }
    }
    return {
      isTeacher: actor.identityType === "teacher",
      canReview: hasRecognitionTask || await isCurrentReviewerGroupMember(ctx, actor._id),
      canManage: actor.role === "super_admin",
    }
  },
})

export const listReviewQueue = query({
  args: { sessionToken: v.string(), status: v.optional(taskStatusValidator) },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const tasks = args.status
      ? await ctx.db.query("oaApprovalTasks")
        .withIndex("by_user_status_createdAt", (index: any) =>
          index.eq("userId", actor._id).eq("status", args.status!))
        .order("desc").collect()
      : await ctx.db.query("oaApprovalTasks")
        .withIndex("by_user_status_createdAt", (index: any) => index.eq("userId", actor._id))
        .order("desc").collect()
    const rows = []
    for (const task of tasks) {
      const submission = await ctx.db.get(task.submissionId)
      if (!submission || !await isRecognitionSubmission(ctx, submission)) continue
      rows.push(await reviewRow(ctx, task, submission))
    }
    return rows
  },
})

export const getReviewDetail = query({
  args: { sessionToken: v.string(), taskId: v.id("oaApprovalTasks") },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const task = await ctx.db.get(args.taskId)
    if (!task || String(task.userId) !== String(actor._id)) return null
    const submission = await ctx.db.get(task.submissionId)
    if (!submission || !await isRecognitionSubmission(ctx, submission)) return null
    const { tasks } = await reviewerTaskIds(ctx, submission._id)
    const events = await ctx.db.query("oaApprovalEvents")
      .withIndex("by_submission_createdAt", (index: any) => index.eq("submissionId", submission._id))
      .collect()
    return {
      ...await reviewRow(ctx, task, submission),
      branches: tasks
        .filter((branch: any) => (branch.workflowVersion ?? 1) === (task.workflowVersion ?? 1))
        .map((branch: any) => ({
          taskId: branch._id,
          status: branch.status,
          actedAt: branch.actedAt,
          ...(branch.comment ? { comment: branch.comment } : {}),
        })),
      timeline: events.map((event: any) => ({
        action: event.action,
        ...(event.comment ? { comment: event.comment } : {}),
        createdAt: event.createdAt,
      })),
    }
  },
})

export const actOnReviewTask = mutation({
  args: {
    sessionToken: v.string(),
    taskId: v.id("oaApprovalTasks"),
    action: reviewActionValidator,
    comment: v.optional(v.string()),
    expectedVersion: v.number(),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const task = await ctx.db.get(args.taskId)
    if (!task || String(task.userId) !== String(actor._id)) throw new Error("无权处理该教师奖励审核任务")
    const submission = await ctx.db.get(task.submissionId)
    if (!submission || !await isRecognitionSubmission(ctx, submission)) throw new Error("教师奖励审核任务不存在")
    if (String(submission.submitterId) === String(actor._id)) throw new Error("申请人不能审批自己的申报")
    const form = await ctx.db.get(submission.formId)
    if (!form) throw new Error("教师奖励系统表单不存在")
    const idempotencyKey = requiredText(args.idempotencyKey, "审批请求标识无效", 200)
    const comment = optionalText(args.comment, 2000)
    if ((args.action === "reject" || args.action === "request_changes") && !comment) {
      throw new Error(args.action === "reject" ? "请填写驳回原因" : "请填写需要补充的材料")
    }
    const actionRequestFingerprint = JSON.stringify({
      action: args.action,
      comment: comment || "",
      expectedVersion: args.expectedVersion,
    })
    if (task.actionIdempotencyKey === idempotencyKey) {
      if (task.actionRequestFingerprint !== actionRequestFingerprint) {
        return { updated: false, reason: "idempotency_conflict" }
      }
      return task.actionResult || { updated: false, reason: "already_handled" }
    }
    if (task.status !== "pending") return { updated: false, reason: "task_not_pending" }
    const currentVersion = submission.workflowVersion ?? 1
    if (args.expectedVersion !== currentVersion || (task.workflowVersion ?? 1) !== currentVersion) {
      return { updated: false, reason: "stale_version", currentVersion }
    }
    const workflowResult = await advanceOAWorkflow(ctx, {
      form,
      submission,
      task,
      actor,
      action: args.action,
      comment,
      expectedVersion: args.expectedVersion,
      now: Date.now(),
    })
    const result = workflowResult.advanced === false
      ? { updated: false, ...workflowResult }
      : { updated: true, ...workflowResult }
    await ctx.db.patch(task._id, {
      actionIdempotencyKey: idempotencyKey,
      actionRequestFingerprint,
      actionResult: result,
    })
    return result
  },
})

export const listForManagement = query({
  args: {
    sessionToken: v.string(),
    year: v.optional(v.number()),
    teacherQuery: v.optional(v.string()),
    categoryId: v.optional(v.id("teacherRecognitionCategories")),
    status: v.optional(reviewStatusValidator),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const form = await systemForm(ctx)
    if (!form) return { rows: [], annualStats: buildTeacherRecognitionAnnualStats([]) }
    const allRows = await ctx.db.query("oaFormSubmissions")
      .withIndex("by_form_createdAt", (index: any) => index.eq("formId", form._id))
      .order("desc").collect()
    const allowedSubmissionIds = new Set<string>()
    if (actor.role !== "super_admin") {
      const tasks = await ctx.db.query("oaApprovalTasks")
        .withIndex("by_user_status_createdAt", (index: any) => index.eq("userId", actor._id))
        .collect()
      tasks.forEach((task: any) => allowedSubmissionIds.add(String(task.submissionId)))
    }
    const teacherQuery = String(args.teacherQuery || "").trim().toLowerCase()
    const rows = []
    for (const submission of allRows) {
      if (actor.role !== "super_admin" && !allowedSubmissionIds.has(String(submission._id))) continue
      const value = fromAnswers(submission.answers)
      const teacher = await ctx.db.get(submission.submitterId)
      const teacherName = displayName(teacher)
      const status = submissionStatus(submission)
      if (args.year !== undefined && value.reportingYear !== args.year) continue
      if (args.categoryId && value.categoryId !== String(args.categoryId)) continue
      if (args.status && status !== args.status) continue
      if (teacherQuery && ![teacherName, teacher?.email, teacher?.studentId]
        .some((field) => String(field || "").toLowerCase().includes(teacherQuery))) continue
      rows.push({
        ...submissionDto(submission),
        teacherName,
        teacherEmail: teacher?.email,
      })
    }
    return { rows, annualStats: buildTeacherRecognitionAnnualStats(rows) }
  },
})

export const getProofUrl = query({
  args: {
    sessionToken: v.string(),
    submissionId: v.id("oaFormSubmissions"),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const submission = await ctx.db.get(args.submissionId)
    if (!submission || !await isRecognitionSubmission(ctx, submission)) throw new Error("教师奖励申报不存在")
    const { reviewerIds } = await reviewerTaskIds(ctx, submission._id)
    if (!canReadTeacherRecognitionProof({
      actorId: actor._id,
      actorRole: actor.role,
      submitterId: submission.submitterId,
      reviewerIds,
    })) throw new Error("无权查看证明材料")
    const value = fromAnswers(submission.answers)
    if (!value.proof.some((file: any) => String(file.storageId) === args.storageId)) {
      throw new Error("证明材料不属于该申报")
    }
    const r2Url = await getR2DownloadUrl(args.storageId)
    if (r2Url) return r2Url
    return await ctx.storage.getUrl(args.storageId as any)
  },
})

export const listPublicForPerson = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const slug = requiredText(args.slug, "教师主页不存在", 160).toLowerCase()
    const person = await ctx.db.query("institutePeople")
      .withIndex("by_slug", (index: any) => index.eq("slug", slug))
      .first()
    if (
      !person
      || person.kind !== "teacher"
      || person.visibility !== "public"
      || !person.accountUserId
    ) return []
    const form = await systemForm(ctx)
    if (!form) return []
    const rows = await ctx.db.query("oaFormSubmissions")
      .withIndex("by_form_submitter_createdAt", (index: any) =>
        index.eq("formId", form._id).eq("submitterId", person.accountUserId))
      .collect()
    return rows
      .filter((row: any) => row.reviewStatus === "approved")
      .map((row: any) => toPublicTeacherRecognition(fromAnswers(row.answers)))
      .sort((left: any, right: any) =>
        right.reportingYear - left.reportingYear
        || right.startDate.localeCompare(left.startDate)
        || left.name.localeCompare(right.name, "zh-CN"),
      )
  },
})
