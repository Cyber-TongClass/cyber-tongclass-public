import type { OADocumentBindingCandidate, OADocumentVisualAnchor } from "@/lib/oa-document-templates"
import type { OAPdfPageInfo, OAPdfTextBox } from "@/lib/server/oa-pdf-layout"
import { readOoxmlPackage } from "@/lib/server/ooxml-package"
import { buildSimpleZip } from "@/lib/server/simple-zip"

export interface OAPreviewLayout {
  syntaxVersion: 1
  sourceSha256: string
  analyzerVersion: string
  pages: OAPdfPageInfo[]
  textBoxes: OAPdfTextBox[]
  candidates: OADocumentBindingCandidate[]
}

export const OA_PREVIEW_ANALYZER_VERSION = "aia-pdf-ooxml-1"

const PDF_MAGIC = Buffer.from("%PDF-")
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const MAX_PAGES = 100
const MAX_BUNDLE_BYTES = 100 * 1024 * 1024
const MAX_PAGE_BYTES = 20 * 1024 * 1024
const MAX_LAYOUT_BYTES = 5 * 1024 * 1024
const MAX_TEXT_BOXES = 100_000
const MAX_CANDIDATES = 5_000
const ALLOWED_ROTATIONS = new Set([0, 90, 180, 270])
const ALLOWED_WRITE_TARGETS = new Set(["table-cell", "inline-run", "paragraph-after", "choice", "repeat-row"])

function requireString(value: unknown, label: string, maxLength = 1_000) {
  if (typeof value !== "string" || !value || value.length > maxLength || value.includes("\0")) throw new Error(`${label}无效`)
  return value
}

function requireFinite(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label}必须是有限数值`)
  return value
}

function validatePage(page: unknown, index: number): asserts page is OAPdfPageInfo {
  if (!page || typeof page !== "object") throw new Error("PDF 页面信息无效")
  const value = page as Record<string, unknown>
  if (value.page !== index + 1) throw new Error("PDF 页码必须连续且从 1 开始")
  const width = requireFinite(value.width, "PDF 页面宽度")
  const height = requireFinite(value.height, "PDF 页面高度")
  if (width <= 0 || height <= 0 || width > 20_000 || height > 20_000) throw new Error("PDF 页面尺寸无效")
  if (!ALLOWED_ROTATIONS.has(value.rotation as number)) throw new Error("PDF 页面旋转无效")
}

function validateVisual(value: unknown, pages: OAPdfPageInfo[], label: string): asserts value is OADocumentVisualAnchor {
  if (!value || typeof value !== "object") throw new Error(`${label}视觉锚点无效`)
  const visual = value as Record<string, unknown>
  if (!Number.isSafeInteger(visual.page) || (visual.page as number) < 1 || (visual.page as number) > pages.length) throw new Error(`${label}页码无效`)
  const page = pages[(visual.page as number) - 1]
  for (const key of ["x", "y", "width", "height"] as const) requireFinite(visual[key], `${label} ${key}`)
  const x = visual.x as number
  const y = visual.y as number
  const width = visual.width as number
  const height = visual.height as number
  if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 || y + height > 1) throw new Error(`${label}矩形超出页面范围`)
  if (visual.pageWidth !== page.width || visual.pageHeight !== page.height || visual.rotation !== page.rotation || visual.coordinateSpace !== "normalized-pdf") throw new Error(`${label}页面几何不匹配`)
}

function validateLayout(value: unknown, pageCount: number): asserts value is OAPreviewLayout {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("预览 layout.json 无效")
  const layout = value as Record<string, unknown>
  if (layout.syntaxVersion !== 1) throw new Error("预览布局版本无效")
  if (!/^[a-f0-9]{64}$/i.test(requireString(layout.sourceSha256, "源文件哈希", 64))) throw new Error("源文件哈希无效")
  requireString(layout.analyzerVersion, "分析器版本", MAX_LAYOUT_BYTES)
  if (!Array.isArray(layout.pages) || layout.pages.length < 1 || layout.pages.length > MAX_PAGES || layout.pages.length !== pageCount) throw new Error("预览页面数量不匹配")
  layout.pages.forEach(validatePage)
  const pages = layout.pages as OAPdfPageInfo[]
  if (!Array.isArray(layout.textBoxes) || layout.textBoxes.length > MAX_TEXT_BOXES) throw new Error("PDF 文本框数量超过限制")
  layout.textBoxes.forEach((item, index) => {
    if (!item || typeof item !== "object") throw new Error("PDF 文本框无效")
    const box = item as Record<string, unknown>
    requireString(box.text, "PDF 文本", 20_000)
    requireString(box.normalizedText, "PDF 规范文本", 20_000)
    if (!Number.isSafeInteger(box.order) || (box.order as number) < 0 || !Number.isSafeInteger(box.line) || (box.line as number) < 0) throw new Error("PDF 文本框顺序无效")
    validateVisual(box, pages, `PDF 文本框 ${index + 1}`)
  })
  if (!Array.isArray(layout.candidates) || layout.candidates.length > MAX_CANDIDATES) throw new Error("Word 绑定候选数量超过限制")
  const ids = new Set<string>()
  layout.candidates.forEach((item, index) => {
    if (!item || typeof item !== "object") throw new Error("Word 绑定候选无效")
    const candidate = item as Record<string, unknown>
    const id = requireString(candidate.id, "候选 ID", 200)
    if (ids.has(id)) throw new Error("Word 绑定候选 ID 重复")
    ids.add(id)
    requireString(candidate.label, "候选标签", 2_000)
    requireString(candidate.description, "候选描述", 5_000)
    requireString(candidate.partName, "候选 OOXML 部件", 500)
    requireString(candidate.path, "候选 OOXML 路径", 2_000)
    requireString(candidate.contextHash, "候选上下文哈希", 500)
    if (!ALLOWED_WRITE_TARGETS.has(candidate.writeTarget as string)) throw new Error("候选写入目标无效")
    if (candidate.styleSourcePath !== undefined) requireString(candidate.styleSourcePath, "候选样式路径", 2_000)
    validateVisual(candidate.visual, pages, `Word 绑定候选 ${index + 1}`)
  })
}

function assertPdf(bytes: Buffer) {
  if (!bytes.length || !bytes.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) throw new Error("预览 document.pdf 的 PDF magic 无效")
}

function assertPng(bytes: Buffer, index: number) {
  if (!bytes.length || !bytes.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) throw new Error(`预览第 ${index + 1} 页的 PNG magic 无效`)
  if (bytes.length > MAX_PAGE_BYTES) throw new Error(`预览第 ${index + 1} 页超过 20 MiB 限制`)
}

function serializeLayout(layout: OAPreviewLayout, pageCount: number) {
  validateLayout(layout, pageCount)
  const bytes = Buffer.from(JSON.stringify(layout), "utf8")
  if (bytes.length > MAX_LAYOUT_BYTES) throw new Error("预览 layout.json 超过 5 MiB 限制")
  return bytes
}

export function buildOAPreviewBundle(input: { pdf: Buffer; pages: Buffer[]; layout: OAPreviewLayout }): Buffer {
  const pdf = Buffer.from(input.pdf)
  assertPdf(pdf)
  if (!Array.isArray(input.pages) || input.pages.length < 1 || input.pages.length > MAX_PAGES) throw new Error(`预览页面数量必须在 1 到 ${MAX_PAGES} 之间`)
  const pages = input.pages.map((page, index) => {
    const bytes = Buffer.from(page)
    assertPng(bytes, index)
    return bytes
  })
  const layout = serializeLayout(input.layout, pages.length)
  const bundle = buildSimpleZip([
    { name: "document.pdf", data: pdf },
    ...pages.map((data, index) => ({ name: `pages/page-${String(index + 1).padStart(3, "0")}.png`, data })),
    { name: "layout.json", data: layout },
  ])
  if (bundle.length >= MAX_BUNDLE_BYTES) throw new Error("预览 bundle 达到或超过 100 MiB 限制")
  return bundle
}

export function readOAPreviewBundle(bytes: Uint8Array, expectedSourceSha256: string): { pdf: Buffer; pages: Buffer[]; layout: OAPreviewLayout } {
  if (bytes.byteLength >= MAX_BUNDLE_BYTES) throw new Error("预览 bundle 达到或超过 100 MiB 限制")
  if (!/^[a-f0-9]{64}$/i.test(expectedSourceSha256)) throw new Error("预期源文件哈希无效")
  const pkg = readOoxmlPackage(bytes, { maxEntries: MAX_PAGES + 2, maxExtractedBytes: MAX_BUNDLE_BYTES - 1, maxEntryBytes: MAX_BUNDLE_BYTES - 1, maxXmlPartBytes: MAX_LAYOUT_BYTES, maxCompressionRatio: 100 })
  const allowed = new Set(["document.pdf", "layout.json"])
  for (let index = 1; index <= MAX_PAGES; index += 1) allowed.add(`pages/page-${String(index).padStart(3, "0")}.png`)
  for (const name of pkg.entries.keys()) if (!allowed.has(name)) throw new Error(`预览 bundle 包含未知或额外条目：${name}`)
  if (!pkg.has("document.pdf") || !pkg.has("layout.json")) throw new Error("预览 bundle 缺少 document.pdf 或 layout.json")
  const layoutEntry = pkg.read("layout.json")
  if (layoutEntry.length > MAX_LAYOUT_BYTES) throw new Error("预览 layout.json 超过 5 MiB 限制")
  let parsed: unknown
  try {
    parsed = JSON.parse(layoutEntry.toString("utf8"))
  } catch {
    throw new Error("预览 layout.json 解析失败")
  }
  const pageNames = Array.from(pkg.entries.keys()).filter((name) => /^pages\/page-\d{3}\.png$/.test(name)).sort()
  validateLayout(parsed, pageNames.length)
  const layout = parsed as OAPreviewLayout
  if (layout.sourceSha256.toLowerCase() !== expectedSourceSha256.toLowerCase()) throw new Error("预览 bundle 源文件哈希不匹配")
  if (pageNames.length !== layout.pages.length || pageNames.some((name, index) => name !== `pages/page-${String(index + 1).padStart(3, "0")}.png`)) throw new Error("预览页面文件缺失或编号不连续")
  const pdf = pkg.read("document.pdf")
  assertPdf(pdf)
  const pages = pageNames.map((name, index) => {
    const page = pkg.read(name)
    assertPng(page, index)
    return page
  })
  return { pdf, pages, layout }
}
