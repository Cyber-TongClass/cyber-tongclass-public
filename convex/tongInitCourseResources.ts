import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"
import {
  copyR2ObjectToNewKey,
  createR2UploadTarget,
  getR2DownloadUrl,
  headR2Object,
  r2StorageIdMatches,
} from "./lib/r2"
import {
  createTongInitCourseContentDisposition,
  getTongInitCourseFilePolicy,
  getTongInitCourseMetadataTarget,
  getTongInitCourseUploadTtlSeconds,
  shouldDeleteTongInitCourseDraftRecord,
  tongAiResearchCourseResources,
  validateTongInitCourseFile,
} from "../src/lib/resources/tong-init-course"

const kindValidator = v.union(
  v.literal("slides"),
  v.literal("exercise"),
  v.literal("supplement")
)

const metadataArgs = {
  title: v.string(),
  description: v.optional(v.string()),
  kind: kindValidator,
  lectureNumber: v.optional(v.number()),
  sortOrder: v.number(),
}

const sha256Hex = async (input: string) => {
  const cryptoImpl = (globalThis as any).crypto || (global as any).crypto
  const encoded = new TextEncoder().encode(input)
  const digest = await cryptoImpl.subtle.digest("SHA-256", encoded)
  return Array.from(new Uint8Array(digest)).map((byte: number) => byte.toString(16).padStart(2, "0")).join("")
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

async function requireAdmin(ctx: any, sessionToken?: string) {
  const user = await getUserBySession(ctx, sessionToken)
  if (user.role !== "admin" && user.role !== "super_admin") {
    throw new Error("需要管理员权限")
  }
  return user
}

function normalizeResourceKey(value: string) {
  const resourceKey = String(value || "").trim().toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(resourceKey) || resourceKey.length > 80) {
    throw new Error("资源标识只能包含小写字母、数字和连字符，且不能超过 80 个字符")
  }
  return resourceKey
}

function normalizeMetadata(args: {
  title: string
  description?: string
  kind: "slides" | "exercise" | "supplement"
  lectureNumber?: number
  sortOrder: number
}) {
  const title = String(args.title || "").trim()
  const description = String(args.description || "").trim() || undefined
  if (!title) throw new Error("请填写资源标题")
  if (title.length > 120) throw new Error("资源标题不能超过 120 个字符")
  if (description && description.length > 500) throw new Error("资源说明不能超过 500 个字符")
  const sortOrder = Number(args.sortOrder)
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 99999) {
    throw new Error("排序必须是 0 到 99999 之间的整数")
  }
  const lectureNumber = args.lectureNumber === undefined ? undefined : Number(args.lectureNumber)
  if (lectureNumber !== undefined && (!Number.isInteger(lectureNumber) || lectureNumber < 0 || lectureNumber > 999)) {
    throw new Error("讲次必须是 0 到 999 之间的整数")
  }
  return { title, description, kind: args.kind, lectureNumber, sortOrder }
}

function assertRevision(resource: any, expectedRevision?: number) {
  if (expectedRevision !== undefined && resource.revision !== expectedRevision) {
    throw new Error("资源已被其他管理员更新，请刷新后重试")
  }
}

/** 排序：先按讲次（lectureNumber，缺省排最后）→ 再按 sortOrder → 最后按标题字典序。 */
function compareTongInitCourseResource(left: { lectureNumber?: number; sortOrder: number; title: string }, right: { lectureNumber?: number; sortOrder: number; title: string }) {
  const leftLecture = left.lectureNumber ?? Number.MAX_SAFE_INTEGER
  const rightLecture = right.lectureNumber ?? Number.MAX_SAFE_INTEGER
  if (leftLecture !== rightLecture) return leftLecture - rightLecture
  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
  return left.title.localeCompare(right.title, "zh-CN")
}

export const listPublicManifest = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("tongInitCourseResources").collect()
    const managedKeys = rows
      .filter((row) => row.status === "archived" || (row.status === "published" && row.published))
      .map((row) => row.resourceKey)
    const resources = rows
      .filter((row) => row.status === "published" && row.published)
      .map((row) => {
        const resource = row.published!
        return {
          id: String(row._id),
          resourceKey: row.resourceKey,
          title: resource.title,
          description: resource.description,
          kind: resource.kind,
          lectureNumber: resource.lectureNumber,
          sortOrder: resource.sortOrder,
          source: resource.source,
          staticHref: resource.source === "static" ? resource.staticHref : undefined,
          fileName: resource.fileName,
          mimeType: resource.mimeType,
          size: resource.size,
        }
      })
      .sort((left, right) => compareTongInitCourseResource(left, right))
    return { resources, managedKeys }
  },
})

export const adminList = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken)
    return await ctx.db.query("tongInitCourseResources").withIndex("by_updatedAt").order("desc").collect()
  },
})

export const adminBeginUpload = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.optional(v.id("tongInitCourseResources")),
    expectedRevision: v.optional(v.number()),
    resourceKey: v.string(),
    ...metadataArgs,
    fileName: v.string(),
    mimeType: v.optional(v.string()),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken)
    const resourceKey = normalizeResourceKey(args.resourceKey)
    const metadata = normalizeMetadata(args)
    const file = validateTongInitCourseFile(args)
    const existing = args.id ? await ctx.db.get(args.id) : null
    if (args.id && !existing) throw new Error("资源不存在")
    if (existing && existing.resourceKey !== resourceKey) throw new Error("资源标识创建后不能修改")
    const existingByKey = await ctx.db
      .query("tongInitCourseResources")
      .withIndex("by_resourceKey", (q) => q.eq("resourceKey", resourceKey))
      .first()
    if (!existing && existingByKey) throw new Error("该资源标识已存在，请在列表中选择后替换")
    if (existing) assertRevision(existing, args.expectedRevision)

    const uploadTtlSeconds = getTongInitCourseUploadTtlSeconds(file.size)

    const uploadTarget = await createR2UploadTarget({
      purpose: "tong-init-course-resource",
      ownerId: String(admin._id),
      fileName: file.fileName,
      contentType: file.mimeType,
      contentDisposition: createTongInitCourseContentDisposition(file.fileName),
      expiresSeconds: uploadTtlSeconds,
    })
    if (!uploadTarget) throw new Error("课程资源要求使用 R2，请先配置 R2 环境变量")

    const now = Date.now()
    const pendingUpload = {
      storageId: uploadTarget.storageId,
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: file.size,
      ...metadata,
      uploaderId: admin._id,
      startedAt: now,
      expiresAt: now + uploadTtlSeconds * 1000,
    }

    if (existing) {
      const revision = existing.revision + 1
      await ctx.db.patch(existing._id, {
        pendingUpload,
        revision,
        updatedBy: admin._id,
        updatedAt: now,
      })
      return { resourceId: existing._id, revision, uploadTarget, expiresAt: pendingUpload.expiresAt }
    }

    const resourceId = await ctx.db.insert("tongInitCourseResources", {
      resourceKey,
      status: "draft",
      pendingUpload,
      revision: 1,
      createdBy: admin._id,
      updatedBy: admin._id,
      createdAt: now,
      updatedAt: now,
    })
    return { resourceId, revision: 1, uploadTarget, expiresAt: pendingUpload.expiresAt }
  },
})

export const internalGetPendingUpload = internalQuery({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("tongInitCourseResources"),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken)
    const resource = await ctx.db.get(args.id)
    const pending = resource?.pendingUpload
    if (!resource || !pending || pending.storageId !== args.storageId) {
      throw new Error("上传任务已失效，请重新选择文件")
    }
    if (pending.expiresAt <= Date.now()) throw new Error("上传任务已过期，请重新选择文件")
    if (!r2StorageIdMatches(pending.storageId, {
      ownerId: String(pending.uploaderId),
      purpose: "tong-init-course-resource",
    })) {
      throw new Error("R2 上传凭证无效")
    }
    return { pending }
  },
})

export const internalCommitFinalizedUpload = internalMutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("tongInitCourseResources"),
    pendingStorageId: v.string(),
    finalStorageId: v.string(),
    size: v.number(),
    mimeType: v.string(),
    etag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken)
    const resource = await ctx.db.get(args.id)
    const pending = resource?.pendingUpload
    if (!resource || !pending || pending.storageId !== args.pendingStorageId) {
      throw new Error("上传任务已被更新，请刷新后重试")
    }
    if (pending.expiresAt <= Date.now()) throw new Error("上传任务已过期，请重新选择文件")
    if (!r2StorageIdMatches(args.finalStorageId, {
      ownerId: String(pending.uploaderId),
      purpose: "tong-init-course-resource-final",
    })) {
      throw new Error("R2 固化文件凭证无效")
    }
    const now = Date.now()
    await ctx.db.patch(resource._id, {
      draft: {
        title: pending.title,
        description: pending.description,
        kind: pending.kind,
        lectureNumber: pending.lectureNumber,
        sortOrder: pending.sortOrder,
        source: "r2",
        storageId: args.finalStorageId,
        fileName: pending.fileName,
        mimeType: args.mimeType,
        size: args.size,
        etag: args.etag,
        uploadedBy: pending.uploaderId,
        uploadedAt: now,
      },
      pendingUpload: undefined,
      revision: resource.revision + 1,
      updatedBy: admin._id,
      updatedAt: now,
    })
    return resource._id
  },
})

export const adminFinalizeUpload = action({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("tongInitCourseResources"),
    storageId: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    const state = await ctx.runQuery((internal as any).tongInitCourseResources.internalGetPendingUpload, args)
    const stagingMetadata = await headR2Object(args.storageId)
    if (stagingMetadata.size !== state.pending.size) throw new Error("R2 文件大小与上传前不一致，请重新上传")
    if (stagingMetadata.mimeType !== state.pending.mimeType) throw new Error("R2 文件类型与上传前不一致，请重新上传")
    if (!stagingMetadata.etag) throw new Error("R2 未返回文件校验标识，请重新上传")

    const finalStorageId = await copyR2ObjectToNewKey({
      sourceStorageId: args.storageId,
      sourcePurpose: "tong-init-course-resource",
      destinationPurpose: "tong-init-course-resource-final",
      ownerId: String(state.pending.uploaderId),
      fileName: state.pending.fileName,
      sourceEtag: stagingMetadata.etag,
    })
    const finalMetadata = await headR2Object(finalStorageId)
    if (finalMetadata.size !== state.pending.size || finalMetadata.mimeType !== state.pending.mimeType) {
      throw new Error("R2 固化文件校验失败，请重新上传")
    }
    return await ctx.runMutation((internal as any).tongInitCourseResources.internalCommitFinalizedUpload, {
      sessionToken: args.sessionToken,
      id: args.id,
      pendingStorageId: args.storageId,
      finalStorageId,
      size: finalMetadata.size,
      mimeType: finalMetadata.mimeType,
      etag: finalMetadata.etag,
    })
  },
})

export const adminSaveDraftMetadata = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("tongInitCourseResources"),
    expectedRevision: v.optional(v.number()),
    ...metadataArgs,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken)
    const resource = await ctx.db.get(args.id)
    if (!resource) throw new Error("资源不存在")
    assertRevision(resource, args.expectedRevision)
    const metadata = normalizeMetadata(args)
    const now = Date.now()
    const metadataTarget = getTongInitCourseMetadataTarget(resource)
    if (metadataTarget === "pendingUpload" && resource.pendingUpload) {
      await ctx.db.patch(resource._id, {
        pendingUpload: { ...resource.pendingUpload, ...metadata },
        revision: resource.revision + 1,
        updatedBy: admin._id,
        updatedAt: now,
      })
      return resource._id
    }
    if (!metadataTarget) throw new Error("请先上传文件")
    const base = resource.draft || resource.published
    if (!base) throw new Error("资源状态无效，请刷新后重试")
    await ctx.db.patch(resource._id, {
      draft: { ...base, ...metadata },
      revision: resource.revision + 1,
      updatedBy: admin._id,
      updatedAt: now,
    })
    return resource._id
  },
})

export const adminPublish = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("tongInitCourseResources"),
    expectedRevision: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken)
    const resource = await ctx.db.get(args.id)
    if (!resource) throw new Error("资源不存在")
    assertRevision(resource, args.expectedRevision)
    if (!resource.draft) throw new Error("没有待发布的草稿")
    const now = Date.now()
    await ctx.db.patch(resource._id, {
      published: resource.draft,
      draft: undefined,
      status: "published",
      revision: resource.revision + 1,
      updatedBy: admin._id,
      updatedAt: now,
      publishedAt: now,
      archivedAt: undefined,
    })
    return resource._id
  },
})

export const adminSetArchived = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("tongInitCourseResources"),
    archived: v.boolean(),
    expectedRevision: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken)
    const resource = await ctx.db.get(args.id)
    if (!resource) throw new Error("资源不存在")
    assertRevision(resource, args.expectedRevision)
    const now = Date.now()
    await ctx.db.patch(resource._id, {
      status: args.archived ? "archived" : resource.published ? "published" : "draft",
      archivedAt: args.archived ? now : undefined,
      revision: resource.revision + 1,
      updatedBy: admin._id,
      updatedAt: now,
    })
    return resource._id
  },
})

export const adminDiscardDraft = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("tongInitCourseResources"),
    expectedRevision: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken)
    const resource = await ctx.db.get(args.id)
    if (!resource) throw new Error("资源不存在")
    assertRevision(resource, args.expectedRevision)
    if (shouldDeleteTongInitCourseDraftRecord(resource)) {
      await ctx.db.delete(resource._id)
      return { id: resource._id, removed: true }
    }
    const now = Date.now()
    await ctx.db.patch(resource._id, {
      draft: undefined,
      pendingUpload: undefined,
      revision: resource.revision + 1,
      updatedBy: admin._id,
      updatedAt: now,
    })
    return { id: resource._id, removed: false }
  },
})

export const adminCancelUpload = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("tongInitCourseResources"),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken)
    const resource = await ctx.db.get(args.id)
    const pending = resource?.pendingUpload
    if (!resource || !pending || pending.storageId !== args.storageId) {
      return { id: args.id, removed: false, cancelled: false }
    }
    if (!resource.published && !resource.draft && resource.status !== "archived") {
      await ctx.db.delete(resource._id)
      return { id: resource._id, removed: true, cancelled: true }
    }
    const now = Date.now()
    await ctx.db.patch(resource._id, {
      pendingUpload: undefined,
      revision: resource.revision + 1,
      updatedBy: admin._id,
      updatedAt: now,
    })
    return { id: resource._id, removed: false, cancelled: true }
  },
})

export const adminSeedLegacyResources = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken)
    const now = Date.now()
    const insertedKeys: string[] = []
    const skippedKeys: string[] = []
    for (const legacyResource of tongAiResearchCourseResources) {
      const existing = await ctx.db
        .query("tongInitCourseResources")
        .withIndex("by_resourceKey", (q) => q.eq("resourceKey", legacyResource.resourceKey))
        .first()
      if (existing) {
        skippedKeys.push(legacyResource.resourceKey)
        continue
      }
      const fileName = legacyResource.fileName || legacyResource.href.split("/").pop() || "resource.pdf"
      const mimeType = getTongInitCourseFilePolicy(fileName).policy.mimeType
      await ctx.db.insert("tongInitCourseResources", {
        resourceKey: legacyResource.resourceKey,
        status: "published",
        published: {
          title: legacyResource.title,
          description: legacyResource.description,
          kind: legacyResource.kind,
          lectureNumber: legacyResource.lectureNumber,
          sortOrder: legacyResource.sortOrder,
          source: "static",
          staticHref: legacyResource.href,
          fileName,
          mimeType,
          uploadedAt: now,
        },
        revision: 1,
        createdBy: admin._id,
        updatedBy: admin._id,
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
      })
      insertedKeys.push(legacyResource.resourceKey)
    }
    return { insertedKeys, skippedKeys }
  },
})

export const internalGetPublishedDownload = internalQuery({
  args: { id: v.id("tongInitCourseResources") },
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.id)
    if (!resource || resource.status !== "published" || !resource.published) return null
    return resource.published
  },
})

export const getDownloadTarget = action({
  args: { id: v.id("tongInitCourseResources") },
  handler: async (ctx, args): Promise<{ url: string; fileName: string } | null> => {
    const resource = await ctx.runQuery((internal as any).tongInitCourseResources.internalGetPublishedDownload, args)
    if (!resource) return null
    if (resource.source === "static") {
      if (!resource.staticHref?.startsWith("/resources/tong-init-course/")) throw new Error("静态资源地址无效")
      return { url: resource.staticHref, fileName: resource.fileName }
    }
    if (!resource.storageId || !r2StorageIdMatches(resource.storageId, { purpose: "tong-init-course-resource-final" })) {
      throw new Error("课程资源存储信息无效")
    }
    const url = await getR2DownloadUrl(resource.storageId)
    if (!url) throw new Error("课程资源下载地址不可用")
    return { url, fileName: resource.fileName }
  },
})
