import { mutation, query } from "../_generated/server"
import { v } from "convex/values"
import { canViewSubmission, isTechDayAdmin, requireAuthenticated, requireOwnerOrAdmin, resolvePrincipal } from "./lib"

const actorArgs = {
  mainSessionToken: v.optional(v.string()),
  techDaySessionToken: v.optional(v.string()),
}

const MAX_POSTER_BYTES = 30 * 1024 * 1024
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024
const ATTACHMENT_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"])

const canAccessArchivedMaterial = (principal: any, submission: any) => {
  return (
    isTechDayAdmin(principal) ||
    principal.techDayUser?._id === submission.authorId ||
    (submission.reviewStatus === "approved" && submission.publicationStatus === "published" && submission.archiveConsent)
  )
}

export const generateUploadUrl = mutation({
  args: actorArgs,
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    requireAuthenticated(principal)
    return await ctx.storage.generateUploadUrl()
  },
})

export const finalizePoster = mutation({
  args: {
    ...actorArgs,
    submissionId: v.id("techDaySubmissions"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    const submission = await ctx.db.get(args.submissionId)
    if (!submission) throw new Error("投稿不存在")
    if (submission.authorId) {
      requireOwnerOrAdmin(principal, submission.authorId)
    } else if (!isTechDayAdmin(principal)) {
      throw new Error("无权访问该投稿")
    }
    if (!["application/pdf", "application/octet-stream"].includes(args.mimeType) || !args.fileName.toLowerCase().endsWith(".pdf")) {
      throw new Error("Poster 仅支持 PDF 文件")
    }
    if (args.size <= 0 || args.size > MAX_POSTER_BYTES) {
      throw new Error("Poster 文件不能超过 30MB")
    }
    await ctx.db.patch(args.submissionId, {
      posterStorageId: args.storageId,
      posterFileName: args.fileName,
      posterMimeType: args.mimeType,
      posterSize: args.size,
      updatedAt: Date.now(),
    })
    return args.submissionId
  },
})

export const getPosterUrl = query({
  args: { ...actorArgs, submissionId: v.id("techDaySubmissions") },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    const submission = await ctx.db.get(args.submissionId)
    if (!submission || !submission.posterStorageId) return null
    if (!canViewSubmission(principal, submission)) throw new Error("无权访问该 Poster")
    if (!canAccessArchivedMaterial(principal, submission)) return null
    return await ctx.storage.getUrl(submission.posterStorageId)
  },
})

export const finalizeReimbursementAttachment = mutation({
  args: {
    ...actorArgs,
    reimbursementId: v.id("techDayReimbursements"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    const reimbursement = await ctx.db.get(args.reimbursementId)
    if (!reimbursement) throw new Error("报销不存在")
    requireOwnerOrAdmin(principal, reimbursement.applicantId)
    if (!ATTACHMENT_MIME_TYPES.has(args.mimeType)) {
      throw new Error("报销附件仅支持 PDF 或图片")
    }
    if (args.size <= 0 || args.size > MAX_ATTACHMENT_BYTES) {
      throw new Error("报销附件不能超过 20MB")
    }
    await ctx.db.patch(args.reimbursementId, {
      attachmentStorageId: args.storageId,
      attachmentFileName: args.fileName,
      attachmentMimeType: args.mimeType,
      attachmentSize: args.size,
      updatedAt: Date.now(),
    })
    return args.reimbursementId
  },
})

export const getReimbursementAttachmentUrl = query({
  args: { ...actorArgs, reimbursementId: v.id("techDayReimbursements") },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    const reimbursement = await ctx.db.get(args.reimbursementId)
    if (!reimbursement || !reimbursement.attachmentStorageId) return null
    requireOwnerOrAdmin(principal, reimbursement.applicantId)
    return await ctx.storage.getUrl(reimbursement.attachmentStorageId)
  },
})
