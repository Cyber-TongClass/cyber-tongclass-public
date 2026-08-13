import { NextResponse } from "next/server"

import { DOCX_MIME, validateTemplateManifest, type OADocumentTemplateManifest } from "@/lib/oa-document-templates"
import {
  activateCompiled,
  bearerSessionToken,
  createDerivedTarget,
  fetchAuthorizedBytes,
  noStoreHeaders,
  parseBoundedJson,
  processingAccess,
  uploadDerivedBytes,
  verifyAuthorizedSource,
} from "@/lib/server/oa-document-access"
import { compileWordTemplate } from "@/lib/server/oa-word-compiler"
import { readOoxmlPackage } from "@/lib/server/ooxml-package"
import { assertSafeDocxPackage } from "@/lib/server/ooxml-security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : ""
  if (/登录已过期|账号不可用|请先登录/.test(message)) return NextResponse.json({ ok: false, code: "AUTH_REQUIRED", message: "登录已过期，请重新登录" }, { status: 401, headers: noStoreHeaders() })
  if (/无权|不存在/.test(message)) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "模板不存在或无权访问" }, { status: 404, headers: noStoreHeaders() })
  if (/请求内容|JSON|ZIP|OOXML|源文件|大小|magic|解析失败|格式|syntaxVersion|manifest|锚点|字段/.test(message)) return NextResponse.json({ ok: false, code: "INVALID_DOCUMENT", message: "Word 模板或编译请求无效" }, { status: 422, headers: noStoreHeaders() })
  if (/Office|LibreOffice|字体|转换|超时|不可用|待确认|冲突/.test(message)) return NextResponse.json({ ok: false, code: "COMPILE_CONFLICT", message: "Word 模板尚不能编译，请检查审核状态与 Office 配置" }, { status: 409, headers: noStoreHeaders() })
  return NextResponse.json({ ok: false, code: "OA_DOCUMENT_ERROR", message: "Word 模板编译失败" }, { status: 500, headers: noStoreHeaders() })
}

export async function POST(request: Request) {
  try {
    const body = await parseBoundedJson(request) as { sessionToken?: unknown; versionId?: unknown }
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
      if (!access.workingUrl) return NextResponse.json({ ok: false, code: "REANALYSIS_REQUIRED", message: "旧版 Word 工作副本不可用，请重新分析" }, { status: 409, headers: noStoreHeaders() })
      working = await fetchAuthorizedBytes(access.workingUrl)
    }
    assertSafeDocxPackage(readOoxmlPackage(working))
    const compiled = compileWordTemplate(working, manifest)
    const target = await createDerivedTarget(sessionToken, access.formId, `表单模板-v${versionId.slice(-8)}.docx`, DOCX_MIME)
    const compiledStorageId = await uploadDerivedBytes(target, compiled.bytes)
    await activateCompiled({ sessionToken, versionId, compiledStorageId, manifest })
    return NextResponse.json({ ok: true, changedParts: compiled.changedParts }, { headers: noStoreHeaders() })
  } catch (error) {
    return failure(error)
  }
}
