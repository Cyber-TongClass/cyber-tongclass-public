import { NextResponse } from "next/server"

import { bearerSessionToken, exportAccess, fetchAuthorizedBytes, noStoreHeaders, rfc5987Attachment } from "@/lib/server/oa-document-access"
import { buildGenericDocxArtifact, buildSingleDocumentArtifact, assertCompiledTemplate, type AuthorizedExportAccess, type ExportArtifact } from "@/lib/server/oa-form-export"
import { detectOfficeCapabilities } from "@/lib/server/office-capabilities"
import { convertFilledDocxToLegacyDoc, convertFilledDocxToPdf } from "@/lib/server/office-conversion"

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
    const capabilities = await detectOfficeCapabilities()
    if (format === "pdf" && !capabilities.canExportPdf) return NextResponse.json({ ok: false, code: "OFFICE_UNAVAILABLE", message: capabilities.unavailableReasons[0] }, { status: 409, headers: noStoreHeaders() })
    if (format === "doc" && !capabilities.canExportLegacyDoc) return NextResponse.json({ ok: false, code: "OFFICE_UNAVAILABLE", message: capabilities.unavailableReasons[0] }, { status: 409, headers: noStoreHeaders() })
    let artifact: ExportArtifact
    if (access.version?.compiledStorageId && access.compiledUrl) {
      const version = assertCompiledTemplate(access)
      const templateBytes = await fetchAuthorizedBytes(access.compiledUrl)
      artifact = await buildSingleDocumentArtifact({ access: { ...access, version }, templateBytes, format, capabilities })
    } else {
      const docx = buildGenericDocxArtifact(access)
      if (format === "pdf") {
        const converted = await convertFilledDocxToPdf(docx.bytes, docx.fileName, { capabilities })
        artifact = { bytes: converted.bytes, fileName: docx.fileName.replace(/\.docx$/i, ".pdf"), contentType: "application/pdf" }
      } else if (format === "doc") {
        const converted = await convertFilledDocxToLegacyDoc(docx.bytes, docx.fileName, { capabilities })
        artifact = { bytes: converted.bytes, fileName: docx.fileName.replace(/\.docx$/i, ".doc"), contentType: "application/msword" }
      } else artifact = docx
    }
    return new NextResponse(responseBody(artifact.bytes), { headers: noStoreHeaders({
      "content-type": artifact.contentType,
      "content-disposition": rfc5987Attachment(artifact.fileName),
    }) })
  } catch {
    return NextResponse.json({ ok: false, message: "申请材料导出失败" }, { status: 500, headers: noStoreHeaders() })
  }
}
