import { mutation, query } from "../_generated/server"
import { v } from "convex/values"
import {
  normalizeLongText,
  normalizeText,
  reimbursementStatusValidator,
  isTechDayAdmin,
  requireAdmin,
  requireOwnerOrAdmin,
  requireRole,
  resolvePrincipal,
} from "./lib"

const actorArgs = {
  mainSessionToken: v.optional(v.string()),
  techDaySessionToken: v.optional(v.string()),
}

const reimbursementArgs = {
  projectName: v.string(),
  organization: v.string(),
  content: v.string(),
  quantity: v.optional(v.number()),
  amount: v.number(),
  invoiceCompany: v.string(),
}

const assignedOrganizations = (user: any) => {
  if (user.assignedTracks?.length) return user.assignedTracks
  if (user.volunteerTracks?.length) return user.volunteerTracks
  return []
}

const statusLabels: Record<string, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已拒绝",
  waiting_more: "等待补充材料",
}

const serialize = async (ctx: any, item: any) => {
  const [applicant, submitter, reviewer] = await Promise.all([
    ctx.db.get(item.applicantId),
    item.submitterId ? ctx.db.get(item.submitterId) : null,
    item.reviewerId ? ctx.db.get(item.reviewerId) : null,
  ])
  return {
    ...item,
    applicantName: applicant?.name || null,
    submitterName: submitter?.name || applicant?.name || null,
    reviewerName: reviewer?.name || item.reviewerNameSnapshot || null,
    submittedAt: item.submittedAt || item.createdAt,
    reviewedAt: item.reviewedAt || (item.status !== "pending" ? item.updatedAt : undefined),
    hasAttachment: Boolean(item.attachmentStorageId || item.legacyFilePath),
  }
}

export const list = query({
  args: actorArgs,
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    const user = requireRole(principal, "volunteer")
    let rows
    if (principal.techDayUser?.role === "admin" || principal.mainUser?.role === "admin" || principal.mainUser?.role === "super_admin") {
      rows = await ctx.db.query("techDayReimbursements").order("desc").collect()
    } else {
      rows = await ctx.db
        .query("techDayReimbursements")
        .withIndex("by_applicant_createdAt", (q) => q.eq("applicantId", user!._id))
        .order("desc")
        .collect()
    }
    return await Promise.all(rows.map((row) => serialize(ctx, row)))
  },
})

const validateOrganization = (user: any, organization: string) => {
  const assigned = assignedOrganizations(user)
  if (assigned.length > 0 && !assigned.includes(organization)) {
    throw new Error("组织不在允许范围内")
  }
  return assigned.length > 0 ? organization : "待分配"
}

export const create = mutation({
  args: { ...actorArgs, ...reimbursementArgs },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    const user = requireRole(principal, "volunteer")
    if (!user) throw new Error("志愿者账号不存在")
    const now = Date.now()
    return await ctx.db.insert("techDayReimbursements", {
      projectName: normalizeText(args.projectName),
      organization: validateOrganization(user, normalizeText(args.organization)),
      content: normalizeLongText(args.content),
      quantity: args.quantity,
      amount: args.amount,
      invoiceCompany: normalizeText(args.invoiceCompany),
      status: "pending",
      applicantId: user._id,
      submitterId: user._id,
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: { ...actorArgs, id: v.id("techDayReimbursements"), ...reimbursementArgs },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    const item = await ctx.db.get(args.id)
    if (!item) throw new Error("报销不存在")
    if (item.status === "approved") throw new Error("已通过报销不能编辑")
    requireOwnerOrAdmin(principal, item.applicantId)
    const user = await ctx.db.get(item.applicantId)
    await ctx.db.patch(args.id, {
      projectName: normalizeText(args.projectName),
      organization: validateOrganization(user, normalizeText(args.organization)),
      content: normalizeLongText(args.content),
      quantity: args.quantity,
      amount: args.amount,
      invoiceCompany: normalizeText(args.invoiceCompany),
      updatedAt: Date.now(),
    })
    return args.id
  },
})

export const remove = mutation({
  args: { ...actorArgs, id: v.id("techDayReimbursements") },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    const item = await ctx.db.get(args.id)
    if (!item) throw new Error("报销不存在")
    if (item.status === "approved" && !isTechDayAdmin(principal)) throw new Error("已通过报销不能删除")
    requireOwnerOrAdmin(principal, item.applicantId)
    await ctx.db.delete(args.id)
    return args.id
  },
})

export const review = mutation({
  args: {
    ...actorArgs,
    id: v.id("techDayReimbursements"),
    status: reimbursementStatusValidator,
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    requireAdmin(principal)
    const reviewerName = principal.techDayUser?.name || principal.mainUser?.englishName || principal.mainUser?.username || principal.mainUser?.email
    const now = Date.now()
    await ctx.db.patch(args.id, {
      status: args.status,
      adminNote: args.adminNote ? normalizeLongText(args.adminNote) : undefined,
      reviewerId: principal.techDayUser?._id,
      reviewerNameSnapshot: reviewerName,
      reviewedAt: now,
      updatedAt: now,
    })
    return args.id
  },
})

export const exportRows = query({
  args: actorArgs,
  handler: async (ctx, args) => {
    requireAdmin(await resolvePrincipal(ctx, args))
    const rows = await ctx.db.query("techDayReimbursements").order("desc").collect()
    const serialized = await Promise.all(rows.map((row) => serialize(ctx, row)))
    return serialized.map((item) => ({
      project_name: item.projectName,
      organization: item.organization,
      amount: item.amount,
      invoice_company: item.invoiceCompany,
      content: item.content.replace(/\n/g, " "),
      quantity: item.quantity || "",
      status: statusLabels[item.status] || item.status,
      submitter: item.submitterName || item.applicantName || "",
      reviewer: item.reviewerName || "",
      submitted_at: item.submittedAt ? new Date(item.submittedAt).toISOString() : "",
      reviewed_at: item.reviewedAt ? new Date(item.reviewedAt).toISOString() : "",
      attachment: item.hasAttachment ? item.attachmentFileName || "有" : "",
    }))
  },
})
