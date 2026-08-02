import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { createR2UploadTarget, getR2DownloadUrl, getR2ObjectKeyFromStorageId, r2StorageIdMatches } from "./lib/r2"
import { notifyOAWorkflowRecipients, resumeOAWorkflow, startOAWorkflow } from "./lib/oaWorkflow"
import { getUserBySession, requireAcademicExchangeReviewerAccess } from "./reviewer/lib"

const AUTHOR_META_PATTERN = /^(.*?)\s*\[tc-author:([^\]]+)\]\s*$/
const MAX_PAPER_PDF_BYTES = 30 * 1024 * 1024
const PAPER_PDF_MIME_TYPES = new Set(["application/pdf", "application/octet-stream"])
const PROJECT_TIME_PATTERN =
  /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})\s*(?:-|–|—|~|至)\s*(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/
const ACADEMIC_EXCHANGE_OA_SLUG = "academic-exchange-reimbursement"

async function requireSuperAdmin(ctx: any, sessionToken?: string) {
  const user = await getUserBySession(ctx, sessionToken)
  if (user.role !== "super_admin") {
    throw new Error("只有超级管理员可以管理学术交流支持申请")
  }
  return user
}

function normalizeOptionalString(value?: string) {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function normalizeProjectTime(value: string) {
  const match = value.trim().match(PROJECT_TIME_PATTERN)
  if (!match) throw new Error("项目时间请按“YYYY-MM-DD 至 YYYY-MM-DD”填写")
  const parts = match.slice(1).map(Number)
  const [startYear, startMonth, startDay, endYear, endMonth, endDay] = parts
  const toTimestamp = (year: number, month: number, day: number) => {
    const timestamp = Date.UTC(year, month - 1, day)
    const date = new Date(timestamp)
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
      ? timestamp
      : null
  }
  const start = toTimestamp(startYear, startMonth, startDay)
  const end = toTimestamp(endYear, endMonth, endDay)
  if (start === null || end === null) throw new Error("项目时间包含无效日期")
  if (end < start) throw new Error("项目结束日期不能早于开始日期")
  const format = (year: number, month: number, day: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  return `${format(startYear, startMonth, startDay)} 至 ${format(endYear, endMonth, endDay)}`
}

function isSafeExternalPaperPdfUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname.toLowerCase() === "arxiv.org"
  } catch {
    return false
  }
}

async function normalizeUploadedPaperPdfMetadata(ctx: any, args: {
  paperPdfStorageId?: unknown
  paperPdfFileName?: string
  paperPdfMimeType?: string
  paperPdfSize?: number
}, ownerId: string) {
  if (!args.paperPdfStorageId) return null

  const fileName = normalizeOptionalString(args.paperPdfFileName)
  let mimeType = normalizeOptionalString(args.paperPdfMimeType)?.toLowerCase()
  let size = args.paperPdfSize

  if (!fileName || !mimeType || !Number.isFinite(size)) {
    throw new Error("请完整上传论文 PDF")
  }

  const r2Key = getR2ObjectKeyFromStorageId(args.paperPdfStorageId)
  if (r2Key) {
    if (!r2StorageIdMatches(args.paperPdfStorageId, { ownerId, purpose: "academic-exchange-paper" })) {
      throw new Error("论文 PDF 上传凭证无效")
    }
  } else {
    const storageDoc = await ctx.db.system.get(args.paperPdfStorageId as any)
    if (!storageDoc) throw new Error("论文 PDF 文件不存在或上传未完成")
    size = Number((storageDoc as any).size ?? size)
    mimeType = normalizeOptionalString((storageDoc as any).contentType)?.toLowerCase() || mimeType
  }

  if (!fileName.toLowerCase().endsWith(".pdf") || !PAPER_PDF_MIME_TYPES.has(mimeType)) {
    throw new Error("论文 PDF 上传仅支持 PDF 文件")
  }

  if (size! <= 0 || size! > MAX_PAPER_PDF_BYTES) {
    throw new Error("论文 PDF 文件不能超过 30MB")
  }

  return {
    fileName,
    mimeType,
    size: size!,
  }
}

function parseAuthor(value: string) {
  const match = value.match(AUTHOR_META_PATTERN)
  if (!match) {
    return { name: value.trim(), coFirst: false, userId: undefined as string | undefined }
  }

  try {
    const meta = JSON.parse(decodeURIComponent(match[2]))
    return {
      name: match[1].trim(),
      coFirst: Boolean(meta?.coFirst),
      userId: meta?.userId ? String(meta.userId) : undefined,
    }
  } catch {
    return { name: match[1].trim(), coFirst: false, userId: undefined as string | undefined }
  }
}

function toChineseOrdinal(value: number) {
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"]
  if (value <= 10) return value === 10 ? "十" : digits[value]
  if (value < 20) return `十${digits[value - 10]}`
  if (value < 100) {
    const ten = Math.floor(value / 10)
    const one = value % 10
    return `${digits[ten]}十${one ? digits[one] : ""}`
  }
  return String(value)
}

function buildAuthorIndexLabel(authors: string[], userId: string) {
  const parsedAuthors = authors.map(parseAuthor)
  const applicantIndex = parsedAuthors.findIndex((author) => author.userId && String(author.userId) === String(userId))
  if (applicantIndex < 0) return null

  const coFirstCount = parsedAuthors.filter((author) => author.coFirst).length
  const applicant = parsedAuthors[applicantIndex]

  if (coFirstCount > 1) {
    if (applicant.coFirst) {
      const coFirstIndex = parsedAuthors.slice(0, applicantIndex + 1).filter((author) => author.coFirst).length
      return {
        name: applicant.name,
        label: `共一第${toChineseOrdinal(coFirstIndex)}`,
      }
    }

    const nonCoFirstBefore = parsedAuthors.slice(0, applicantIndex).filter((author) => !author.coFirst).length
    return {
      name: applicant.name,
      label: `第${toChineseOrdinal(nonCoFirstBefore + 2)}作者`,
    }
  }

  return {
    name: applicant.name,
    label: `第${toChineseOrdinal(applicantIndex + 1)}作者`,
  }
}

const expenseItemValidator = v.object({
  item: v.string(),
  amount: v.number(),
  note: v.optional(v.string()),
})

const reviewActionValidator = v.union(
  v.literal("start_review"),
  v.literal("request_changes"),
  v.literal("approve"),
  v.literal("reject"),
)

function normalizeExpenseItems(items: Array<{ item: string; amount: number; note?: string }>) {
  return items
    .map((item) => ({
      item: item.item.trim(),
      amount: item.amount,
      note: normalizeOptionalString(item.note),
    }))
    .filter((item) => item.item && Number.isFinite(item.amount) && item.amount > 0)
}

function normalizePositiveInteger(value?: number) {
  if (value === undefined) return undefined
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("页数必须是正整数")
  }
  return value
}

type AcademicExchangePdfBrand = "tong_class" | "institute"
type AcademicExchangeOwnerIdentity = "undergrad" | "graduate" | "teacher" | "other"

function isAcademicExchangeOwnerIdentity(value: unknown): value is AcademicExchangeOwnerIdentity {
  return value === "undergrad" || value === "graduate" || value === "teacher" || value === "other"
}

async function resolveAcademicExchangeOwnerIdentity(ctx: any, user: any): Promise<AcademicExchangeOwnerIdentity> {
  const person = await ctx.db
    .query("institutePeople")
    .withIndex("by_accountUserId", (q: any) => q.eq("accountUserId", user._id))
    .first()

  if (person) {
    const identityType = (person as { identityType?: unknown }).identityType
    if (isAcademicExchangeOwnerIdentity(identityType)) return identityType
    return person.kind === "teacher" ? "teacher" : "graduate"
  }

  if (isAcademicExchangeOwnerIdentity(user.identityType)) {
    return user.identityType
  }

  // Legacy accounts predate identityType. Explicit Tong Class membership is
  // authoritative; a numeric cohort is the historical undergraduate marker.
  return user.isClassMember === true || typeof user.cohort === "number"
    ? "undergrad"
    : "other"
}

async function resolveAcademicExchangePdfBrand(ctx: any, user: any): Promise<AcademicExchangePdfBrand> {
  const identityType = await resolveAcademicExchangeOwnerIdentity(ctx, user)
  return identityType === "undergrad" ? "tong_class" : "institute"
}

async function currentAcademicExchangeOAReviewerIds(ctx: any) {
  const permissions = await ctx.db
    .query("contentPermissions")
    .withIndex("by_category_user", (q: any) => q.eq("category", "reimbursement"))
    .collect()
  const ids = new Set(
    permissions
      .filter((permission: any) => permission.canManage === true)
      .map((permission: any) => String(permission.userId)),
  )
  const users = await ctx.db.query("users").collect()
  const activeIds = new Set(
    users
      .filter((user: any) => user.accountStatus !== "disabled")
      .map((user: any) => String(user._id)),
  )
  return [...ids]
    .filter((id) => activeIds.has(String(id)))
    .sort()
}

async function academicExchangeOAForm(ctx: any, now: number) {
  const reviewerIds = await currentAcademicExchangeOAReviewerIds(ctx)
  if (reviewerIds.length === 0) throw new Error("当前没有可用的报销审核人")
  const workflowDefinition = {
    version: 2 as const,
    nodes: [
      { id: "create_academic_exchange", type: "create_form" as const, title: "提交学术交流报销" },
      {
        id: "review_academic_exchange",
        type: "batch_approval" as const,
        title: "学术交流报销审核",
        scope: { userIds: reviewerIds as any[] },
        completion: "any" as const,
      },
    ],
  }
  const fields = [
    { id: "applicantName", type: "text" as const, label: "申请人", required: true },
    { id: "studentId", type: "text" as const, label: "学号 / 工号", required: true },
    { id: "email", type: "text" as const, label: "邮箱", required: true },
    { id: "projectName", type: "text" as const, label: "项目名称", required: true },
    { id: "projectCategory", type: "text" as const, label: "项目类别", required: true },
    { id: "exchangeLocation", type: "text" as const, label: "交流地点", required: true },
    { id: "projectTime", type: "text" as const, label: "项目时间", required: true },
    { id: "otherFunding", type: "text" as const, label: "其他资助", required: true },
    { id: "projectPlan", type: "textarea" as const, label: "项目计划", required: true },
    {
      id: "expenseItems",
      type: "table" as const,
      label: "申请金额明细",
      required: true,
      columns: [
        { id: "item", label: "项目", type: "text" as const },
        { id: "amount", label: "金额", type: "number" as const },
        { id: "note", label: "备注", type: "text" as const },
      ],
    },
    { id: "totalAmount", type: "number" as const, label: "申请金额", required: true },
    { id: "paperTitle", type: "text" as const, label: "论文题目" },
    { id: "paperPdfUrl", type: "text" as const, label: "论文 PDF 链接" },
    { id: "paperPdf", type: "file" as const, label: "论文 PDF 文件" },
  ]
  let form = await ctx.db
    .query("oaForms")
    .withIndex("by_slug", (q: any) => q.eq("slug", ACADEMIC_EXCHANGE_OA_SLUG))
    .first()
  if (!form) {
    const formId = await ctx.db.insert("oaForms", {
      slug: ACADEMIC_EXCHANGE_OA_SLUG,
      title: "学术交流报销",
      description: "固定学术交流支持申请的统一 OA 审批桥。",
      category: "报销",
      kind: "reimbursement",
      visibility: "admins",
      status: "archived",
      allowMultipleSubmissions: true,
      allowSubmissionEdits: true,
      fields,
      resultFields: [],
      resultsVisible: false,
      approvalSteps: [],
      workflowDefinition,
      createdBy: reviewerIds[0] as any,
      updatedBy: reviewerIds[0] as any,
      createdAt: now,
      updatedAt: now,
    })
    form = await ctx.db.get(formId)
  }
  if (!form || form.kind !== "reimbursement") {
    throw new Error("学术交流报销 OA 桥配置无效")
  }
  return { ...form, workflowDefinition, approvalSteps: [], fields }
}

async function createAcademicExchangeOABridge(ctx: any, input: {
  application: any
  applicant: any
  now: number
}) {
  const form = await academicExchangeOAForm(ctx, input.now)
  const idempotencyKey = `academic-exchange:${String(input.application._id)}`
  const existing = await ctx.db
    .query("oaFormSubmissions")
    .withIndex("by_submitter_idempotency", (q: any) => (
      q.eq("submitterId", input.applicant._id).eq("submissionIdempotencyKey", idempotencyKey)
    ))
    .first()
  if (existing) return existing._id
  const answers = {
    applicantName: input.application.applicantName,
    studentId: input.application.studentId,
    email: input.application.email,
    projectName: input.application.projectName,
    projectCategory: input.application.projectCategory,
    exchangeLocation: input.application.exchangeLocation,
    projectTime: input.application.projectTime,
    otherFunding: input.application.otherFunding,
    projectPlan: input.application.projectPlan,
    expenseItems: input.application.expenseItems,
    totalAmount: input.application.totalAmount,
    paperTitle: input.application.paperTitle,
    paperPdfUrl: input.application.paperPdfUrl,
    paperPdf: input.application.paperPdfStorageId
      ? [{
        storageId: String(input.application.paperPdfStorageId),
        fileName: input.application.paperPdfFileName || "论文.pdf",
        mimeType: input.application.paperPdfMimeType || "application/pdf",
        size: input.application.paperPdfSize || 0,
      }]
      : undefined,
  }
  const submissionId = await ctx.db.insert("oaFormSubmissions", {
    formId: form._id,
    formSlug: form.slug,
    submitterId: input.applicant._id,
    submitterName: input.applicant.chineseName
      || input.applicant.englishName
      || input.applicant.username
      || input.applicant.email,
    studentId: input.applicant.studentId,
    submitterEmail: input.applicant.email,
    answers,
    formSnapshot: {
      title: form.title,
      description: form.description,
      fields: form.fields,
      allowSubmissionEdits: true,
    },
    reviewStatus: "pending",
    submissionIdempotencyKey: idempotencyKey,
    submissionRequestFingerprint: JSON.stringify(answers),
    submittedAt: input.now,
    createdAt: input.now,
    updatedAt: input.now,
  })
  const submission = await ctx.db.get(submissionId)
  if (!submission) throw new Error("学术交流报销 OA 提交创建失败")
  await startOAWorkflow(ctx, { form, submission, now: input.now })
  return submissionId
}

async function resumeAcademicExchangeOABridge(ctx: any, application: any, user: any, now: number) {
  if (!application.oaSubmissionId) return
  const submission = await ctx.db.get(application.oaSubmissionId)
  const form = submission ? await ctx.db.get(submission.formId) : null
  if (!submission || !form) throw new Error("学术交流报销 OA 记录不存在")
  await ctx.db.patch(submission._id, {
    answers: {
      ...submission.answers,
      applicantName: application.applicantName,
      email: application.email,
      projectName: application.projectName,
      projectCategory: application.projectCategory,
      exchangeLocation: application.exchangeLocation,
      projectTime: application.projectTime,
      otherFunding: application.otherFunding,
      projectPlan: application.projectPlan,
      expenseItems: application.expenseItems,
      totalAmount: application.totalAmount,
    },
    updatedAt: now,
  })
  await resumeOAWorkflow(ctx, {
    form,
    submission,
    actorUserId: user._id,
    now,
  })
}

async function cancelAcademicExchangeOABridge(ctx: any, application: any, now: number) {
  if (!application.oaSubmissionId) return
  const submission = await ctx.db.get(application.oaSubmissionId)
  if (
    !submission
    || (submission.workflowStatus !== "pending" && submission.workflowStatus !== "needs_changes")
  ) return
  const tasks = await ctx.db
    .query("oaApprovalTasks")
    .withIndex("by_submission_step", (q: any) => (
      q.eq("submissionId", submission._id).eq("stepIndex", submission.currentApprovalStep || 1)
    ))
    .collect()
  await Promise.all(tasks
    .filter((task: any) => task.status === "pending")
    .map((task: any) => ctx.db.patch(task._id, {
      status: "skipped",
      actedAt: now,
      updatedAt: now,
    })))
  await ctx.db.patch(submission._id, {
    reviewStatus: "rejected",
    workflowStatus: "rejected",
    workflowCompletedAt: now,
    updatedAt: now,
  })
  await ctx.db.insert("oaApprovalEvents", {
    submissionId: submission._id,
    formId: submission.formId,
    stepIndex: submission.currentWorkflowNodeIndex ?? submission.currentApprovalStep,
    workflowVersion: submission.workflowVersion ?? 1,
    action: "workflow_withdrawn",
    actorUserId: application.userId,
    comment: "申请人已撤回申请",
    createdAt: now,
  })
  await notifyOAWorkflowRecipients(ctx, {
    recipientUserIds: tasks.map((task: any) => task.userId),
    submissionId: submission._id,
    title: "OA 申请已撤回",
    body: "学术交流报销申请已由申请人撤回，无需继续处理。",
    createdAt: now,
    naturalKey: `oa:${String(submission._id)}:withdrawn`,
  })
}

async function projectAcademicExchangeApplication(ctx: any, application: any) {
  if (application.pdfBrand === "tong_class" || application.pdfBrand === "institute") {
    return {
      ...application,
      pdfBrand: application.pdfBrand,
    }
  }

  const owner = await ctx.db.get(application.userId)
  const identityType = owner
    ? await resolveAcademicExchangeOwnerIdentity(ctx, owner)
    : "other"
  return {
    ...application,
    ownerIdentity: { identityType },
  }
}

const adminApplicationPatchValidator = {
  applicantName: v.string(),
  studentId: v.string(),
  email: v.string(),
  gender: v.optional(v.string()),
  phone: v.optional(v.string()),
  projectCategory: v.string(),
  projectName: v.string(),
  exchangeLocation: v.string(),
  projectTime: v.string(),
  otherFunding: v.string(),
  projectPlan: v.string(),
  expenseItems: v.array(expenseItemValidator),
  applicationDate: v.string(),
  paperTitle: v.optional(v.string()),
  paperAuthors: v.optional(v.array(v.string())),
  applicantAuthorName: v.optional(v.string()),
  applicantAuthorIndexLabel: v.optional(v.string()),
  applicantAffiliation: v.optional(v.string()),
  totalPages: v.optional(v.number()),
  bodyPages: v.optional(v.number()),
  paperPdfUrl: v.optional(v.string()),
  paperPdfSource: v.optional(v.union(v.literal("url"), v.literal("upload"))),
  paperPdfFileName: v.optional(v.string()),
  paperPdfMimeType: v.optional(v.string()),
  paperPdfSize: v.optional(v.number()),
}

export const getStudentFormProfile = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    return await ctx.db
      .query("studentFormProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first()
  },
})

export const upsertStudentFormProfile = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    gender: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const now = Date.now()
    const patch = {
      gender: normalizeOptionalString(args.gender),
      phone: normalizeOptionalString(args.phone),
      updatedAt: now,
    }

    const existing = await ctx.db
      .query("studentFormProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, patch)
      return existing._id
    }

    return await ctx.db.insert("studentFormProfiles", {
      userId: user._id,
      ...patch,
      createdAt: now,
    })
  },
})

export const generateUploadUrl = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const r2Target = await createR2UploadTarget({
      purpose: "academic-exchange-paper",
      ownerId: String(user._id),
      fileName: args.fileName,
      contentType: args.mimeType,
    })
    if (r2Target) return r2Target
    return await ctx.storage.generateUploadUrl()
  },
})

export const validateCleanupUpload = query({
  args: {
    sessionToken: v.optional(v.string()),
    storageId: v.union(v.id("_storage"), v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const r2Key = getR2ObjectKeyFromStorageId(args.storageId)
    if (r2Key) {
      return r2StorageIdMatches(args.storageId, {
        ownerId: String(user._id),
        purpose: "academic-exchange-paper",
      })
    }
    // Legacy Convex storage IDs do not encode an owner, so accepting them here
    // would let one account delete another account's unbound upload. R2 IDs
    // carry a signed owner segment and are the only safe cleanup target.
    return false
  },
})

export const listApplications = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    return await ctx.db
      .query("academicExchangeSupportApplications")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect()
  },
})

export const getApplication = query({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("academicExchangeSupportApplications"),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const application = await ctx.db.get(args.id)
    if (!application || String(application.userId) !== String(user._id)) {
      return null
    }
    return application
  },
})

export const listApplicationsForSuperAdmin = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.sessionToken)
    return await ctx.db
      .query("academicExchangeSupportApplications")
      .withIndex("by_createdAt")
      .order("desc")
      .collect()
  },
})

export const getApplicationForSuperAdmin = query({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("academicExchangeSupportApplications"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.sessionToken)
    return await ctx.db.get(args.id)
  },
})

export const listApplicationsForReviewer = query({
  args: {
    reviewerSessionToken: v.optional(v.string()),
    mainSessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAcademicExchangeReviewerAccess(ctx, {
      reviewerSessionToken: args.reviewerSessionToken,
      mainSessionToken: args.mainSessionToken,
    })
    const applications = await ctx.db
      .query("academicExchangeSupportApplications")
      .withIndex("by_createdAt")
      .order("desc")
      .collect()
    return await Promise.all(
      applications
        .filter((application) => !application.oaSubmissionId)
        .map((application) => projectAcademicExchangeApplication(ctx, application)),
    )
  },
})

export const getApplicationForReviewer = query({
  args: {
    reviewerSessionToken: v.optional(v.string()),
    mainSessionToken: v.optional(v.string()),
    id: v.id("academicExchangeSupportApplications"),
  },
  handler: async (ctx, args) => {
    await requireAcademicExchangeReviewerAccess(ctx, {
      reviewerSessionToken: args.reviewerSessionToken,
      mainSessionToken: args.mainSessionToken,
    })
    const application = await ctx.db.get(args.id)
    return application && !application.oaSubmissionId
      ? await projectAcademicExchangeApplication(ctx, application)
      : null
  },
})

export const getPaperPdfUrl = query({
  args: {
    sessionToken: v.optional(v.string()),
    reviewerSessionToken: v.optional(v.string()),
    mainSessionToken: v.optional(v.string()),
    id: v.id("academicExchangeSupportApplications"),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.id)
    if (!application || !application.paperPdfStorageId) {
      return null
    }

    if (args.reviewerSessionToken || args.mainSessionToken) {
      await requireAcademicExchangeReviewerAccess(ctx, {
        reviewerSessionToken: args.reviewerSessionToken,
        mainSessionToken: args.mainSessionToken,
      })
      if (application.oaSubmissionId) {
        throw new Error("新申请请在统一 OA 审批台查看附件")
      }
    } else {
      const user = await getUserBySession(ctx, args.sessionToken)
      if (String(application.userId) !== String(user._id) && user.role !== "super_admin") {
        return null
      }
    }

    const r2Url = await getR2DownloadUrl(application.paperPdfStorageId)
    if (r2Url) return r2Url

    return await ctx.storage.getUrl(application.paperPdfStorageId as any)
  },
})

export const logReviewerApplicationDownload = mutation({
  args: {
    reviewerSessionToken: v.optional(v.string()),
    mainSessionToken: v.optional(v.string()),
    id: v.id("academicExchangeSupportApplications"),
  },
  handler: async (ctx, args) => {
    const reviewerAccess = await requireAcademicExchangeReviewerAccess(ctx, {
      reviewerSessionToken: args.reviewerSessionToken,
      mainSessionToken: args.mainSessionToken,
    })
    const application = await ctx.db.get(args.id)
    if (!application) {
      throw new Error("未找到申请记录")
    }

    await ctx.db.insert("reviewerAuditLogs", {
      reviewerId: reviewerAccess.reviewer._id,
      action: "downloadAcademicExchangePdf",
      targetType: "academicExchangeSupportApplication",
      targetId: String(args.id),
      credentialSource: reviewerAccess.credentialSource,
      mainUserId: reviewerAccess.mainUserId,
      createdAt: Date.now(),
    })

    return { success: true }
  },
})

export const reviewApplicationForReviewer = mutation({
  args: {
    reviewerSessionToken: v.optional(v.string()),
    mainSessionToken: v.optional(v.string()),
    id: v.id("academicExchangeSupportApplications"),
    action: reviewActionValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reviewerAccess = await requireAcademicExchangeReviewerAccess(ctx, {
      reviewerSessionToken: args.reviewerSessionToken,
      mainSessionToken: args.mainSessionToken,
    })
    const application = await ctx.db.get(args.id)
    if (!application) throw new Error("未找到申请记录")
    if (application.oaSubmissionId) {
      throw new Error("新申请请在统一 OA 审核台处理；Reviewer 仅兼容历史申请")
    }
    if (["approved", "rejected", "withdrawn"].includes(application.status)) {
      throw new Error("该申请已结束，不能重复审核")
    }
    const note = normalizeOptionalString(args.note)
    if ((args.action === "request_changes" || args.action === "reject") && !note) {
      throw new Error("请填写审核意见")
    }
    const nextStatus = {
      start_review: "reviewing",
      request_changes: "needs_changes",
      approve: "approved",
      reject: "rejected",
    }[args.action] as "reviewing" | "needs_changes" | "approved" | "rejected"
    const now = Date.now()
    await ctx.db.patch(args.id, {
      status: nextStatus,
      reviewNote: note,
      reviewerName: reviewerAccess.reviewer.displayName || reviewerAccess.reviewer.username || "Reviewer",
      reviewedAt: now,
      updatedAt: now,
    })
    return await ctx.db.get(args.id)
  },
})

export const withdrawApplication = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("academicExchangeSupportApplications"),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const application = await ctx.db.get(args.id)
    if (!application || String(application.userId) !== String(user._id)) {
      throw new Error("无权操作该申请")
    }
    if (!["submitted", "reviewing", "needs_changes"].includes(application.status)) {
      throw new Error("当前状态不能撤回")
    }
    const now = Date.now()
    await cancelAcademicExchangeOABridge(ctx, application, now)
    await ctx.db.patch(args.id, {
      status: "withdrawn",
      updatedAt: now,
    })
    return args.id
  },
})

export const updateApplication = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("academicExchangeSupportApplications"),
    applicantName: v.string(),
    email: v.string(),
    gender: v.optional(v.string()),
    phone: v.optional(v.string()),
    projectName: v.string(),
    exchangeLocation: v.string(),
    projectTime: v.string(),
    otherFunding: v.string(),
    projectPlan: v.string(),
    expenseItems: v.array(expenseItemValidator),
    applicationDate: v.string(),
    applicantAffiliation: v.optional(v.string()),
    totalPages: v.optional(v.number()),
    bodyPages: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const application = await ctx.db.get(args.id)
    if (!application || String(application.userId) !== String(user._id)) {
      throw new Error("无权操作该申请")
    }
    if (application.status !== "needs_changes") {
      throw new Error("只有待补充的申请可以修改后重新提交")
    }

    const projectTime = normalizeProjectTime(args.projectTime)
    const expenseItems = normalizeExpenseItems(args.expenseItems)
    if (expenseItems.length === 0 || expenseItems.length !== args.expenseItems.length) {
      throw new Error("请完整填写申请金额明细，每项金额必须大于 0")
    }
    const requiredStrings = [
      args.applicantName,
      args.email,
      args.projectName,
      args.exchangeLocation,
      args.projectTime,
      args.otherFunding,
      args.projectPlan,
      args.applicationDate,
    ]
    if (requiredStrings.some((value) => !value.trim())) {
      throw new Error("请完整填写申请信息")
    }

    const requiresPaper = application.projectCategory !== "出境访学"
    const applicantAffiliation = normalizeOptionalString(args.applicantAffiliation)
    const totalPages = normalizePositiveInteger(args.totalPages)
    const bodyPages = normalizePositiveInteger(args.bodyPages)
    if (requiresPaper && (!applicantAffiliation || !totalPages || !bodyPages)) {
      throw new Error("请完整填写论文信息")
    }

    const now = Date.now()
    await ctx.db.patch(args.id, {
      applicantName: args.applicantName.trim(),
      email: args.email.trim().toLowerCase(),
      gender: normalizeOptionalString(args.gender),
      phone: normalizeOptionalString(args.phone),
      projectName: args.projectName.trim(),
      exchangeLocation: args.exchangeLocation.trim(),
      projectTime,
      otherFunding: args.otherFunding.trim(),
      projectPlan: args.projectPlan.trim(),
      expenseItems,
      totalAmount: expenseItems.reduce((sum, item) => sum + item.amount, 0),
      applicationDate: args.applicationDate.trim(),
      applicantAffiliation: requiresPaper ? applicantAffiliation : application.applicantAffiliation,
      totalPages: requiresPaper ? totalPages : application.totalPages,
      bodyPages: requiresPaper ? bodyPages : application.bodyPages,
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
    })
    const updatedApplication = await ctx.db.get(args.id)
    if (!updatedApplication) throw new Error("学术交流支持申请不存在")
    await resumeAcademicExchangeOABridge(ctx, updatedApplication, user, now)
    return args.id
  },
})

export const updateApplicationForSuperAdmin = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("academicExchangeSupportApplications"),
    ...adminApplicationPatchValidator,
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.sessionToken)
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error("未找到申请记录")
    }
    if (existing.oaSubmissionId) {
      throw new Error("统一 OA 中的申请不能在旧管理页直接编辑")
    }

    const expenseItems = normalizeExpenseItems(args.expenseItems)
    if (expenseItems.length === 0) {
      throw new Error("请至少保留一项申请金额")
    }

    const requiredStrings = [
      args.applicantName,
      args.studentId,
      args.email,
      args.projectCategory,
      args.projectName,
      args.exchangeLocation,
      args.projectTime,
      args.otherFunding,
      args.projectPlan,
      args.applicationDate,
    ]
    if (requiredStrings.some((value) => !value.trim())) {
      throw new Error("请完整填写申请信息")
    }

    const paperPdfUrl = normalizeOptionalString(args.paperPdfUrl)
    if (paperPdfUrl && !isSafeExternalPaperPdfUrl(paperPdfUrl)) {
      throw new Error("论文 PDF 链接必须来自 https://arxiv.org")
    }

    const projectTime = normalizeProjectTime(args.projectTime)
    await ctx.db.patch(args.id, {
      applicantName: args.applicantName.trim(),
      studentId: args.studentId.trim(),
      email: args.email.trim().toLowerCase(),
      gender: normalizeOptionalString(args.gender),
      phone: normalizeOptionalString(args.phone),
      projectCategory: args.projectCategory.trim(),
      projectName: args.projectName.trim(),
      exchangeLocation: args.exchangeLocation.trim(),
      projectTime,
      otherFunding: args.otherFunding.trim(),
      projectPlan: args.projectPlan.trim(),
      expenseItems,
      totalAmount: expenseItems.reduce((sum, item) => sum + item.amount, 0),
      applicationDate: args.applicationDate.trim(),
      paperTitle: normalizeOptionalString(args.paperTitle),
      paperAuthors: args.paperAuthors?.map((author) => author.trim()).filter(Boolean),
      applicantAuthorName: normalizeOptionalString(args.applicantAuthorName),
      applicantAuthorIndexLabel: normalizeOptionalString(args.applicantAuthorIndexLabel),
      applicantAffiliation: normalizeOptionalString(args.applicantAffiliation),
      totalPages: normalizePositiveInteger(args.totalPages),
      bodyPages: normalizePositiveInteger(args.bodyPages),
      paperPdfUrl,
      paperPdfSource: args.paperPdfSource,
      paperPdfFileName: normalizeOptionalString(args.paperPdfFileName),
      paperPdfMimeType: normalizeOptionalString(args.paperPdfMimeType),
      paperPdfSize: args.paperPdfSize,
      updatedAt: Date.now(),
    })

    return args.id
  },
})

export const deleteApplicationForSuperAdmin = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("academicExchangeSupportApplications"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.sessionToken)
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error("未找到申请记录")
    }
    if (existing.oaSubmissionId) {
      throw new Error("统一 OA 中的申请不能删除，请保留审批审计记录")
    }
    await ctx.db.delete(args.id)
    return { success: true }
  },
})

export const createApplication = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    applicantName: v.string(),
    email: v.string(),
    gender: v.optional(v.string()),
    phone: v.optional(v.string()),
    projectCategory: v.string(),
    projectName: v.string(),
    exchangeLocation: v.string(),
    projectTime: v.string(),
    otherFunding: v.string(),
    projectPlan: v.string(),
    expenseItems: v.array(expenseItemValidator),
    applicationDate: v.string(),
    publicationId: v.optional(v.id("publications")),
    applicantAffiliation: v.optional(v.string()),
    totalPages: v.optional(v.number()),
    bodyPages: v.optional(v.number()),
    paperPdfUrl: v.optional(v.string()),
    paperPdfStorageId: v.optional(v.union(v.id("_storage"), v.string())),
    paperPdfFileName: v.optional(v.string()),
    paperPdfMimeType: v.optional(v.string()),
    paperPdfSize: v.optional(v.number()),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const creationIdempotencyKey = args.idempotencyKey.trim()
    if (!creationIdempotencyKey || creationIdempotencyKey.length > 200) {
      throw new Error("提交请求标识无效")
    }
    const pdfBrand = await resolveAcademicExchangePdfBrand(ctx, user)
    const projectCategory = args.projectCategory.trim()
    const projectTime = normalizeProjectTime(args.projectTime)
    const requiresPaper = projectCategory !== "出境访学"
    const uploadedPaperPdf = requiresPaper ? await normalizeUploadedPaperPdfMetadata(ctx, args, String(user._id)) : null
    const paperPdfUrl = normalizeOptionalString(args.paperPdfUrl)
    let publication: any = null
    let authorInfo: { name: string; label: string } | null = null

    if (requiresPaper) {
      if (!args.publicationId) {
        throw new Error("请选择有效的论文")
      }

      publication = await ctx.db.get(args.publicationId)
      if (!publication) {
        throw new Error("请选择有效的论文")
      }

      authorInfo = buildAuthorIndexLabel(publication.authors, String(user._id))
      if (!authorInfo) {
        throw new Error("无法在该论文作者列表中识别申请人，请先去个人学术修正作者关联")
      }
    }

    const expenseItems = args.expenseItems
    const normalizedExpenseItems = normalizeExpenseItems(expenseItems)

    if (normalizedExpenseItems.length === 0) {
      throw new Error("请至少填写一项申请金额")
    }

    const requiredStrings = [
      args.applicantName,
      args.email,
      projectCategory,
      args.projectName,
      args.exchangeLocation,
      args.projectTime,
      args.otherFunding,
      args.projectPlan,
      args.applicationDate,
    ]
    if (requiredStrings.some((value) => !value.trim())) {
      throw new Error("请完整填写申请信息")
    }

    if (requiresPaper) {
      const paperRequiredStrings = [
        args.applicantAffiliation,
      ]
      if (paperRequiredStrings.some((value) => !value?.trim())) {
        throw new Error("请完整填写论文信息")
      }

      if (!paperPdfUrl && !uploadedPaperPdf) {
        throw new Error("请上传论文 PDF 或填写论文 PDF 链接")
      }

      if (paperPdfUrl && !isSafeExternalPaperPdfUrl(paperPdfUrl)) {
        throw new Error("论文 PDF 链接必须来自 https://arxiv.org")
      }

      if (!Number.isInteger(args.totalPages) || !Number.isInteger(args.bodyPages) || args.totalPages! <= 0 || args.bodyPages! <= 0) {
        throw new Error("页数必须是正整数")
      }

    }

    const now = Date.now()
    const creationRequestFingerprint = JSON.stringify({
      applicantName: args.applicantName.trim(),
      email: args.email.trim().toLowerCase(),
      gender: normalizeOptionalString(args.gender),
      phone: normalizeOptionalString(args.phone),
      projectCategory,
      projectName: args.projectName.trim(),
      exchangeLocation: args.exchangeLocation.trim(),
      projectTime,
      otherFunding: args.otherFunding.trim(),
      projectPlan: args.projectPlan.trim(),
      expenseItems: normalizedExpenseItems,
      applicationDate: args.applicationDate.trim(),
      publicationId: requiresPaper ? String(args.publicationId) : undefined,
      applicantAffiliation: requiresPaper ? normalizeOptionalString(args.applicantAffiliation) : undefined,
      totalPages: requiresPaper ? args.totalPages : undefined,
      bodyPages: requiresPaper ? args.bodyPages : undefined,
      paperPdfUrl: requiresPaper ? paperPdfUrl : undefined,
      paperPdfStorageId: requiresPaper && uploadedPaperPdf ? String(args.paperPdfStorageId) : undefined,
      paperPdfFileName: requiresPaper && uploadedPaperPdf ? uploadedPaperPdf.fileName : undefined,
      paperPdfMimeType: requiresPaper && uploadedPaperPdf ? uploadedPaperPdf.mimeType : undefined,
      paperPdfSize: requiresPaper && uploadedPaperPdf ? uploadedPaperPdf.size : undefined,
    })
    const replay = await ctx.db
      .query("academicExchangeSupportApplications")
      .withIndex("by_user_idempotency", (q: any) => (
        q.eq("userId", user._id).eq("creationIdempotencyKey", creationIdempotencyKey)
      ))
      .first()
    if (replay) {
      if (replay.creationRequestFingerprint !== creationRequestFingerprint) {
        throw new Error("同一提交请求标识不能用于不同内容")
      }
      return replay._id
    }
    const existingProfile = await ctx.db
      .query("studentFormProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first()
    const profilePatch = {
      gender: normalizeOptionalString(args.gender),
      phone: normalizeOptionalString(args.phone),
      updatedAt: now,
    }

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, profilePatch)
    } else {
      await ctx.db.insert("studentFormProfiles", {
        userId: user._id,
        ...profilePatch,
        createdAt: now,
      })
    }

    const applicationId = await ctx.db.insert("academicExchangeSupportApplications", {
      userId: user._id,
      applicantName: args.applicantName.trim(),
      studentId: user.studentId,
      email: args.email.trim().toLowerCase(),
      gender: normalizeOptionalString(args.gender),
      phone: normalizeOptionalString(args.phone),
      projectCategory,
      projectName: args.projectName.trim(),
      exchangeLocation: args.exchangeLocation.trim(),
      projectTime,
      otherFunding: args.otherFunding.trim(),
      projectPlan: args.projectPlan.trim(),
      expenseItems: normalizedExpenseItems,
      totalAmount: normalizedExpenseItems.reduce((sum, item) => sum + item.amount, 0),
      applicationDate: args.applicationDate,
      publicationId: requiresPaper ? args.publicationId : undefined,
      paperTitle: requiresPaper ? publication.title : undefined,
      paperAuthors: requiresPaper ? publication.authors : undefined,
      applicantAuthorName: requiresPaper ? authorInfo!.name : undefined,
      applicantAuthorIndexLabel: requiresPaper ? authorInfo!.label : undefined,
      applicantAffiliation: requiresPaper ? args.applicantAffiliation!.trim() : undefined,
      totalPages: requiresPaper ? args.totalPages : undefined,
      bodyPages: requiresPaper ? args.bodyPages : undefined,
      paperPdfUrl: requiresPaper ? paperPdfUrl : undefined,
      paperPdfSource: requiresPaper ? (uploadedPaperPdf ? "upload" : "url") : undefined,
      paperPdfStorageId: requiresPaper && uploadedPaperPdf ? args.paperPdfStorageId as any : undefined,
      paperPdfFileName: requiresPaper && uploadedPaperPdf ? uploadedPaperPdf.fileName : undefined,
      paperPdfMimeType: requiresPaper && uploadedPaperPdf ? uploadedPaperPdf.mimeType : undefined,
      paperPdfSize: requiresPaper && uploadedPaperPdf ? uploadedPaperPdf.size : undefined,
      pdfBrand,
      creationIdempotencyKey,
      creationRequestFingerprint,
      status: "submitted",
      submittedAt: now,
      createdAt: now,
    })
    const application = await ctx.db.get(applicationId)
    if (!application) throw new Error("学术交流支持申请创建失败")
    const oaSubmissionId = await createAcademicExchangeOABridge(ctx, {
      application,
      applicant: user,
      now,
    })
    await ctx.db.patch(applicationId, { oaSubmissionId })
    return applicationId
  },
})
