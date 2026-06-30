import { mutation, query } from "../_generated/server"
import { v } from "convex/values"
import { createR2UploadTarget, getR2DownloadUrl, getR2ObjectKeyFromStorageId, r2StorageIdMatches, type R2Purpose } from "../lib/r2"
import { canViewSubmission, isTechDayAdmin, requireAuthenticated, requireOwnerOrAdmin, resolvePrincipal } from "./lib"

const actorArgs = {
  mainSessionToken: v.optional(v.string()),
  techDaySessionToken: v.optional(v.string()),
}

const MAX_POSTER_BYTES = 30 * 1024 * 1024
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024
const ATTACHMENT_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"])

const getTechDayUploadOwnerId = (principal: any) => {
  return String(principal.techDayUser?._id || principal.mainUser?._id || "techday-user")
}

async function normalizeUploadedStorageReference(ctx: any, args: {
  storageId: unknown
  fileName: string
  mimeType: string
  size: number
}, options: { ownerId: string; purpose: R2Purpose; label: string }) {
  const storageId = String(args.storageId || "")
  const r2Key = getR2ObjectKeyFromStorageId(storageId)
  let mimeType = String(args.mimeType || "").toLowerCase()
  let size = Number(args.size)

  if (r2Key) {
    if (!r2StorageIdMatches(storageId, { ownerId: options.ownerId, purpose: options.purpose })) {
      throw new Error(`${options.label}上传凭证无效`)
    }
  } else {
    const storageDoc = await ctx.db.system.get(args.storageId as any)
    if (!storageDoc) throw new Error(`${options.label}文件不存在或上传未完成`)
    size = Number((storageDoc as any).size ?? size)
    mimeType = String((storageDoc as any).contentType || mimeType).toLowerCase()
  }

  return {
    storageId,
    fileName: args.fileName.trim(),
    mimeType,
    size,
  }
}

const canAccessArchivedMaterial = (principal: any, submission: any) => {
  return (
    isTechDayAdmin(principal) ||
    principal.techDayUser?._id === submission.authorId ||
    (submission.reviewStatus === "approved" && submission.publicationStatus === "published" && submission.archiveConsent)
  )
}

export const generateUploadUrl = mutation({
  args: {
    ...actorArgs,
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    fileKind: v.optional(v.union(v.literal("poster"), v.literal("reimbursement"))),
  },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    requireAuthenticated(principal)
    const ownerId = getTechDayUploadOwnerId(principal)
    const r2Target = await createR2UploadTarget({
      purpose: args.fileKind === "reimbursement" ? "techday-reimbursement-attachment" : "techday-poster",
      ownerId,
      fileName: args.fileName,
      contentType: args.mimeType,
    })
    if (r2Target) return r2Target
    return await ctx.storage.generateUploadUrl()
  },
})

export const finalizePoster = mutation({
  args: {
    ...actorArgs,
    submissionId: v.id("techDaySubmissions"),
    storageId: v.union(v.id("_storage"), v.string()),
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
    const uploaded = await normalizeUploadedStorageReference(ctx, args, {
      ownerId: getTechDayUploadOwnerId(principal),
      purpose: "techday-poster",
      label: "Poster",
    })
    if (!["application/pdf", "application/octet-stream"].includes(uploaded.mimeType) || !uploaded.fileName.toLowerCase().endsWith(".pdf")) {
      throw new Error("Poster 仅支持 PDF 文件")
    }
    if (uploaded.size <= 0 || uploaded.size > MAX_POSTER_BYTES) {
      throw new Error("Poster 文件不能超过 30MB")
    }
    await ctx.db.patch(args.submissionId, {
      posterStorageId: uploaded.storageId as any,
      posterFileName: uploaded.fileName,
      posterMimeType: uploaded.mimeType,
      posterSize: uploaded.size,
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
    const r2Url = await getR2DownloadUrl(submission.posterStorageId)
    if (r2Url) return r2Url
    return await ctx.storage.getUrl(submission.posterStorageId as any)
  },
})

export const finalizeReimbursementAttachment = mutation({
  args: {
    ...actorArgs,
    reimbursementId: v.id("techDayReimbursements"),
    storageId: v.union(v.id("_storage"), v.string()),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    const reimbursement = await ctx.db.get(args.reimbursementId)
    if (!reimbursement) throw new Error("报销不存在")
    requireOwnerOrAdmin(principal, reimbursement.applicantId)
    const uploaded = await normalizeUploadedStorageReference(ctx, args, {
      ownerId: getTechDayUploadOwnerId(principal),
      purpose: "techday-reimbursement-attachment",
      label: "报销附件",
    })
    if (!ATTACHMENT_MIME_TYPES.has(uploaded.mimeType)) {
      throw new Error("报销附件仅支持 PDF 或图片")
    }
    if (uploaded.size <= 0 || uploaded.size > MAX_ATTACHMENT_BYTES) {
      throw new Error("报销附件不能超过 20MB")
    }
    await ctx.db.patch(args.reimbursementId, {
      attachmentStorageId: uploaded.storageId as any,
      attachmentFileName: uploaded.fileName,
      attachmentMimeType: uploaded.mimeType,
      attachmentSize: uploaded.size,
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
    const r2Url = await getR2DownloadUrl(reimbursement.attachmentStorageId)
    if (r2Url) return r2Url
    return await ctx.storage.getUrl(reimbursement.attachmentStorageId as any)
  },
})
