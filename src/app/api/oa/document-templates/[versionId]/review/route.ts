import { NextResponse } from "next/server"

import { validateTemplateManifest, type OADocumentTemplateManifest } from "@/lib/oa-document-templates"
import {
  bearerSessionToken,
  fetchAuthorizedBytes,
  noStoreHeaders,
  parseBoundedJson,
  persistAnalysis,
  processingAccess,
} from "@/lib/server/oa-document-access"
import { buildReviewedManifest, OADocumentReviewError, parseReviewEdits } from "@/lib/server/oa-document-review"
import { OA_PREVIEW_ANALYZER_VERSION, readOAPreviewBundle } from "@/lib/server/oa-preview-bundle"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_PREVIEW_BYTES = 100 * 1024 * 1024 - 1
const MAX_REVIEW_BYTES = 512 * 1024

class ReviewRouteError extends Error {
  constructor(readonly code: string, message: string, readonly status: 401 | 404 | 409 | 422) { super(message) }
}

function failure(error: unknown) {
  if (error instanceof OADocumentReviewError && error.code === "BINDING_REQUIRED") {
    return NextResponse.json({ ok: false, code: "BINDING_REQUIRED", message: error.message }, { status: 409, headers: noStoreHeaders() })
  }
  if (error instanceof OADocumentReviewError || error instanceof ReviewRouteError) {
    return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status, headers: noStoreHeaders() })
  }
  const message = error instanceof Error ? error.message : ""
  if (/登录已过期|账号不可用|请先登录/.test(message)) return NextResponse.json({ ok: false, code: "AUTH_REQUIRED", message: "登录已过期，请重新登录" }, { status: 401, headers: noStoreHeaders() })
  if (/无权|不存在/.test(message)) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "模板不存在或无权访问" }, { status: 404, headers: noStoreHeaders() })
  if (/候选 ID 重复/.test(message)) return NextResponse.json({ ok: false, code: "BINDING_CONFLICT", message }, { status: 409, headers: noStoreHeaders() })
  if (/预览|bundle|哈希|授权文件|ZIP|PDF|PNG|layout/.test(message)) return NextResponse.json({ ok: false, code: "PREVIEW_UNAVAILABLE", message: "文档预览尚不可用，请重新分析" }, { status: 409, headers: noStoreHeaders() })
  if (/请求内容过大|JSON|无效/.test(message)) return NextResponse.json({ ok: false, code: "INVALID_REVIEW", message: "审核请求无效" }, { status: 422, headers: noStoreHeaders() })
  return NextResponse.json({ ok: false, code: "OA_DOCUMENT_ERROR", message: "Word 模板审核保存失败" }, { status: 500, headers: noStoreHeaders() })
}

export async function POST(request: Request, context: { params: Promise<{ versionId: string }> }) {
  try {
    const sessionToken = bearerSessionToken(request)
    if (!sessionToken) throw new ReviewRouteError("AUTH_REQUIRED", "请先登录", 401)
    const { versionId } = await context.params
    if (!versionId) throw new ReviewRouteError("INVALID_VERSION", "模板版本无效", 422)
    const edits = parseReviewEdits(await parseBoundedJson(request, MAX_REVIEW_BYTES))
    const access = await processingAccess(sessionToken, versionId)
    if (!access.previewUrl) throw new ReviewRouteError("PREVIEW_UNAVAILABLE", "文档预览尚不可用，请先分析", 409)
    const bundle = readOAPreviewBundle(await fetchAuthorizedBytes(access.previewUrl, MAX_PREVIEW_BYTES), access.sourceSha256)
    if (bundle.layout.analyzerVersion !== OA_PREVIEW_ANALYZER_VERSION) throw new ReviewRouteError("REANALYSIS_REQUIRED", "预览分析器版本已更新，请重新分析", 409)
    const manifest = validateTemplateManifest(buildReviewedManifest(access.manifest as OADocumentTemplateManifest, bundle.layout, edits))
    await persistAnalysis({
      sessionToken,
      versionId,
      manifest,
      warnings: access.warnings || [],
      capabilities: access.capabilities || {},
    })
    return NextResponse.json({ ok: true, manifest }, { headers: noStoreHeaders() })
  } catch (error) {
    return failure(error)
  }
}
