import { NextResponse } from "next/server"

import type { OADocumentTemplateManifest } from "@/lib/oa-document-templates"
import { bearerSessionToken, noStoreHeaders, processingAccess } from "@/lib/server/oa-document-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request, context: { params: Promise<{ versionId: string }> }) {
  try {
    const sessionToken = bearerSessionToken(request)
    if (!sessionToken) return NextResponse.json({ ok: false, message: "请先登录" }, { status: 401, headers: noStoreHeaders() })
    const { versionId } = await context.params
    const access = await processingAccess(sessionToken, versionId)
    const manifest = access.manifest as OADocumentTemplateManifest
    // Structural preview only: never return the signed source URL or storage identifiers.
    return NextResponse.json({
      ok: true,
      versionId,
      sourceFileName: access.sourceFileName,
      regions: (manifest?.suggestions || []).map((suggestion) => ({
        id: suggestion.id,
        partName: suggestion.partName,
        path: suggestion.path,
        kind: suggestion.kind,
        label: suggestion.label,
        confidence: suggestion.confidence,
        reviewState: suggestion.reviewState,
        evidence: suggestion.evidence,
      })),
    }, { headers: noStoreHeaders() })
  } catch {
    return NextResponse.json({ ok: false, message: "Word 模板预览失败" }, { status: 500, headers: noStoreHeaders() })
  }
}
