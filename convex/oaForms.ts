import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { createR2UploadTarget, getR2DownloadUrl, getR2ObjectKeyFromStorageId, r2StorageIdMatches } from "./lib/r2"

const MAX_DEFAULT_FILE_BYTES = 20 * 1024 * 1024

const reviewStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("needs_changes")
)

const formStatusValidator = v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))

const fieldTypeValidator = v.union(
  v.literal("text"),
  v.literal("textarea"),
  v.literal("number"),
  v.literal("date"),
  v.literal("select"),
  v.literal("radio"),
  v.literal("checkbox"),
  v.literal("file"),
  v.literal("table")
)

const resultFieldTypeValidator = v.union(v.literal("text"), v.literal("number"), v.literal("date"), v.literal("select"))

const optionValidator = v.object({ label: v.string(), value: v.string() })

const tableColumnValidator = v.object({
  id: v.string(),
  label: v.string(),
  type: v.union(v.literal("text"), v.literal("number"), v.literal("date")),
  required: v.optional(v.boolean()),
})

const fieldValidator = v.object({
  id: v.string(),
  type: fieldTypeValidator,
  label: v.string(),
  helpText: v.optional(v.string()),
  placeholder: v.optional(v.string()),
  required: v.optional(v.boolean()),
  options: v.optional(v.array(optionValidator)),
  acceptedMimeTypes: v.optional(v.array(v.string())),
  maxFiles: v.optional(v.number()),
  maxFileSizeMB: v.optional(v.number()),
  columns: v.optional(v.array(tableColumnValidator)),
})

const resultFieldValidator = v.object({
  id: v.string(),
  label: v.string(),
  type: resultFieldTypeValidator,
  visibleToSubmitter: v.optional(v.boolean()),
  options: v.optional(v.array(optionValidator)),
})

const formInputValidator = {
  id: v.optional(v.id("oaForms")),
  slug: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  category: v.optional(v.string()),
  kind: v.optional(v.union(v.literal("form"), v.literal("reimbursement"))),
  visibility: v.optional(v.union(v.literal("members"), v.literal("admins"))),
  status: v.optional(formStatusValidator),
  allowMultipleSubmissions: v.optional(v.boolean()),
  maxSubmissionsPerUser: v.optional(v.number()),
  allowSubmissionEdits: v.optional(v.boolean()),
  openAt: v.optional(v.number()),
  closeAt: v.optional(v.number()),
  fields: v.array(fieldValidator),
  resultFields: v.optional(v.array(resultFieldValidator)),
  resultsVisible: v.optional(v.boolean()),
}

const sha256Hex = async (input: string) => {
  const cryptoImpl = (globalThis as any).crypto || (global as any).crypto
  const enc = new TextEncoder().encode(input)
  const hashBuffer = await cryptoImpl.subtle.digest("SHA-256", enc)
  return Array.from(new Uint8Array(hashBuffer)).map((b: number) => b.toString(16).padStart(2, "0")).join("")
}

async function getUserBySession(ctx: any, sessionToken?: string) {
  if (!sessionToken) throw new Error("请先登录")
  const tokenHash = await sha256Hex(sessionToken)
  const session = await ctx.db
    .query("authSessions")
    .withIndex("by_tokenHash", (q: any) => q.eq("tokenHash", tokenHash))
    .first()
  if (!session || session.revokedAt || session.expiresAt <= Date.now()) {
    throw new Error("登录已过期，请重新登录")
  }
  const user = await ctx.db.get(session.userId)
  if (!user) throw new Error("用户不存在")
  return user
}

function requireMember(user: any) {
  if (user.isClassMember === false) throw new Error("仅通班成员可访问")
  return user
}

function requireAdmin(user: any) {
  if (user.role !== "admin" && user.role !== "super_admin") throw new Error("需要管理员权限")
  return user
}

function normalizeText(value: string, fallback = "") {
  const trimmed = String(value || "").trim()
  return trimmed || fallback
}

function normalizeOptionalText(value?: string) {
  const trimmed = String(value || "").trim()
  return trimmed || undefined
}

function normalizeSlug(value: string) {
  const slug = normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
  if (!slug) throw new Error("请填写表单链接 slug（仅限英文、数字和连字符）")
  return slug
}

function formKind(form: any) {
  return form?.kind === "reimbursement" ? "reimbursement" : "form"
}

function uniqueIds(items: Array<{ id: string }>, label: string) {
  const seen = new Set<string>()
  for (const item of items) {
    const id = normalizeText(item.id)
    if (!id) throw new Error(`${label} ID 不能为空`)
    if (seen.has(id)) throw new Error(`${label} ID 不能重复：${id}`)
    seen.add(id)
  }
}

function sanitizeField(field: any) {
  const id = normalizeText(field.id)
  const label = normalizeText(field.label)
  if (!id || !label) throw new Error("字段 ID 和名称不能为空")
  if (["select", "radio", "checkbox"].includes(field.type) && (!field.options || field.options.length === 0)) {
    throw new Error(`${label} 至少需要一个选项`)
  }
  if (field.type === "table") {
    if (!field.columns || field.columns.length === 0) throw new Error(`${label} 至少需要一列`)
    uniqueIds(field.columns, `${label}列`)
  }
  return {
    id,
    type: field.type,
    label,
    helpText: normalizeOptionalText(field.helpText),
    placeholder: normalizeOptionalText(field.placeholder),
    required: Boolean(field.required),
    options: field.options?.map((option: any) => ({ label: normalizeText(option.label), value: normalizeText(option.value) })).filter((option: any) => option.label && option.value),
    acceptedMimeTypes: field.acceptedMimeTypes?.map((type: string) => normalizeText(type).toLowerCase()).filter(Boolean),
    maxFiles: field.maxFiles && field.maxFiles > 0 ? Math.floor(field.maxFiles) : undefined,
    maxFileSizeMB: field.maxFileSizeMB && field.maxFileSizeMB > 0 ? field.maxFileSizeMB : undefined,
    columns: field.columns?.map((column: any) => ({
      id: normalizeText(column.id),
      label: normalizeText(column.label),
      type: column.type,
      required: Boolean(column.required),
    })),
  }
}

function sanitizeResultField(field: any) {
  const id = normalizeText(field.id)
  const label = normalizeText(field.label)
  if (!id || !label) throw new Error("结果字段 ID 和名称不能为空")
  return {
    id,
    label,
    type: field.type,
    visibleToSubmitter: Boolean(field.visibleToSubmitter),
    options: field.options?.map((option: any) => ({ label: normalizeText(option.label), value: normalizeText(option.value) })).filter((option: any) => option.label && option.value),
  }
}

function isEmpty(value: unknown) {
  if (value === undefined || value === null) return true
  if (typeof value === "string") return value.trim() === ""
  if (Array.isArray(value)) return value.length === 0
  return false
}

function allowedOptionValues(field: any) {
  return new Set((field.options || []).map((option: any) => option.value))
}

function validateFileAnswer(field: any, value: unknown) {
  const files = Array.isArray(value) ? value : []
  const errors: string[] = []
  const maxFiles = field.maxFiles || 1
  const maxBytes = (field.maxFileSizeMB || 20) * 1024 * 1024
  const accepted = new Set((field.acceptedMimeTypes || []).map((type: string) => type.toLowerCase()))
  if (field.required && files.length === 0) errors.push(`请上传${field.label}`)
  if (files.length > maxFiles) errors.push(`${field.label}最多上传 ${maxFiles} 个文件`)
  for (const file of files as any[]) {
    const size = Number(file?.size)
    const mimeType = String(file?.mimeType || "").toLowerCase()
    if (!file?.storageId || !file?.fileName || !mimeType || !Number.isFinite(size) || size <= 0) {
      errors.push(`${field.label}文件信息不完整`)
      continue
    }
    if (accepted.size > 0 && !accepted.has(mimeType)) errors.push(`${field.label}不支持该文件类型`)
    if (size > maxBytes) errors.push(`${field.label}单个文件不能超过 ${Math.round(maxBytes / 1024 / 1024)}MB`)
  }
  return errors
}

function validateTableAnswer(field: any, value: unknown) {
  if (!Array.isArray(value)) return field.required ? [`请至少填写一行${field.label}`] : []
  if (field.required && value.length === 0) return [`请至少填写一行${field.label}`]
  const errors: string[] = []
  for (let rowIndex = 0; rowIndex < value.length; rowIndex += 1) {
    const row = value[rowIndex] && typeof value[rowIndex] === "object" ? value[rowIndex] as Record<string, unknown> : {}
    for (const column of field.columns || []) {
      const cell = row[column.id]
      if (column.required && isEmpty(cell)) errors.push(`${field.label}第 ${rowIndex + 1} 行请填写${column.label}`)
      if (!isEmpty(cell) && column.type === "number" && (typeof cell !== "number" || !Number.isFinite(cell))) {
        errors.push(`${field.label}第 ${rowIndex + 1} 行${column.label}必须是数字`)
      }
    }
  }
  return errors
}

async function normalizeFileAnswers(ctx: any, field: any, value: unknown, ownerId: string) {
  const files = Array.isArray(value) ? value : []
  const maxBytes = (field.maxFileSizeMB || 20) * 1024 * 1024
  const accepted = new Set((field.acceptedMimeTypes || []).map((type: string) => type.toLowerCase()))
  const normalized = []
  for (const file of files as any[]) {
    const storageId = String(file.storageId || "")
    const r2Key = getR2ObjectKeyFromStorageId(storageId)
    let actualSize = Number(file.size)
    let actualMimeType = String(file.mimeType || "").toLowerCase()
    if (r2Key) {
      if (!r2StorageIdMatches(storageId, { ownerId, purpose: "oa-form-attachment" })) {
        throw new Error(`${field.label}上传凭证无效`)
      }
    } else {
      const storageDoc = await ctx.db.system.get(file.storageId as any)
      if (!storageDoc) throw new Error(`${field.label}文件不存在或上传未完成`)
      actualSize = Number((storageDoc as any).size ?? file.size)
      actualMimeType = String((storageDoc as any).contentType || file.mimeType || "").toLowerCase()
    }
    if (accepted.size > 0 && !accepted.has(actualMimeType)) throw new Error(`${field.label}不支持该文件类型`)
    if (!Number.isFinite(actualSize) || actualSize <= 0 || actualSize > maxBytes) {
      throw new Error(`${field.label}单个文件不能超过 ${Math.round(maxBytes / 1024 / 1024)}MB`)
    }
    normalized.push({
      storageId,
      fileName: normalizeText(file.fileName, "未命名文件"),
      mimeType: actualMimeType,
      size: actualSize,
    })
  }
  return normalized
}

async function normalizeAnswers(ctx: any, form: any, answers: Record<string, unknown>, ownerId: string) {
  const fieldIds = new Set((form.fields || []).map((field: any) => field.id))
  const unknownField = Object.keys(answers || {}).find((key) => !fieldIds.has(key))
  if (unknownField) throw new Error(`未知字段：${unknownField}`)

  const errors: string[] = []
  const normalized: Record<string, unknown> = {}
  for (const field of form.fields || []) {
    const value = answers[field.id]
    if (field.type === "file") {
      errors.push(...validateFileAnswer(field, value))
      if (errors.length === 0) normalized[field.id] = await normalizeFileAnswers(ctx, field, value, ownerId)
      continue
    }
    if (field.type === "table") {
      errors.push(...validateTableAnswer(field, value))
      normalized[field.id] = Array.isArray(value) ? value : []
      continue
    }
    if (field.required && isEmpty(value)) {
      errors.push(`请填写${field.label}`)
      continue
    }
    if (isEmpty(value)) continue
    if (field.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) errors.push(`${field.label}必须是数字`)
    if (["select", "radio"].includes(field.type) && field.options?.length) {
      const allowed = allowedOptionValues(field)
      if (typeof value !== "string" || !allowed.has(value)) errors.push(`${field.label}不是有效选项`)
    }
    if (field.type === "checkbox" && field.options?.length) {
      const allowed = allowedOptionValues(field)
      if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !allowed.has(item))) errors.push(`${field.label}包含无效选项`)
    }
    normalized[field.id] = value
  }
  if (errors.length > 0) throw new Error(errors[0])
  return normalized
}

function assertFormOpen(form: any) {
  const now = Date.now()
  if (form.status !== "published") throw new Error("表单尚未发布")
  if (form.visibility !== "members") throw new Error("该表单不面向成员开放")
  if (form.openAt && form.openAt > now) throw new Error("表单尚未开始")
  if (form.closeAt && form.closeAt < now) throw new Error("表单已截止")
}

function collectAttachmentStorageIds(form: any, answers: any) {
  const ids = new Set<string>()
  if (!answers || typeof answers !== "object") return ids
  for (const field of form.fields || []) {
    if (field.type !== "file") continue
    const value = answers[field.id]
    if (!Array.isArray(value)) continue
    for (const item of value as any[]) {
      if (item?.storageId) ids.add(String(item.storageId))
    }
  }
  return ids
}

function serializeSubmission(form: any, submission: any, viewer: "owner" | "admin") {
  let resultValues = submission.resultValues
  if (viewer !== "admin") {
    if (!form.resultsVisible) {
      resultValues = undefined
    } else {
      const visibleIds = new Set((form.resultFields || []).filter((field: any) => field.visibleToSubmitter).map((field: any) => field.id))
      resultValues = Object.fromEntries(Object.entries(submission.resultValues || {}).filter(([key]) => visibleIds.has(key)))
    }
  }
  return { ...submission, resultValues }
}

export const listPublished = query({
  args: {
    sessionToken: v.optional(v.string()),
    category: v.optional(v.string()),
    kind: v.optional(v.union(v.literal("form"), v.literal("reimbursement"))),
    includePast: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    requireMember(await getUserBySession(ctx, args.sessionToken))
    const rows = args.includePast
      ? await ctx.db.query("oaForms").withIndex("by_updatedAt").order("desc").collect()
      : await ctx.db.query("oaForms").withIndex("by_status_category", (q) => q.eq("status", "published")).order("desc").collect()
    const now = Date.now()
    return rows
      .filter((form) => form.visibility === "members")
      .filter((form) => args.includePast ? (form.status === "published" || form.status === "archived") : form.status === "published")
      .filter((form) => !args.kind || formKind(form) === args.kind)
      .filter((form) => !args.category || form.category === args.category)
      .filter((form) => !form.openAt || form.openAt <= now)
      .filter((form) => args.includePast || !form.closeAt || form.closeAt >= now)
  },
})

export const getPublishedBySlug = query({
  args: { sessionToken: v.optional(v.string()), slug: v.string() },
  handler: async (ctx, args) => {
    requireMember(await getUserBySession(ctx, args.sessionToken))
    const form = await ctx.db.query("oaForms").withIndex("by_slug", (q) => q.eq("slug", normalizeSlug(args.slug))).first()
    if (!form || (form.status !== "published" && form.status !== "archived")) return null
    if (form.visibility !== "members") return null
    const now = Date.now()
    if (form.openAt && form.openAt > now) return null
    return form
  },
})

export const adminList = query({
  args: { sessionToken: v.optional(v.string()), kind: v.optional(v.union(v.literal("form"), v.literal("reimbursement"))) },
  handler: async (ctx, args) => {
    requireAdmin(await getUserBySession(ctx, args.sessionToken))
    const rows = await ctx.db.query("oaForms").withIndex("by_updatedAt").order("desc").collect()
    return args.kind ? rows.filter((form) => formKind(form) === args.kind) : rows
  },
})

export const adminGet = query({
  args: { sessionToken: v.optional(v.string()), id: v.id("oaForms") },
  handler: async (ctx, args) => {
    requireAdmin(await getUserBySession(ctx, args.sessionToken))
    return await ctx.db.get(args.id)
  },
})

export const adminUpsert = mutation({
  args: { sessionToken: v.optional(v.string()), ...formInputValidator },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getUserBySession(ctx, args.sessionToken))
    const now = Date.now()
    const slug = normalizeSlug(args.slug)
    const fields = args.fields.map(sanitizeField)
    uniqueIds(fields, "字段")
    if (fields.length === 0) throw new Error("至少需要一个字段")
    const category = normalizeOptionalText(args.category)
    if (!category) throw new Error("请填写分类")
    const maxSubmissionsPerUser = args.maxSubmissionsPerUser && Number.isInteger(args.maxSubmissionsPerUser) && args.maxSubmissionsPerUser > 0
      ? Math.floor(args.maxSubmissionsPerUser)
      : undefined
    const resultFields = (args.resultFields || []).map(sanitizeResultField)
    uniqueIds(resultFields, "结果字段")
    const existingById = args.id ? await ctx.db.get(args.id) : null
    const existingBySlug = await ctx.db.query("oaForms").withIndex("by_slug", (q) => q.eq("slug", slug)).first()
    if (existingBySlug && (!args.id || String(existingBySlug._id) !== String(args.id))) {
      throw new Error("该 slug 已被其他表单使用")
    }
    const patch = {
      slug,
      title: normalizeText(args.title, "未命名表单"),
      description: normalizeOptionalText(args.description),
      category,
      kind: args.kind || "form",
      visibility: args.visibility || "members",
      status: args.status || "draft",
      allowMultipleSubmissions: args.allowMultipleSubmissions ?? true,
      maxSubmissionsPerUser,
      allowSubmissionEdits: Boolean(args.allowSubmissionEdits),
      openAt: args.openAt,
      closeAt: args.closeAt,
      fields,
      resultFields,
      resultsVisible: Boolean(args.resultsVisible),
      updatedBy: admin._id,
      publishedAt: args.status === "published" ? (existingById?.publishedAt || now) : existingById?.publishedAt,
      updatedAt: now,
    }
    if (args.id) {
      await ctx.db.patch(args.id, patch)
      return args.id
    }
    return await ctx.db.insert("oaForms", {
      ...patch,
      createdBy: admin._id,
      createdAt: now,
    })
  },
})

export const adminSetStatus = mutation({
  args: { sessionToken: v.optional(v.string()), id: v.id("oaForms"), status: formStatusValidator },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getUserBySession(ctx, args.sessionToken))
    const now = Date.now()
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedBy: admin._id,
      publishedAt: args.status === "published" ? now : undefined,
      updatedAt: now,
    })
    return args.id
  },
})

export const adminRemove = mutation({
  args: { sessionToken: v.optional(v.string()), id: v.id("oaForms") },
  handler: async (ctx, args) => {
    requireAdmin(await getUserBySession(ctx, args.sessionToken))
    const existingSubmission = await ctx.db
      .query("oaFormSubmissions")
      .withIndex("by_form_createdAt", (q) => q.eq("formId", args.id))
      .first()
    if (existingSubmission) throw new Error("已有提交记录的表单不能删除，请改为归档")
    await ctx.db.delete(args.id)
    return args.id
  },
})

export const generateUploadUrl = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = requireMember(await getUserBySession(ctx, args.sessionToken))
    const r2Target = await createR2UploadTarget({
      purpose: "oa-form-attachment",
      ownerId: String(user._id),
      fileName: args.fileName,
      contentType: args.mimeType,
    })
    if (r2Target) return r2Target
    return await ctx.storage.generateUploadUrl()
  },
})

export const submit = mutation({
  args: { sessionToken: v.optional(v.string()), formId: v.id("oaForms"), answers: v.any() },
  handler: async (ctx, args) => {
    const user = requireMember(await getUserBySession(ctx, args.sessionToken))
    const form = await ctx.db.get(args.formId)
    if (!form) throw new Error("表单不存在")
    assertFormOpen(form)
    const answers = args.answers && typeof args.answers === "object" ? args.answers as Record<string, unknown> : {}
    const normalizedAnswers = await normalizeAnswers(ctx, form, answers, String(user._id))
    const maxSubmissionsPerUser = Number(form.maxSubmissionsPerUser)
    const submissionLimit = Number.isInteger(maxSubmissionsPerUser) && maxSubmissionsPerUser > 0
      ? Math.floor(maxSubmissionsPerUser)
      : form.allowMultipleSubmissions === false ? 1 : undefined
    if (submissionLimit) {
      const existing = await ctx.db
        .query("oaFormSubmissions")
        .withIndex("by_form_submitter_createdAt", (q) => q.eq("formId", form._id).eq("submitterId", user._id))
        .collect()
      if (existing.length >= submissionLimit) throw new Error(`该表单每人最多提交 ${submissionLimit} 次`)
    }
    const now = Date.now()
    return await ctx.db.insert("oaFormSubmissions", {
      formId: form._id,
      formSlug: form.slug,
      submitterId: user._id,
      submitterName: user.chineseName || user.englishName || user.username || user.email,
      studentId: user.studentId,
      submitterEmail: user.email,
      answers: normalizedAnswers,
      reviewStatus: "pending",
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateSubmission = mutation({
  args: { sessionToken: v.optional(v.string()), id: v.id("oaFormSubmissions"), answers: v.any() },
  handler: async (ctx, args) => {
    const user = requireMember(await getUserBySession(ctx, args.sessionToken))
    const submission = await ctx.db.get(args.id)
    if (!submission || String(submission.submitterId) !== String(user._id)) throw new Error("无权修改该提交")
    const form = await ctx.db.get(submission.formId)
    if (!form) throw new Error("表单不存在")
    if (!form.allowSubmissionEdits) throw new Error("该表单不允许修改提交内容")
    assertFormOpen(form)
    const answers = args.answers && typeof args.answers === "object" ? args.answers as Record<string, unknown> : {}
    const normalizedAnswers = await normalizeAnswers(ctx, form, answers, String(user._id))
    const now = Date.now()
    await ctx.db.patch(args.id, {
      answers: normalizedAnswers,
      reviewStatus: "pending",
      updatedAt: now,
    })
    return args.id
  },
})

export const listMine = query({
  args: { sessionToken: v.optional(v.string()), formId: v.optional(v.id("oaForms")) },
  handler: async (ctx, args) => {
    const user = requireMember(await getUserBySession(ctx, args.sessionToken))
    const rows = args.formId
      ? await ctx.db.query("oaFormSubmissions").withIndex("by_form_submitter_createdAt", (q) => q.eq("formId", args.formId!).eq("submitterId", user._id)).order("desc").collect()
      : await ctx.db.query("oaFormSubmissions").withIndex("by_submitter_createdAt", (q) => q.eq("submitterId", user._id)).order("desc").collect()
    return await Promise.all(rows.map(async (row) => {
      const form = await ctx.db.get(row.formId)
      return form ? serializeSubmission(form, row, "owner") : row
    }))
  },
})

export const adminListSubmissions = query({
  args: { sessionToken: v.optional(v.string()), formId: v.id("oaForms"), status: v.optional(reviewStatusValidator), search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    requireAdmin(await getUserBySession(ctx, args.sessionToken))
    const rows = args.status
      ? await ctx.db.query("oaFormSubmissions").withIndex("by_form_status_createdAt", (q) => q.eq("formId", args.formId).eq("reviewStatus", args.status!)).order("desc").collect()
      : await ctx.db.query("oaFormSubmissions").withIndex("by_form_createdAt", (q) => q.eq("formId", args.formId)).order("desc").collect()
    const queryText = normalizeOptionalText(args.search)?.toLowerCase()
    if (!queryText) return rows
    return rows.filter((row) => [row.submitterName, row.studentId, row.submitterEmail].some((value) => String(value || "").toLowerCase().includes(queryText)))
  },
})

export const adminReviewSubmission = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("oaFormSubmissions"),
    reviewStatus: reviewStatusValidator,
    adminNote: v.optional(v.string()),
    resultValues: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getUserBySession(ctx, args.sessionToken))
    const now = Date.now()
    await ctx.db.patch(args.id, {
      reviewStatus: args.reviewStatus,
      adminNote: normalizeOptionalText(args.adminNote),
      reviewerId: admin._id,
      reviewerName: admin.chineseName || admin.englishName || admin.username || admin.email,
      reviewedAt: now,
      resultValues: args.resultValues,
      updatedAt: now,
    })
    return args.id
  },
})

export const getAttachmentUrl = query({
  args: { sessionToken: v.optional(v.string()), submissionId: v.id("oaFormSubmissions"), storageId: v.string() },
  handler: async (ctx, args) => {
    const user = requireMember(await getUserBySession(ctx, args.sessionToken))
    const submission = await ctx.db.get(args.submissionId)
    if (!submission) return null
    const form = await ctx.db.get(submission.formId)
    if (!form) return null
    const isAdmin = user.role === "admin" || user.role === "super_admin"
    if (!isAdmin && String(submission.submitterId) !== String(user._id)) throw new Error("无权访问该附件")
    if (!collectAttachmentStorageIds(form, submission.answers).has(args.storageId)) throw new Error("附件不属于该提交")
    const r2Url = await getR2DownloadUrl(args.storageId)
    if (r2Url) return r2Url
    return await ctx.storage.getUrl(args.storageId as any)
  },
})

export const adminExportSubmissions = query({
  args: { sessionToken: v.optional(v.string()), formId: v.id("oaForms") },
  handler: async (ctx, args) => {
    requireAdmin(await getUserBySession(ctx, args.sessionToken))
    const form = await ctx.db.get(args.formId)
    if (!form) throw new Error("表单不存在")
    const rows = await ctx.db.query("oaFormSubmissions").withIndex("by_form_createdAt", (q) => q.eq("formId", args.formId)).order("desc").collect()
    return { form, rows }
  },
})

export const adminUpdateResultConfig = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    formId: v.id("oaForms"),
    resultFields: v.array(resultFieldValidator),
    resultsVisible: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getUserBySession(ctx, args.sessionToken))
    const resultFields = args.resultFields.map(sanitizeResultField)
    uniqueIds(resultFields, "结果字段")
    await ctx.db.patch(args.formId, {
      resultFields,
      resultsVisible: args.resultsVisible,
      updatedBy: admin._id,
      updatedAt: Date.now(),
    })
    return args.formId
  },
})

export const adminBatchUpdateResults = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    formId: v.id("oaForms"),
    rows: v.array(v.object({
      submissionId: v.optional(v.id("oaFormSubmissions")),
      studentId: v.optional(v.string()),
      reviewStatus: v.optional(reviewStatusValidator),
      resultValues: v.any(),
    })),
  },
  handler: async (ctx, args) => {
    requireAdmin(await getUserBySession(ctx, args.sessionToken))
    const now = Date.now()
    let updated = 0
    for (const row of args.rows) {
      let submission = row.submissionId ? await ctx.db.get(row.submissionId) : null
      if (!submission && row.studentId) {
        submission = await ctx.db.query("oaFormSubmissions").withIndex("by_form_studentId", (q) => q.eq("formId", args.formId).eq("studentId", row.studentId!)).first()
      }
      if (!submission || String(submission.formId) !== String(args.formId)) continue
      await ctx.db.patch(submission._id, {
        reviewStatus: row.reviewStatus || submission.reviewStatus,
        resultValues: row.resultValues,
        updatedAt: now,
      })
      updated += 1
    }
    return { updated }
  },
})
