import { NextResponse } from "next/server"

import type { OADocumentTemplateManifest } from "@/lib/oa-document-templates"
import { bearerSessionToken, fetchAuthorizedBytes, noStoreHeaders, processingAccess } from "@/lib/server/oa-document-access"
import { OA_PREVIEW_ANALYZER_VERSION, readOAPreviewBundle } from "@/lib/server/oa-preview-bundle"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_PREVIEW_BYTES = 100 * 1024 * 1024 - 1

class PreviewRouteError extends Error {
  constructor(readonly code: string, message: string, readonly status: 401 | 404 | 409 | 422) { super(message) }
}

function failure(error: unknown) {
  if (error instanceof PreviewRouteError) {
    return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status, headers: noStoreHeaders() })
  }
  const message = error instanceof Error ? error.message : ""
  if (/登录已过期|账号不可用|请先登录/.test(message)) return NextResponse.json({ ok: false, code: "AUTH_REQUIRED", message: "登录已过期，请重新登录" }, { status: 401, headers: noStoreHeaders() })
  if (/无权|不存在/.test(message)) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "模板不存在或无权访问" }, { status: 404, headers: noStoreHeaders() })
  if (/预览|bundle|哈希|授权文件|ZIP|PDF|PNG|layout/.test(message)) return NextResponse.json({ ok: false, code: "PREVIEW_UNAVAILABLE", message: "文档预览尚不可用，请重新分析" }, { status: 409, headers: noStoreHeaders() })
  return NextResponse.json({ ok: false, code: "OA_DOCUMENT_ERROR", message: "Word 模板预览失败" }, { status: 500, headers: noStoreHeaders() })
}

export async function GET(request: Request, context: { params: Promise<{ versionId: string }> }) {
  try {
    const sessionToken = bearerSessionToken(request)
    if (!sessionToken) throw new PreviewRouteError("AUTH_REQUIRED", "请先登录", 401)
    const { versionId } = await context.params
    if (!versionId) throw new PreviewRouteError("INVALID_VERSION", "模板版本无效", 422)
    const access = await processingAccess(sessionToken, versionId)
    if (!access.previewUrl) throw new PreviewRouteError("PREVIEW_UNAVAILABLE", "文档预览尚不可用，请先分析", 409)
    const bundle = readOAPreviewBundle(await fetchAuthorizedBytes(access.previewUrl, MAX_PREVIEW_BYTES), access.sourceSha256)
    if (bundle.layout.analyzerVersion !== OA_PREVIEW_ANALYZER_VERSION) throw new PreviewRouteError("REANALYSIS_REQUIRED", "预览分析器版本已更新，请重新分析", 409)
    const manifest = access.manifest as OADocumentTemplateManifest
    return NextResponse.json({
      ok: true,
      versionId,
      sourceFileName: access.sourceFileName,
      pageCount: bundle.layout.pages.length,
      pages: bundle.layout.pages.map((page) => ({ ...page, imageUrl: `/api/oa/document-templates/${encodeURIComponent(versionId)}/preview/pages/${page.page}` })),
      suggestions: (manifest?.suggestions || []).map((suggestion) => ({
        id: suggestion.id,
        kind: suggestion.kind,
        label: suggestion.label,
        inferredAnswerType: suggestion.inferredAnswerType,
        confidence: suggestion.confidence,
        reviewState: suggestion.reviewState,
        evidence: suggestion.evidence,
        conflictIds: suggestion.conflictIds,
        fieldId: suggestion.fieldId,
        required: suggestion.required,
        maxLength: suggestion.maxLength,
        options: suggestion.options,
        visual: suggestion.visual,
        bindingCandidateIds: suggestion.bindingCandidateIds,
      })),
      candidates: bundle.layout.candidates.map((candidate) => ({
        id: candidate.id,
        label: candidate.label,
        description: candidate.description,
        writeTarget: candidate.writeTarget,
        visual: candidate.visual,
      })),
    }, { headers: noStoreHeaders() })
  } catch (error) {
    return failure(error)
  }
}
