import { DOMParser, type Element as XmlElement, type Node as XmlNode } from "@xmldom/xmldom"
import type { OADocumentPageRotation, OADocumentVisualAnchor } from "@/lib/oa-document-templates"

const MAX_BBOX_XML_BYTES = 5 * 1024 * 1024
const MAX_BBOX_ELEMENTS = 100_000
const MAX_BBOX_DEPTH = 256
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

function finiteAttribute(element: XmlElement, names: string[], label: string) {
  const value = names.map((name) => element.getAttribute(name)).find((candidate) => candidate !== null)
  const number = value === null || value === undefined || !value.trim() ? Number.NaN : Number(value)
  if (!Number.isFinite(number)) throw new Error(`PDF bbox ${label}必须是有限数值`)
  return number
}

function normalizeText(value: string) {
  return value.normalize("NFKC").replace(/[\u00a0\u3000]/g, " ").replace(/\s+/g, " ").trim()
}

function directText(element: XmlElement) {
  let value = ""
  for (let child = element.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 3 || child.nodeType === 4) value += child.nodeValue || ""
  }
  return value
}

export function parsePdfBboxXml(xml: string): OAPdfLayout {
  if (Buffer.byteLength(xml, "utf8") > MAX_BBOX_XML_BYTES) throw new Error("PDF bbox XML 大小超过限制")
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("PDF bbox XML 不允许 DTD 或实体声明")
  const errors: string[] = []
  const document = new DOMParser({ onError(level, message) { if (level !== "warning") errors.push(String(message)) } }).parseFromString(xml, "application/xml")
  if (errors.length || !document.documentElement || localName(document.documentElement) === "parsererror") throw new Error("PDF bbox XML 解析失败")
  const pages: OAPdfPageInfo[] = []
  const textBoxes: OAPdfTextBox[] = []
  let order = 0
  let lineOrder = 0
  interface PageContext { page: number; width: number; height: number; rotation: OADocumentPageRotation }
  interface WalkFrame { element: XmlElement; depth: number; page?: PageContext; line?: number }
  const stack: WalkFrame[] = [{ element: document.documentElement, depth: 0 }]
  let elementCount = 0
  while (stack.length) {
    const frame = stack.pop()!
    elementCount += 1
    if (elementCount > MAX_BBOX_ELEMENTS) throw new Error("PDF bbox XML 元素数量超过限制")
    if (frame.depth > MAX_BBOX_DEPTH) throw new Error("PDF bbox XML 嵌套深度超过限制")
    const name = localName(frame.element)
    let page = frame.page
    let line = frame.line
    if (name === "page") {
      if (page) throw new Error("PDF bbox XML 不允许嵌套页面")
      const width = finiteAttribute(frame.element, ["width"], "页面宽度")
      const height = finiteAttribute(frame.element, ["height"], "页面高度")
      const rotationValue = frame.element.getAttribute("rotation") === null ? 0 : finiteAttribute(frame.element, ["rotation"], "页面旋转")
      if (width <= 0 || height <= 0 || ![0, 90, 180, 270].includes(rotationValue)) throw new Error("PDF bbox 页面几何无效")
      if (pages.length >= MAX_PDF_PAGES) throw new Error("PDF bbox 页数无效或超过限制")
      page = { page: pages.length + 1, width, height, rotation: rotationValue as OADocumentPageRotation }
      pages.push(page)
      line = undefined
    } else if (name === "line" && page) {
      line = lineOrder++
    } else if (name === "word" && page) {
      const text = normalizeText(directText(frame.element))
      if (text) {
        const xMin = finiteAttribute(frame.element, ["xMin", "xmin"], "xMin")
        const yMin = finiteAttribute(frame.element, ["yMin", "ymin"], "yMin")
        const xMax = finiteAttribute(frame.element, ["xMax", "xmax"], "xMax")
        const yMax = finiteAttribute(frame.element, ["yMax", "ymax"], "yMax")
        if (xMin < 0 || yMin < 0 || xMax <= xMin || yMax <= yMin || xMax > page.width || yMax > page.height) throw new Error("PDF bbox 文本框超出页面范围")
        textBoxes.push({
          page: page.page, text, normalizedText: text, x: xMin / page.width, y: yMin / page.height,
          width: (xMax - xMin) / page.width, height: (yMax - yMin) / page.height,
          pageWidth: page.width, pageHeight: page.height, rotation: page.rotation, coordinateSpace: "normalized-pdf", order: order++, line: line ?? lineOrder++,
        })
      }
    }
    const children = elementChildren(frame.element)
    for (let index = children.length - 1; index >= 0; index -= 1) stack.push({ element: children[index], depth: frame.depth + 1, page, line })
  }
  if (!pages.length) throw new Error("PDF bbox 页数无效或超过限制")
  return { pages, textBoxes }
}
