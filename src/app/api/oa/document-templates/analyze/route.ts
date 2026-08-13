import { NextResponse } from "next/server"

import {
  normalizeWordSourceType,
  type OADocumentAnchor,
  type OADocumentManifestField,
  type OADocumentTemplateManifest,
  type OADocumentTemplateWarning,
  type OADocumentVisualAnchor,
} from "@/lib/oa-document-templates"
import {
  bearerSessionToken,
  createDerivedTarget,
  fetchAuthorizedBytes,
  noStoreHeaders,
  parseBoundedJson,
  persistAnalysis,
  processingAccess,
  uploadDerivedBytes,
  verifyAuthorizedSource,
} from "@/lib/server/oa-document-access"
import { createMarkerPlan, matchWordNodesToPdf, validateMarkerLayout } from "@/lib/server/oa-layout-matcher"
import { parsePdfBboxXml } from "@/lib/server/oa-pdf-layout"
import { buildOAPreviewBundle, OA_PREVIEW_ANALYZER_VERSION } from "@/lib/server/oa-preview-bundle"
import {
  detectPreviewToolCapabilities,
  extractPdfBboxXml,
  inspectPdf,
  inspectPdfFonts,
  renderPdfPages,
} from "@/lib/server/oa-preview-tools"
import { detectWordFormRegions } from "@/lib/server/oa-word-detection"
import { extractDirectWordFonts } from "@/lib/server/oa-word-fonts"
import { compileWordTemplate } from "@/lib/server/oa-word-compiler"
import { fillWordTemplate } from "@/lib/server/oa-word-fill"
import { indexWordWritableNodes, type OAWordWritableNode } from "@/lib/server/oa-word-layout-index"
import { detectOfficeCapabilities, missingConvertedPdfFonts, publicOfficeCapabilities } from "@/lib/server/office-capabilities"
import { convertFilledDocxToPdf, convertLegacyDocToDocx } from "@/lib/server/office-conversion"
import { readOoxmlPackage } from "@/lib/server/ooxml-package"
import { assertSafeDocxPackage } from "@/lib/server/ooxml-security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const COMPILER_VERSION = "aia-ooxml-2"
const SYNTAX_VERSION = 2

class OADocumentRouteError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) { super(message) }
}

function jsonError(error: unknown) {
  if (error instanceof OADocumentRouteError) {
    return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status, headers: noStoreHeaders() })
  }
  const message = error instanceof Error ? error.message : ""
  if (/登录已过期|账号不可用|请先登录/.test(message)) return NextResponse.json({ ok: false, code: "AUTH_REQUIRED", message: "登录已过期，请重新登录" }, { status: 401, headers: noStoreHeaders() })
  if (/无权|不存在/.test(message)) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "模板不存在或无权访问" }, { status: 404, headers: noStoreHeaders() })
  if (/请求内容|JSON|ZIP|OOXML|源文件|大小|magic|解析失败|格式/.test(message)) return NextResponse.json({ ok: false, code: "INVALID_DOCUMENT", message: "Word 模板文件或请求无效" }, { status: 422, headers: noStoreHeaders() })
  if (/Office|LibreOffice|PDF|pdf|字体|转换|超时|布局|几何|工具|不可用/.test(message)) return NextResponse.json({ ok: false, code: "PREVIEW_CONFLICT", message: "文档预览转换失败，请检查 Office、字体与 PDF 工具配置" }, { status: 409, headers: noStoreHeaders() })
  return NextResponse.json({ ok: false, code: "OA_DOCUMENT_ERROR", message: "Word 模板分析失败" }, { status: 500, headers: noStoreHeaders() })
}

function samePageGeometry(left: { width: number; height: number; rotation: number }, right: { width: number; height: number; rotation: number }) {
  return Math.abs(left.width - right.width) <= 0.1 && Math.abs(left.height - right.height) <= 0.1 && left.rotation === right.rotation
}

function outputMode(node: OAWordWritableNode): OADocumentAnchor["output"]["mode"] {
  if (node.writeTarget === "choice") return "mark_choice"
  if (node.writeTarget === "repeat-row") return "repeat_row"
  if (node.writeTarget === "paragraph-after" || node.writeTarget === "inline-run") return "append"
  return "replace"
}

function markerManifest(nodes: OAWordWritableNode[], markerByNode: Map<string, string>): OADocumentTemplateManifest {
  const placeholder: OADocumentVisualAnchor = {
    page: 1, x: 0, y: 0, width: 0.005, height: 0.005,
    pageWidth: 1, pageHeight: 1, rotation: 0, coordinateSpace: "normalized-pdf",
  }
  const fields: OADocumentManifestField[] = nodes.map((node) => ({ fieldId: node.id, label: node.label, answerType: "text", required: false }))
  const anchors: OADocumentAnchor[] = nodes.map((node) => ({
    fieldId: node.id,
    kind: node.kind,
    partName: node.partName,
    path: node.path,
    contextHash: node.contextHash,
    output: { mode: outputMode(node), multiline: node.writeTarget === "paragraph-after" },
    visual: placeholder,
    bindingCandidateId: `marker_${node.id}`,
    structural: {
      partName: node.partName,
      path: node.path,
      contextHash: node.contextHash,
      writeTarget: node.writeTarget,
      ...(node.styleSourcePath ? { styleSourcePath: node.styleSourcePath } : {}),
    },
  }))
  return { syntaxVersion: 2, compilerVersion: `${COMPILER_VERSION}-marker`, fields, anchors, suggestions: [] }
}

async function resolveHardBlanksWithMarkers(args: {
  workingBytes: Uint8Array
  workingFileName: string
  nodes: OAWordWritableNode[]
  cleanPages: ReturnType<typeof parsePdfBboxXml>["pages"]
  officeCapabilities: Awaited<ReturnType<typeof detectOfficeCapabilities>>
  previewTools: Awaited<ReturnType<typeof detectPreviewToolCapabilities>>
}) {
  const eligible = args.nodes.filter((node) => node.writeTarget === "table-cell" || node.writeTarget === "inline-run" || node.writeTarget === "paragraph-after")
  const plan = createMarkerPlan(eligible)
  if (!plan.length) return []
  const markers = new Map(plan.map((item) => [item.nodeId, item.marker]))
  try {
    const compiled = compileWordTemplate(args.workingBytes, markerManifest(eligible, markers))
    const filled = fillWordTemplate(compiled.bytes, {
      fields: eligible.map((node) => ({ fieldId: node.id, label: node.label, answerType: "text", required: false })),
      answers: Object.fromEntries(plan.map((item) => [item.nodeId, item.marker])),
    })
    const markedPdf = await convertFilledDocxToPdf(filled.bytes, args.workingFileName, { capabilities: args.officeCapabilities })
    const markedPages = await inspectPdf(markedPdf.bytes, args.previewTools)
    const markedLayout = parsePdfBboxXml(await extractPdfBboxXml(markedPdf.bytes, args.previewTools))
    markedLayout.pages = markedPages
    const resolution = validateMarkerLayout(plan, args.cleanPages, markedLayout)
    const nodeById = new Map(eligible.map((node) => [node.id, node]))
    return resolution.resolved.flatMap((item) => {
      const node = nodeById.get(item.nodeId)
      if (!node) return []
      return [{
        id: node.id,
        label: node.label,
        description: `${node.kind} · ${node.writeTarget} · 标记定位`,
        partName: node.partName,
        path: node.path,
        contextHash: node.contextHash,
        writeTarget: node.writeTarget,
        ...(node.styleSourcePath ? { styleSourcePath: node.styleSourcePath } : {}),
        visual: item.visual,
      }]
    })
  } catch {
    return []
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseBoundedJson(request) as { sessionToken?: unknown; versionId?: unknown }
    const sessionToken = bearerSessionToken(request) || (typeof body.sessionToken === "string" ? body.sessionToken.trim() : "")
    const versionId = typeof body.versionId === "string" ? body.versionId.trim() : ""
    if (!sessionToken) throw new OADocumentRouteError("AUTH_REQUIRED", "请先登录", 401)
    if (!versionId) throw new OADocumentRouteError("INVALID_VERSION", "模板版本无效", 422)

    const access = await processingAccess(sessionToken, versionId)
    const source = await fetchAuthorizedBytes(access.sourceUrl)
    verifyAuthorizedSource(source, access)
    normalizeWordSourceType(access.sourceType === "doc" ? "application/msword" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document", access.sourceFileName, source)

    const baseOfficeCapabilities = await detectOfficeCapabilities()
    const previewTools = await detectPreviewToolCapabilities()
    const unavailable = [...baseOfficeCapabilities.unavailableReasons, ...previewTools.unavailableReasons]
    if (!baseOfficeCapabilities.canExportPdf || unavailable.length) {
      throw new OADocumentRouteError("OFFICE_UNAVAILABLE", unavailable[0] || "PDF 预览转换能力不可用", 409)
    }

    const warnings: OADocumentTemplateWarning[] = []
    let workingBytes: Uint8Array = source
    let workingFileName = access.sourceFileName
    let workingStorageId: string | undefined
    if (access.sourceType === "doc") {
      const converted = await convertLegacyDocToDocx(source, access.sourceFileName, { capabilities: baseOfficeCapabilities })
      workingBytes = converted.bytes
      workingFileName = converted.fileName
      warnings.push(...converted.warnings.map((message) => ({ code: "legacy-doc-converted", message, severity: "info" as const })))
      const target = await createDerivedTarget(sessionToken, access.formId, converted.fileName, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
      workingStorageId = await uploadDerivedBytes(target, converted.bytes)
    }

    const pkg = assertSafeDocxPackage(readOoxmlPackage(workingBytes))
    const requiredFonts = extractDirectWordFonts(pkg)
    if (!requiredFonts.length) throw new OADocumentRouteError("PDF_FONTS_UNVERIFIED", "Word 模板未声明可验证的正文字体", 409)
    const officeCapabilities = await detectOfficeCapabilities({ ...process.env, OA_TEMPLATE_REQUIRED_FONTS: requiredFonts.join(",") })
    const capabilities = publicOfficeCapabilities(officeCapabilities)
    if (!officeCapabilities.canExportPdf) throw new OADocumentRouteError("OFFICE_UNAVAILABLE", officeCapabilities.unavailableReasons[0] || "模板字体未就绪", 409)
    const convertedPdf = await convertFilledDocxToPdf(workingBytes, workingFileName, { capabilities: officeCapabilities })
    const pages = await inspectPdf(convertedPdf.bytes, previewTools)
    const layout = parsePdfBboxXml(await extractPdfBboxXml(convertedPdf.bytes, previewTools))
    if (layout.pages.length !== pages.length || layout.pages.some((page, index) => !samePageGeometry(page, pages[index]))) {
      throw new OADocumentRouteError("PDF_LAYOUT_MISMATCH", "PDF 页面与文字布局几何不一致", 409)
    }
    layout.pages = pages
    const fonts = await inspectPdfFonts(convertedPdf.bytes, previewTools)
    if (!fonts.length) throw new OADocumentRouteError("PDF_FONTS_UNVERIFIED", "无法验证 PDF 字体，请检查模板字体配置", 409)
    const unembedded = fonts.filter((font) => !font.embedded)
    if (unembedded.length) throw new OADocumentRouteError("PDF_FONT_NOT_EMBEDDED", `PDF 包含未嵌入字体：${unembedded.map((font) => font.name).join("、")}`, 409)
    const substitutedFonts = missingConvertedPdfFonts(requiredFonts, officeCapabilities.fontAliases, fonts.map((font) => font.name))
    if (substitutedFonts.length) throw new OADocumentRouteError("PDF_FONT_SUBSTITUTION", `PDF 字体发生替换或缺失：${substitutedFonts.join("、")}`, 409)

    const nodes = indexWordWritableNodes(pkg)
    const cleanMatch = matchWordNodesToPdf(nodes, layout)
    warnings.push(...cleanMatch.warnings)
    const mappedKeys = new Set(cleanMatch.candidates.map((candidate) => `${candidate.partName}|${candidate.path}|${candidate.contextHash}`))
    const unresolvedNodes = nodes.filter((node) => !mappedKeys.has(`${node.partName}|${node.path}|${node.contextHash}`))
    const markerCandidates = await resolveHardBlanksWithMarkers({ workingBytes, workingFileName, nodes: unresolvedNodes, cleanPages: pages, officeCapabilities, previewTools })
    const allCandidates = [...cleanMatch.candidates, ...markerCandidates]
    const suggestions = detectWordFormRegions(pkg, allCandidates).map((suggestion) => suggestion.reviewState === "confirmed" ? { ...suggestion, reviewState: "unresolved" as const } : suggestion)
    if (!suggestions.length) warnings.push({ code: "no-regions-detected", message: "未自动识别到填写区域，可在工作台中框选并绑定 Word 可写位置", severity: "warning" })

    const manifest: OADocumentTemplateManifest = { syntaxVersion: SYNTAX_VERSION, compilerVersion: COMPILER_VERSION, suggestions, fields: [], anchors: [] }
    const renderedPages = await renderPdfPages(convertedPdf.bytes, previewTools)
    const previewBytes = buildOAPreviewBundle({
      pdf: convertedPdf.bytes,
      pages: renderedPages,
      layout: { syntaxVersion: 1, sourceSha256: access.sourceSha256, analyzerVersion: OA_PREVIEW_ANALYZER_VERSION, pages, textBoxes: layout.textBoxes, candidates: allCandidates },
    })
    const previewTarget = await createDerivedTarget(sessionToken, access.formId, `${access.sourceFileName}.preview.zip`, "application/zip")
    const previewStorageId = await uploadDerivedBytes(previewTarget, previewBytes)
    await persistAnalysis({ sessionToken, versionId, manifest, warnings, capabilities, workingStorageId, previewStorageId })
    return NextResponse.json({ ok: true, manifest, warnings, capabilities }, { headers: noStoreHeaders() })
  } catch (error) {
    return jsonError(error)
  }
}
