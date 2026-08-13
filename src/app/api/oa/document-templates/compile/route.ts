import { NextResponse } from "next/server"

import { DOCX_MIME, validateTemplateManifest, type OADocumentTemplateManifest } from "@/lib/oa-document-templates"
import {
  activateCompiled,
  assertSmallJsonRequest,
  bearerSessionToken,
  createDerivedTarget,
  fetchAuthorizedBytes,
  noStoreHeaders,
  processingAccess,
  uploadDerivedBytes,
  verifyAuthorizedSource,
} from "@/lib/server/oa-document-access"
import { detectOfficeCapabilities } from "@/lib/server/office-capabilities"
import { convertLegacyDocToDocx } from "@/lib/server/office-conversion"
import { compileWordTemplate } from "@/lib/server/oa-word-compiler"
import { readOoxmlPackage } from "@/lib/server/ooxml-package"
import { assertSafeDocxPackage } from "@/lib/server/ooxml-security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    assertSmallJsonRequest(request)
    const body = await request.json().catch(() => ({})) as { sessionToken?: unknown; versionId?: unknown }
    const sessionToken = bearerSessionToken(request) || (typeof body.sessionToken === "string" ? body.sessionToken.trim() : "")
    const versionId = typeof body.versionId === "string" ? body.versionId.trim() : ""
    if (!sessionToken) return NextResponse.json({ ok: false, message: "请先登录" }, { status: 401, headers: noStoreHeaders() })
    if (!versionId) return NextResponse.json({ ok: false, message: "模板版本无效" }, { status: 400, headers: noStoreHeaders() })

    // The manifest is read from the authorized immutable version; request fields/manifests are ignored.
    const access = await processingAccess(sessionToken, versionId)
    const manifest = access.manifest as OADocumentTemplateManifest
    validateTemplateManifest(manifest)
    const source = await fetchAuthorizedBytes(access.sourceUrl)
    verifyAuthorizedSource(source, access)
    let working: Uint8Array = source
    if (access.sourceType === "doc") {
      const capabilities = await detectOfficeCapabilities()
      if (!capabilities.libreOfficePath) {
        return NextResponse.json({ ok: false, code: "OFFICE_UNAVAILABLE", message: capabilities.unavailableReasons[0] || "LibreOffice 不可用" }, { status: 409, headers: noStoreHeaders() })
      }
      working = (await convertLegacyDocToDocx(source, access.sourceFileName, { capabilities })).bytes
    }
    assertSafeDocxPackage(readOoxmlPackage(working))
    const compiled = compileWordTemplate(working, manifest)
    const target = await createDerivedTarget(sessionToken, access.formId, `表单模板-v${versionId.slice(-8)}.docx`, DOCX_MIME)
    const compiledStorageId = await uploadDerivedBytes(target, compiled.bytes)
    await activateCompiled({ sessionToken, versionId, compiledStorageId, manifest })
    return NextResponse.json({ ok: true, changedParts: compiled.changedParts }, { headers: noStoreHeaders() })
  } catch {
    return NextResponse.json({ ok: false, message: "Word 模板编译失败" }, { status: 500, headers: noStoreHeaders() })
  }
}
