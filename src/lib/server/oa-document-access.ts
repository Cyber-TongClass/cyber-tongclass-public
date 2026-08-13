import { createHash } from "node:crypto"
import { makeFunctionReference } from "convex/server"

import { OA_DOCUMENT_LIMITS } from "@/lib/oa-document-templates"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { getOADocumentServiceToken } from "@/lib/server/oa-document-service-token"

const getProcessingAccessRef = makeFunctionReference<"query">("oaDocumentTemplates:getProcessingAccess")
const getExportAccessRef = makeFunctionReference<"query">("oaDocumentTemplates:getExportAccess")
const generateDerivedUploadUrlRef = makeFunctionReference<"mutation">("oaDocumentTemplates:generateDerivedUploadUrl")
const saveAnalysisRef = makeFunctionReference<"mutation">("oaDocumentTemplates:saveAnalysis")
const activateCompiledVersionRef = makeFunctionReference<"mutation">("oaDocumentTemplates:activateCompiledVersion")

export interface ProcessingAccess {
  versionId: string
  formId: string
  sourceUrl: string | null
  sourceType: "doc" | "docx"
  sourceSha256: string
  sourceSize: number
  sourceFileName: string
  manifest: unknown
  workingUrl: string | null
  previewUrl: string | null
  warnings?: unknown[]
  capabilities?: unknown
}

export interface DerivedUploadTarget {
  storageId: string
  uploadUrl: string
  method: "PUT"
  headers: Record<string, string>
}

export function bearerSessionToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || ""
}

export function assertSmallJsonRequest(request: Request, maximum = 64 * 1024) {
  const declared = Number(request.headers.get("content-length") || 0)
  if (Number.isFinite(declared) && declared > maximum) throw new Error("请求内容过大")
}

export async function parseBoundedJson(request: Request, maximum = 64 * 1024): Promise<unknown> {
  assertSmallJsonRequest(request, maximum)
  if (!request.body) throw new Error("请求内容为空")
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maximum) {
      await reader.cancel()
      throw new Error("请求内容过大")
    }
    chunks.push(value)
  }
  try {
    return JSON.parse(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), size).toString("utf8"))
  } catch {
    throw new Error("请求 JSON 无效")
  }
}

export async function processingAccess(sessionToken: string, versionId: string) {
  if (!sessionToken) throw new Error("请先登录")
  const access = await getConvexHttpClient().query(getProcessingAccessRef, {
    serviceToken: getOADocumentServiceToken(),
    sessionToken,
    versionId: versionId as never,
  } as never) as ProcessingAccess | null
  if (!access || access.versionId !== versionId) throw new Error("无权处理该 Word 模板")
  return access
}

export async function exportAccess(sessionToken: string, submissionId: string, batch = false) {
  if (!sessionToken) throw new Error("请先登录")
  const access = await getConvexHttpClient().query(getExportAccessRef, {
    serviceToken: getOADocumentServiceToken(),
    sessionToken,
    submissionId: submissionId as never,
    batch,
  } as never) as any
  if (!access) throw new Error("无权导出该申请")
  return access
}

function assertAuthorizedObjectUrl(value: string) {
  const parsed = new URL(value)
  const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1"
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && local)) throw new Error("授权文件地址无效")
  if (parsed.username || parsed.password) throw new Error("授权文件地址无效")
  return parsed.toString()
}

export async function fetchAuthorizedBytes(url: string | null, maximumBytes = OA_DOCUMENT_LIMITS.maxSourceBytes) {
  if (!url) throw new Error("授权文件暂不可用")
  const response = await fetch(assertAuthorizedObjectUrl(url), { cache: "no-store", redirect: "error" })
  if (!response.ok) throw new Error("读取授权文件失败")
  const declared = Number(response.headers.get("content-length") || 0)
  if (declared > maximumBytes) throw new Error("授权文件超过大小限制")
  if (!response.body) throw new Error("授权文件内容为空")
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maximumBytes) {
      await reader.cancel()
      throw new Error("授权文件超过大小限制")
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), size)
}

export function verifyAuthorizedSource(bytes: Uint8Array, access: Pick<ProcessingAccess, "sourceSize" | "sourceSha256">) {
  if (bytes.byteLength !== access.sourceSize) throw new Error("Word 源文件大小校验失败")
  const digest = createHash("sha256").update(bytes).digest("hex")
  if (!/^[a-f0-9]{64}$/i.test(access.sourceSha256) || digest.toLowerCase() !== access.sourceSha256.toLowerCase()) {
    throw new Error("Word 源文件哈希校验失败")
  }
}

export async function createDerivedTarget(sessionToken: string, formId: string, fileName: string, mimeType: string) {
  const target = await getConvexHttpClient().mutation(generateDerivedUploadUrlRef, {
    serviceToken: getOADocumentServiceToken(),
    sessionToken,
    formId: formId as never,
    fileName,
    mimeType,
  } as never) as DerivedUploadTarget
  if (!target?.storageId?.startsWith("r2:") || !target.uploadUrl) throw new Error("派生文件存储未就绪")
  return target
}

export async function uploadDerivedBytes(target: DerivedUploadTarget, bytes: Uint8Array | Buffer) {
  const response = await fetch(assertAuthorizedObjectUrl(target.uploadUrl), {
    method: "PUT",
    headers: target.headers,
    body: Buffer.from(bytes),
    redirect: "error",
  })
  if (!response.ok) throw new Error("保存 Word 派生文件失败")
  return target.storageId
}

export async function persistAnalysis(args: {
  sessionToken: string
  versionId: string
  manifest: unknown
  warnings: unknown[]
  capabilities: unknown
  workingStorageId?: string
  previewStorageId?: string
}) {
  await getConvexHttpClient().mutation(saveAnalysisRef, {
    ...args,
    serviceToken: getOADocumentServiceToken(),
    versionId: args.versionId as never,
  } as never)
}

export async function activateCompiled(args: { sessionToken: string; versionId: string; compiledStorageId: string; manifest: unknown }) {
  await getConvexHttpClient().mutation(activateCompiledVersionRef, {
    ...args,
    serviceToken: getOADocumentServiceToken(),
    versionId: args.versionId as never,
  } as never)
}

export function noStoreHeaders(extra: HeadersInit = {}) {
  return { "cache-control": "no-store", "x-content-type-options": "nosniff", ...Object.fromEntries(new Headers(extra)) }
}

export function rfc5987Attachment(fileName: string) {
  return `attachment; filename*=UTF-8''${encodeURIComponent(fileName).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)}`
}
