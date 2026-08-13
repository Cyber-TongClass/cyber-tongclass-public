import { NextResponse } from "next/server"

import { normalizeWordSourceType, type OADocumentTemplateManifest, type OADocumentTemplateWarning } from "@/lib/oa-document-templates"
import {
  assertSmallJsonRequest,
  bearerSessionToken,
  createDerivedTarget,
  fetchAuthorizedBytes,
  noStoreHeaders,
  persistAnalysis,
  processingAccess,
  uploadDerivedBytes,
  verifyAuthorizedSource,
} from "@/lib/server/oa-document-access"
import { detectWordFormRegions } from "@/lib/server/oa-word-detection"
import { detectOfficeCapabilities, publicOfficeCapabilities } from "@/lib/server/office-capabilities"
import { convertLegacyDocToDocx } from "@/lib/server/office-conversion"
import { readOoxmlPackage } from "@/lib/server/ooxml-package"
import { assertSafeDocxPackage } from "@/lib/server/ooxml-security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const COMPILER_VERSION = "aia-ooxml-1"
const SYNTAX_VERSION = 1

function previewDocument(manifest: OADocumentTemplateManifest) {
  return {
    syntaxVersion: manifest.syntaxVersion,
    regions: manifest.suggestions.map((suggestion) => ({
      id: suggestion.id,
      partName: suggestion.partName,
      path: suggestion.path,
      kind: suggestion.kind,
      label: suggestion.label,
      confidence: suggestion.confidence,
      reviewState: suggestion.reviewState,
      evidence: suggestion.evidence,
    })),
  }
}

export async function POST(request: Request) {
  try {
    assertSmallJsonRequest(request)
    const body = await request.json().catch(() => ({})) as { sessionToken?: unknown; versionId?: unknown }
    const sessionToken = bearerSessionToken(request) || (typeof body.sessionToken === "string" ? body.sessionToken.trim() : "")
    const versionId = typeof body.versionId === "string" ? body.versionId.trim() : ""
    if (!sessionToken) return NextResponse.json({ ok: false, message: "请先登录" }, { status: 401, headers: noStoreHeaders() })
    if (!versionId) return NextResponse.json({ ok: false, message: "模板版本无效" }, { status: 400, headers: noStoreHeaders() })

    // Authorization always precedes object retrieval. The browser never supplies a URL or field list.
    const access = await processingAccess(sessionToken, versionId)
    const source = await fetchAuthorizedBytes(access.sourceUrl)
    verifyAuthorizedSource(source, access)
    normalizeWordSourceType(access.sourceType === "doc" ? "application/msword" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document", access.sourceFileName, source)
    const officeCapabilities = await detectOfficeCapabilities()
    const capabilities = publicOfficeCapabilities(officeCapabilities)
    const warnings: OADocumentTemplateWarning[] = []
    let workingBytes: Uint8Array = source
    let workingStorageId: string | undefined
    if (access.sourceType === "doc") {
      if (!officeCapabilities.libreOfficePath) {
        return NextResponse.json({ ok: false, code: "OFFICE_UNAVAILABLE", message: capabilities.unavailableReasons[0] || "LibreOffice 不可用" }, { status: 409, headers: noStoreHeaders() })
      }
      const converted = await convertLegacyDocToDocx(source, access.sourceFileName, { capabilities: officeCapabilities })
      workingBytes = converted.bytes
      warnings.push(...converted.warnings.map((message) => ({ code: "legacy-doc-converted", message, severity: "info" as const })))
      const target = await createDerivedTarget(sessionToken, access.formId, converted.fileName, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
      workingStorageId = await uploadDerivedBytes(target, converted.bytes)
    }

    const pkg = assertSafeDocxPackage(readOoxmlPackage(workingBytes))
    const suggestions = detectWordFormRegions(pkg)
    const manifest: OADocumentTemplateManifest = {
      syntaxVersion: SYNTAX_VERSION,
      compilerVersion: COMPILER_VERSION,
      suggestions,
      fields: [],
      anchors: [],
    }
    if (!suggestions.length) warnings.push({ code: "no-regions-detected", message: "未自动识别到填写区域，可在工作台中手动添加问题", severity: "warning" })
    const previewBytes = Buffer.from(JSON.stringify(previewDocument(manifest)), "utf8")
    const previewTarget = await createDerivedTarget(sessionToken, access.formId, `${access.sourceFileName}.preview.json`, "application/json")
    const previewStorageId = await uploadDerivedBytes(previewTarget, previewBytes)
    await persistAnalysis({ sessionToken, versionId, manifest, warnings, capabilities, workingStorageId, previewStorageId })
    return NextResponse.json({ ok: true, manifest, warnings, capabilities }, { headers: noStoreHeaders() })
  } catch {
    return NextResponse.json({ ok: false, message: "Word 模板分析失败" }, { status: 500, headers: noStoreHeaders() })
  }
}
