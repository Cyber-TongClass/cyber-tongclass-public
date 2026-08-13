import { NextResponse } from "next/server"

import { assertSelectedSubmissionCount } from "@/lib/oa-document-templates"
import { bearerSessionToken, exportAccess, fetchAuthorizedBytes, noStoreHeaders, rfc5987Attachment } from "@/lib/server/oa-document-access"
import {
  assertCompiledTemplate,
  buildCsvArtifact,
  buildRepeatRowArtifact,
  buildSingleDocumentArtifact,
  buildWordZipArtifact,
  buildXlsxArtifact,
  type AuthorizedExportAccess,
  type ExportArtifact,
} from "@/lib/server/oa-form-export"
import { detectOfficeCapabilities } from "@/lib/server/office-capabilities"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type BatchFormat = "csv" | "xlsx" | "word" | "original" | "pdf"

function responseBody(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

function selectedIds(value: unknown) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) throw new Error("请选择要导出的申请")
  const ids = [...new Set(value.map((item) => item.trim()))]
  assertSelectedSubmissionCount(ids.length)
  if (!ids.length) throw new Error("请选择要导出的申请")
  return ids
}

export async function POST(request: Request, context: { params: Promise<{ formId: string }> }) {
  try {
    const declared = Number(request.headers.get("content-length") || 0)
    if (declared > 128 * 1024) return NextResponse.json({ ok: false, message: "请求内容过大" }, { status: 413, headers: noStoreHeaders() })
    const body = await request.json().catch(() => ({})) as { sessionToken?: unknown; submissionIds?: unknown; format?: unknown }
    const sessionToken = bearerSessionToken(request) || (typeof body.sessionToken === "string" ? body.sessionToken.trim() : "")
    if (!sessionToken) return NextResponse.json({ ok: false, message: "请先登录" }, { status: 401, headers: noStoreHeaders() })
    const { formId } = await context.params
    const ids = selectedIds(body.submissionIds)
    const format: BatchFormat = new Set(["csv", "xlsx", "word", "original", "pdf"]).has(String(body.format)) ? body.format as BatchFormat : "word"

    // Browser input contains identifiers and format only. Convex independently authorizes every selected row.
    const accesses = await Promise.all(ids.map((submissionId) => exportAccess(sessionToken, submissionId, true))) as AuthorizedExportAccess[]
    if (accesses.some((access) => String(access.form._id) !== formId || String(access.submission.formId) !== formId)) {
      return NextResponse.json({ ok: false, message: "所选申请不属于当前表单" }, { status: 403, headers: noStoreHeaders() })
    }
    let artifact: ExportArtifact
    if (format === "csv") artifact = buildCsvArtifact(accesses)
    else if (format === "xlsx") artifact = buildXlsxArtifact(accesses)
    else {
      const capabilities = await detectOfficeCapabilities()
      if ((format === "pdf" && !capabilities.canExportPdf) || (format === "original" && accesses.some((access) => access.version?.sourceType === "doc") && !capabilities.canExportLegacyDoc)) {
        return NextResponse.json({ ok: false, code: "OFFICE_UNAVAILABLE", message: capabilities.unavailableReasons[0] }, { status: 409, headers: noStoreHeaders() })
      }
      accesses.forEach(assertCompiledTemplate)
      const templateCache = new Map<string, Buffer>()
      const templateFor = async (access: AuthorizedExportAccess) => {
        const versionId = String(access.version!._id)
        const cached = templateCache.get(versionId)
        if (cached) return cached
        const bytes = await fetchAuthorizedBytes(access.compiledUrl || null)
        templateCache.set(versionId, bytes)
        return bytes
      }
      const versionIds = new Set(accesses.map((access) => String(access.version!._id)))
      const repeatAnchor = versionIds.size === 1
        ? accesses[0].version!.manifest.anchors.find((anchor) => anchor.output.mode === "repeat_row")
        : undefined
      if (format === "word" && repeatAnchor) {
        artifact = buildRepeatRowArtifact(await templateFor(accesses[0]), accesses, repeatAnchor.fieldId)
      } else {
        const documents: ExportArtifact[] = []
        for (const access of accesses) {
          const templateBytes = await templateFor(access)
          const docx = await buildSingleDocumentArtifact({ access, templateBytes, format: "docx", capabilities })
          if (format === "word") documents.push(docx)
          else if (format === "pdf") documents.push(await buildSingleDocumentArtifact({ access, templateBytes, format: "pdf", capabilities }))
          else if (access.version!.sourceType === "doc") {
            documents.push(await buildSingleDocumentArtifact({ access, templateBytes, format: "doc", capabilities }), docx)
          } else documents.push(docx)
        }
        artifact = buildWordZipArtifact(documents, accesses[0].form.title)
        if (format === "pdf") artifact = { ...artifact, fileName: artifact.fileName.replace("Word材料", "PDF材料") }
        if (format === "original") artifact = { ...artifact, fileName: artifact.fileName.replace("Word材料", "原格式材料") }
      }
    }
    return new NextResponse(responseBody(artifact.bytes), { headers: noStoreHeaders({
      "content-type": artifact.contentType,
      "content-disposition": rfc5987Attachment(artifact.fileName),
    }) })
  } catch {
    return NextResponse.json({ ok: false, message: "批量导出失败" }, { status: 500, headers: noStoreHeaders() })
  }
}
