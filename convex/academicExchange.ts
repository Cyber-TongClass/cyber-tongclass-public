import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { REVIEWER_ACADEMIC_EXCHANGE_READ, requireReviewerPermission } from "./reviewer/lib"

const AUTHOR_META_PATTERN = /^(.*?)\s*\[tc-author:([^\]]+)\]\s*$/

const sha256Hex = async (input: string) => {
  const cryptoImpl = (globalThis as any).crypto || (global as any).crypto
  const enc = new TextEncoder().encode(input)
  const hashBuffer = await cryptoImpl.subtle.digest("SHA-256", enc)
  return Array.from(new Uint8Array(hashBuffer)).map((b: number) => b.toString(16).padStart(2, "0")).join("")
}

async function getUserBySession(ctx: any, sessionToken?: string) {
  if (!sessionToken) {
    throw new Error("请先登录")
  }

  const tokenHash = await sha256Hex(sessionToken)
  const session = await ctx.db
    .query("authSessions")
    .withIndex("by_tokenHash", (q: any) => q.eq("tokenHash", tokenHash))
    .first()

  if (!session || session.revokedAt || session.expiresAt <= Date.now()) {
    throw new Error("登录已过期，请重新登录")
  }

  const user = await ctx.db.get(session.userId)
  if (!user) {
    throw new Error("用户不存在")
  }

  return user
}

function normalizeOptionalString(value?: string) {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
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

export const listApplicationsForReviewer = query({
  args: { reviewerSessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireReviewerPermission(ctx, args.reviewerSessionToken, REVIEWER_ACADEMIC_EXCHANGE_READ)
    return await ctx.db
      .query("academicExchangeSupportApplications")
      .withIndex("by_createdAt")
      .order("desc")
      .collect()
  },
})

export const getApplicationForReviewer = query({
  args: {
    reviewerSessionToken: v.optional(v.string()),
    id: v.id("academicExchangeSupportApplications"),
  },
  handler: async (ctx, args) => {
    await requireReviewerPermission(ctx, args.reviewerSessionToken, REVIEWER_ACADEMIC_EXCHANGE_READ)
    return await ctx.db.get(args.id)
  },
})

export const logReviewerApplicationDownload = mutation({
  args: {
    reviewerSessionToken: v.optional(v.string()),
    id: v.id("academicExchangeSupportApplications"),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireReviewerPermission(ctx, args.reviewerSessionToken, REVIEWER_ACADEMIC_EXCHANGE_READ)
    const application = await ctx.db.get(args.id)
    if (!application) {
      throw new Error("未找到申请记录")
    }

    await ctx.db.insert("reviewerAuditLogs", {
      reviewerId: reviewer._id,
      action: "downloadAcademicExchangePdf",
      targetType: "academicExchangeSupportApplication",
      targetId: String(args.id),
      createdAt: Date.now(),
    })

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
    publicationId: v.id("publications"),
    applicantAffiliation: v.string(),
    totalPages: v.number(),
    bodyPages: v.number(),
    paperPdfUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const publication = await ctx.db.get(args.publicationId)
    if (!publication) {
      throw new Error("请选择有效的论文")
    }

    const authorInfo = buildAuthorIndexLabel(publication.authors, String(user._id))
    if (!authorInfo) {
      throw new Error("无法在该论文作者列表中识别申请人，请先去个人学术修正作者关联")
    }

    const expenseItems = args.expenseItems
      .map((item) => ({
        item: item.item.trim(),
        amount: item.amount,
        note: normalizeOptionalString(item.note),
      }))
      .filter((item) => item.item && Number.isFinite(item.amount) && item.amount >= 0)

    if (expenseItems.length === 0) {
      throw new Error("请至少填写一项申请金额")
    }

    const requiredStrings = [
      args.applicantName,
      args.email,
      args.projectCategory,
      args.projectName,
      args.exchangeLocation,
      args.projectTime,
      args.otherFunding,
      args.projectPlan,
      args.applicationDate,
      args.applicantAffiliation,
      args.paperPdfUrl,
    ]
    if (requiredStrings.some((value) => !value.trim())) {
      throw new Error("请完整填写申请信息")
    }

    if (!/^https?:\/\//i.test(args.paperPdfUrl.trim())) {
      throw new Error("论文 PDF 链接必须是 http(s) 链接")
    }

    if (!Number.isInteger(args.totalPages) || !Number.isInteger(args.bodyPages) || args.totalPages <= 0 || args.bodyPages <= 0) {
      throw new Error("页数必须是正整数")
    }

    const now = Date.now()
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

    return await ctx.db.insert("academicExchangeSupportApplications", {
      userId: user._id,
      applicantName: args.applicantName.trim(),
      studentId: user.studentId,
      email: args.email.trim().toLowerCase(),
      gender: normalizeOptionalString(args.gender),
      phone: normalizeOptionalString(args.phone),
      projectCategory: args.projectCategory.trim(),
      projectName: args.projectName.trim(),
      exchangeLocation: args.exchangeLocation.trim(),
      projectTime: args.projectTime.trim(),
      otherFunding: args.otherFunding.trim(),
      projectPlan: args.projectPlan.trim(),
      expenseItems,
      totalAmount: expenseItems.reduce((sum, item) => sum + item.amount, 0),
      applicationDate: args.applicationDate,
      publicationId: args.publicationId,
      paperTitle: publication.title,
      paperAuthors: publication.authors,
      applicantAuthorName: authorInfo.name,
      applicantAuthorIndexLabel: authorInfo.label,
      applicantAffiliation: args.applicantAffiliation.trim(),
      totalPages: args.totalPages,
      bodyPages: args.bodyPages,
      paperPdfUrl: args.paperPdfUrl.trim(),
      status: "submitted",
      submittedAt: now,
      createdAt: now,
    })
  },
})
