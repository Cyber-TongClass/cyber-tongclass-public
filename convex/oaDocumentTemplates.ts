import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

import {
  createR2UploadTarget,
  getR2DownloadUrl,
  r2StorageIdMatches,
} from "./lib/r2"
import { getUserBySession } from "./reviewer/lib"

const sourceType = v.union(v.literal("doc"), v.literal("docx"))

async function requireManagedForm(ctx: any, sessionToken: string, formId: any) {
  const actor = await getUserBySession(ctx, sessionToken)
  const form = await ctx.db.get(formId)
  if (!form) throw new Error("表单不存在")
  const canManage = actor.role === "super_admin"
    || String(form.createdBy) === String(actor._id)
  if (!canManage) {
    throw new Error("无权管理该 Word 模板")
  }
  return { actor, form }
}

function unresolvedCount(manifest: any) {
  const suggestions = Array.isArray(manifest?.suggestions) ? manifest.suggestions : []
  return suggestions.filter((item: any) => (
    item?.reviewState === "unresolved"
    || item?.reviewState === "conflict"
    || item?.status === "unresolved"
    || item?.status === "conflict"
    || (Array.isArray(item?.conflictIds) && item.conflictIds.length > 0)
  )).length
}

export const generateSourceUploadUrl = mutation({
  args: {
    sessionToken: v.string(),
    formId: v.id("oaForms"),
    fileName: v.string(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const { actor } = await requireManagedForm(ctx, args.sessionToken, args.formId)
    const target = await createR2UploadTarget({
      purpose: "oa-form-template",
      ownerId: String(actor._id),
      fileName: args.fileName,
      contentType: args.mimeType,
    })
    if (target) return target
    return await ctx.storage.generateUploadUrl()
  },
})

export const generateDerivedUploadUrl = mutation({
  args: {
    sessionToken: v.string(),
    formId: v.id("oaForms"),
    fileName: v.string(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const { actor } = await requireManagedForm(ctx, args.sessionToken, args.formId)
    const target = await createR2UploadTarget({
      purpose: "oa-form-template-derived",
      ownerId: String(actor._id),
      fileName: args.fileName,
      contentType: args.mimeType,
    })
    if (!target) throw new Error("Word 派生文件需要配置对象存储")
    return target
  },
})

export const createOrGetVersion = mutation({
  args: {
    sessionToken: v.string(),
    formId: v.id("oaForms"),
    sourceType,
    sourceFileName: v.string(),
    sourceMimeType: v.string(),
    sourceSize: v.number(),
    sourceSha256: v.string(),
    sourceStorageId: v.string(),
    compilerVersion: v.string(),
    syntaxVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const { actor } = await requireManagedForm(ctx, args.sessionToken, args.formId)
    if (args.sourceSize <= 0 || args.sourceSize > 25 * 1024 * 1024) {
      throw new Error("Word 模板文件大小无效")
    }
    if (args.sourceStorageId.startsWith("r2:") && !r2StorageIdMatches(args.sourceStorageId, {
      ownerId: String(actor._id),
      purpose: "oa-form-template",
    })) throw new Error("模板文件归属无效")

    const naturalKey = `${String(args.formId)}:${args.sourceSha256}:${args.compilerVersion}`
    const existing = await ctx.db
      .query("oaDocumentTemplateVersions")
      .withIndex("by_naturalKey", (index: any) => index.eq("naturalKey", naturalKey))
      .unique()
    if (existing) return existing._id

    const versions = await ctx.db
      .query("oaDocumentTemplateVersions")
      .withIndex("by_form_version", (index: any) => index.eq("formId", args.formId))
      .collect()
    const version = versions.reduce((maximum: number, row: any) => Math.max(maximum, row.version), 0) + 1
    const now = Date.now()
    return ctx.db.insert("oaDocumentTemplateVersions", {
      formId: args.formId,
      version,
      naturalKey,
      sourceType: args.sourceType,
      sourceFileName: args.sourceFileName,
      sourceMimeType: args.sourceMimeType,
      sourceSize: args.sourceSize,
      sourceSha256: args.sourceSha256,
      sourceStorageId: args.sourceStorageId,
      compilerVersion: args.compilerVersion,
      syntaxVersion: args.syntaxVersion,
      status: "uploaded",
      manifest: { suggestions: [], anchors: [] },
      warnings: [],
      capabilities: {},
      createdBy: actor._id,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const getManageVersion = query({
  args: { sessionToken: v.string(), versionId: v.id("oaDocumentTemplateVersions") },
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId)
    if (!version) return null
    await requireManagedForm(ctx, args.sessionToken, version.formId)
    return version
  },
})

export const saveAnalysis = mutation({
  args: {
    sessionToken: v.string(),
    versionId: v.id("oaDocumentTemplateVersions"),
    manifest: v.any(),
    warnings: v.array(v.any()),
    capabilities: v.any(),
    workingStorageId: v.optional(v.string()),
    previewStorageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId)
    if (!version) throw new Error("模板版本不存在")
    await requireManagedForm(ctx, args.sessionToken, version.formId)
    if (version.status === "compiled" || version.status === "archived") {
      throw new Error("不可修改已编译或已归档模板")
    }
    await ctx.db.patch(args.versionId, {
      manifest: args.manifest,
      warnings: args.warnings,
      capabilities: args.capabilities,
      workingStorageId: args.workingStorageId,
      previewStorageId: args.previewStorageId,
      status: unresolvedCount(args.manifest) === 0 ? "reviewed" : "analyzed",
      updatedAt: Date.now(),
    })
  },
})

export const activateCompiledVersion = mutation({
  args: {
    sessionToken: v.string(),
    versionId: v.id("oaDocumentTemplateVersions"),
    compiledStorageId: v.string(),
    manifest: v.any(),
  },
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId)
    if (!version) throw new Error("模板版本不存在")
    const { actor } = await requireManagedForm(ctx, args.sessionToken, version.formId)
    if (unresolvedCount(args.manifest) > 0) throw new Error("仍有未确认或冲突字段")
    if (args.compiledStorageId.startsWith("r2:") && !r2StorageIdMatches(args.compiledStorageId, {
      ownerId: String(actor._id),
      purpose: "oa-form-template-derived",
    })) throw new Error("编译文件归属无效")
    const now = Date.now()
    await ctx.db.patch(args.versionId, {
      compiledStorageId: args.compiledStorageId,
      manifest: args.manifest,
      status: "compiled",
      updatedAt: now,
    })
    await ctx.db.patch(version.formId, {
      activeDocumentTemplateVersionId: args.versionId,
      updatedBy: actor._id,
      updatedAt: now,
    })
  },
})

export const getProcessingAccess = query({
  args: { sessionToken: v.string(), versionId: v.id("oaDocumentTemplateVersions") },
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId)
    if (!version) return null
    await requireManagedForm(ctx, args.sessionToken, version.formId)
    const sourceUrl = await getR2DownloadUrl(version.sourceStorageId)
      || (version.sourceStorageId.startsWith("r2:") ? null : await ctx.storage.getUrl(version.sourceStorageId))
    return {
      versionId: String(version._id),
      formId: String(version.formId),
      sourceUrl,
      sourceType: version.sourceType,
      sourceSha256: version.sourceSha256,
      sourceSize: version.sourceSize,
      sourceFileName: version.sourceFileName,
      manifest: version.manifest,
    }
  },
})

export const getExportAccess = query({
  args: {
    sessionToken: v.string(),
    submissionId: v.id("oaFormSubmissions"),
    batch: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const submission = await ctx.db.get(args.submissionId)
    if (!submission) return null
    const form = await ctx.db.get(submission.formId)
    if (!form) return null
    const isManager = actor.role === "super_admin"
      || String(form.createdBy) === String(actor._id)
    if (args.batch && !isManager) throw new Error("批量导出需要表单管理权限")
    if (!isManager && String(submission.submitterId) !== String(actor._id)) {
      throw new Error("无权导出该提交")
    }
    const versionId = submission.documentTemplateVersionId
    if (!versionId) return { submission, form, version: null }
    const version = await ctx.db.get(versionId)
    if (!version) return { submission, form, version: null }
    const compiledStorageId = version.compiledStorageId || version.workingStorageId || version.sourceStorageId
    const compiledUrl = await getR2DownloadUrl(compiledStorageId)
      || (compiledStorageId.startsWith("r2:") ? null : await ctx.storage.getUrl(compiledStorageId))
    const sourceUrl = await getR2DownloadUrl(version.sourceStorageId)
      || (version.sourceStorageId.startsWith("r2:") ? null : await ctx.storage.getUrl(version.sourceStorageId))
    return { submission, form, version, compiledUrl, sourceUrl }
  },
})
