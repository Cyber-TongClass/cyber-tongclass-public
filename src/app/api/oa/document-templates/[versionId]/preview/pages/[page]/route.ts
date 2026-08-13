import { NextResponse } from "next/server"

import { bearerSessionToken, fetchAuthorizedBytes, noStoreHeaders, processingAccess } from "@/lib/server/oa-document-access"
import { OA_PREVIEW_ANALYZER_VERSION, readOAPreviewBundle } from "@/lib/server/oa-preview-bundle"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_PREVIEW_BYTES = 100 * 1024 * 1024 - 1

class PreviewPageRouteError extends Error {
  constructor(readonly code: string, message: string, readonly status: 401 | 404 | 409 | 422) { super(message) }
}

function failure(error: unknown) {
  if (error instanceof PreviewPageRouteError) {
    return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status, headers: noStoreHeaders() })
  }
  const message = error instanceof Error ? error.message : ""
  if (/登录已过期|账号不可用|请先登录/.test(message)) return NextResponse.json({ ok: false, code: "AUTH_REQUIRED", message: "登录已过期，请重新登录" }, { status: 401, headers: noStoreHeaders() })
  if (/无权|不存在/.test(message)) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "模板不存在或无权访问" }, { status: 404, headers: noStoreHeaders() })
  if (/预览|bundle|哈希|授权文件|ZIP|PDF|PNG|layout/.test(message)) return NextResponse.json({ ok: false, code: "PREVIEW_UNAVAILABLE", message: "文档预览尚不可用，请重新分析" }, { status: 409, headers: noStoreHeaders() })
  return NextResponse.json({ ok: false, code: "OA_DOCUMENT_ERROR", message: "Word 模板页面加载失败" }, { status: 500, headers: noStoreHeaders() })
}

export async function GET(request: Request, context: { params: Promise<{ versionId: string; page: string }> }) {
  try {
    const sessionToken = bearerSessionToken(request)
    if (!sessionToken) throw new PreviewPageRouteError("AUTH_REQUIRED", "请先登录", 401)
    const { versionId, page: pageValue } = await context.params
    if (!versionId) throw new PreviewPageRouteError("INVALID_VERSION", "模板版本无效", 422)
    const page = Number(pageValue)
    if (!Number.isSafeInteger(page) || page < 1 || page > 100) throw new PreviewPageRouteError("INVALID_PAGE", "预览页码无效", 422)
    const access = await processingAccess(sessionToken, versionId)
    if (!access.previewUrl) throw new PreviewPageRouteError("PREVIEW_UNAVAILABLE", "文档预览尚不可用，请先分析", 409)
    const bundle = readOAPreviewBundle(await fetchAuthorizedBytes(access.previewUrl, MAX_PREVIEW_BYTES), access.sourceSha256)
    if (bundle.layout.analyzerVersion !== OA_PREVIEW_ANALYZER_VERSION) throw new PreviewPageRouteError("REANALYSIS_REQUIRED", "预览分析器版本已更新，请重新分析", 409)
    const bytes = bundle.pages[page - 1]
    if (!bytes) throw new PreviewPageRouteError("PAGE_NOT_FOUND", "预览页面不存在", 404)
    const body = Uint8Array.from(bytes).buffer
    return new NextResponse(body, {
      status: 200,
      headers: noStoreHeaders({
        "content-type": "image/png",
        "content-length": String(bytes.byteLength),
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      }),
    })
  } catch (error) {
    return failure(error)
  }
}
