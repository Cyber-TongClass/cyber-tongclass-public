import { NextResponse } from "next/server"

import { bearerSessionToken, exportAccess, fetchAuthorizedBytes, noStoreHeaders, rfc5987Attachment } from "@/lib/server/oa-document-access"
import { buildSingleDocumentArtifact, assertCompiledTemplate, type AuthorizedExportAccess } from "@/lib/server/oa-form-export"
import { detectOfficeCapabilities } from "@/lib/server/office-capabilities"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function responseBody(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

export async function POST(request: Request, context: { params: Promise<{ submissionId: string }> }) {
  try {
    const body = await request.json().catch(() => ({})) as { sessionToken?: unknown; format?: unknown }
    const sessionToken = bearerSessionToken(request) || (typeof body.sessionToken === "string" ? body.sessionToken.trim() : "")
    const format = body.format === "pdf" || body.format === "doc" ? body.format : "docx"
    if (!sessionToken) return NextResponse.json({ ok: false, message: "请先登录" }, { status: 401, headers: noStoreHeaders() })
    const { submissionId } = await context.params
    // Convex verifies submitter ownership or manager privilege before exposing any submission data or URL.
    const access = await exportAccess(sessionToken, submissionId, false) as AuthorizedExportAccess
    const version = assertCompiledTemplate(access)
    const templateBytes = await fetchAuthorizedBytes(access.compiledUrl || null)
    const capabilities = await detectOfficeCapabilities()
    if (format === "pdf" && !capabilities.canExportPdf) return NextResponse.json({ ok: false, code: "OFFICE_UNAVAILABLE", message: capabilities.unavailableReasons[0] }, { status: 409, headers: noStoreHeaders() })
    if (format === "doc" && !capabilities.canExportLegacyDoc) return NextResponse.json({ ok: false, code: "OFFICE_UNAVAILABLE", message: capabilities.unavailableReasons[0] }, { status: 409, headers: noStoreHeaders() })
    const artifact = await buildSingleDocumentArtifact({ access: { ...access, version }, templateBytes, format, capabilities })
    return new NextResponse(responseBody(artifact.bytes), { headers: noStoreHeaders({
      "content-type": artifact.contentType,
      "content-disposition": rfc5987Attachment(artifact.fileName),
    }) })
  } catch {
    return NextResponse.json({ ok: false, message: "申请材料导出失败" }, { status: 500, headers: noStoreHeaders() })
  }
}
