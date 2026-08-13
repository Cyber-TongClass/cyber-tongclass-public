import { DOMParser, type Element as XmlElement, type Node as XmlNode } from "@xmldom/xmldom"
import type { OADocumentPageRotation, OADocumentVisualAnchor } from "@/lib/oa-document-templates"

const MAX_BBOX_XML_BYTES = 5 * 1024 * 1024
const MAX_BBOX_ELEMENTS = 100_000
const MAX_PDF_PAGES = 100

export interface OAPdfPageInfo {
  page: number
  width: number
  height: number
  rotation: OADocumentPageRotation
}

export interface OAPdfTextBox extends OADocumentVisualAnchor {
  text: string
  normalizedText: string
  order: number
  line: number
}

export interface OAPdfLayout {
  pages: OAPdfPageInfo[]
  textBoxes: OAPdfTextBox[]
}

function localName(node: XmlNode) {
  return (node.localName || node.nodeName.split(":").at(-1) || "").toLocaleLowerCase("en-US")
}

function elementChildren(node: XmlNode) {
  const result: XmlElement[] = []
  for (let child = node.firstChild; child; child = child.nextSibling) if (child.nodeType === 1) result.push(child as XmlElement)
  return result
}

function descendants(node: XmlNode, expected?: string) {
  const result: XmlElement[] = []
  const visit = (current: XmlNode) => {
    for (const child of elementChildren(current)) {
      if (!expected || localName(child) === expected) result.push(child)
      visit(child)
    }
  }
  visit(node)
  return result
}

function finiteAttribute(element: XmlElement, names: string[], label: string) {
  const value = names.map((name) => element.getAttribute(name)).find((candidate) => candidate !== null)
  const number = value === null || value === undefined || !value.trim() ? Number.NaN : Number(value)
  if (!Number.isFinite(number)) throw new Error(`PDF bbox ${label}必须是有限数值`)
  return number
}

function normalizeText(value: string) {
  return value.normalize("NFKC").replace(/[\u00a0\u3000]/g, " ").replace(/\s+/g, " ").trim()
}

export function parsePdfBboxXml(xml: string): OAPdfLayout {
  if (Buffer.byteLength(xml, "utf8") > MAX_BBOX_XML_BYTES) throw new Error("PDF bbox XML 大小超过限制")
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("PDF bbox XML 不允许 DTD 或实体声明")
  const errors: string[] = []
  const document = new DOMParser({ onError(level, message) { if (level !== "warning") errors.push(String(message)) } }).parseFromString(xml, "application/xml")
  if (errors.length || !document.documentElement || localName(document.documentElement) === "parsererror") throw new Error("PDF bbox XML 解析失败")
  const allElements = descendants(document).length
  if (allElements > MAX_BBOX_ELEMENTS) throw new Error("PDF bbox XML 元素数量超过限制")
  const pageElements = descendants(document, "page")
  if (!pageElements.length || pageElements.length > MAX_PDF_PAGES) throw new Error("PDF bbox 页数无效或超过限制")

  const pages: OAPdfPageInfo[] = []
  const textBoxes: OAPdfTextBox[] = []
  let order = 0
  let lineOrder = 0
  for (let pageIndex = 0; pageIndex < pageElements.length; pageIndex += 1) {
    const element = pageElements[pageIndex]
    const width = finiteAttribute(element, ["width"], "页面宽度")
    const height = finiteAttribute(element, ["height"], "页面高度")
    const rotationValue = element.getAttribute("rotation") === null ? 0 : finiteAttribute(element, ["rotation"], "页面旋转")
    if (width <= 0 || height <= 0 || ![0, 90, 180, 270].includes(rotationValue)) throw new Error("PDF bbox 页面几何无效")
    const rotation = rotationValue as OADocumentPageRotation
    const page = pageIndex + 1
    pages.push({ page, width, height, rotation })
    for (const line of descendants(element, "line")) {
      const currentLine = lineOrder++
      for (const word of descendants(line, "word")) {
        const text = normalizeText(word.textContent || "")
        if (!text) continue
        const xMin = finiteAttribute(word, ["xMin", "xmin"], "xMin")
        const yMin = finiteAttribute(word, ["yMin", "ymin"], "yMin")
        const xMax = finiteAttribute(word, ["xMax", "xmax"], "xMax")
        const yMax = finiteAttribute(word, ["yMax", "ymax"], "yMax")
        if (xMin < 0 || yMin < 0 || xMax <= xMin || yMax <= yMin || xMax > width || yMax > height) throw new Error("PDF bbox 文本框超出页面范围")
        textBoxes.push({
          page, text, normalizedText: text, x: xMin / width, y: yMin / height,
          width: (xMax - xMin) / width, height: (yMax - yMin) / height,
          pageWidth: width, pageHeight: height, rotation, coordinateSpace: "normalized-pdf", order: order++, line: currentLine,
        })
      }
    }
    // Some Poppler variants emit word elements without an explicit line.
    const inLines = new Set(descendants(element, "line").flatMap((line) => descendants(line, "word")))
    for (const word of descendants(element, "word")) {
      if (inLines.has(word)) continue
      const text = normalizeText(word.textContent || "")
      if (!text) continue
      const xMin = finiteAttribute(word, ["xMin", "xmin"], "xMin")
      const yMin = finiteAttribute(word, ["yMin", "ymin"], "yMin")
      const xMax = finiteAttribute(word, ["xMax", "xmax"], "xMax")
      const yMax = finiteAttribute(word, ["yMax", "ymax"], "yMax")
      if (xMin < 0 || yMin < 0 || xMax <= xMin || yMax <= yMin || xMax > width || yMax > height) throw new Error("PDF bbox 文本框超出页面范围")
      textBoxes.push({ page, text, normalizedText: text, x: xMin / width, y: yMin / height, width: (xMax - xMin) / width, height: (yMax - yMin) / height, pageWidth: width, pageHeight: height, rotation, coordinateSpace: "normalized-pdf", order: order++, line: lineOrder++ })
    }
  }
  return { pages, textBoxes }
}
