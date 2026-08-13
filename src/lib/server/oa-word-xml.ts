import { createHash } from "node:crypto"
import {
  DOMParser,
  XMLSerializer,
  type Document as XmlDocument,
  type Element as XmlElement,
  type Node as XmlNode,
} from "@xmldom/xmldom"

export type WordXmlDocument = XmlDocument
export type WordXmlElement = XmlElement
export type WordXmlNode = XmlNode

export const WORDPROCESSINGML_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

export interface WordXmlNodeInfo {
  element: XmlElement
  localName: string
  path: string
  contextHash: string
  text: string
  order: number
}

function safeLocalName(node: XmlNode) {
  return (node.localName || node.nodeName.split(":").at(-1) || "").toLocaleLowerCase("en-US")
}

export function parseWordXml(xml: string): XmlDocument {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Word XML 不允许 DTD 或实体声明")
  const errors: string[] = []
  const document = new DOMParser({
    onError: (level, message) => {
      if (level !== "warning") errors.push(String(message))
    },
  }).parseFromString(xml, "application/xml")
  if (errors.length || !document.documentElement || safeLocalName(document.documentElement) === "parsererror") {
    throw new Error(`Word XML 解析失败${errors[0] ? `：${errors[0]}` : ""}`)
  }
  return document
}

export function serializeWordXml(document: XmlDocument) {
  return new XMLSerializer().serializeToString(document)
}

export function childElements(node: XmlNode, localName?: string) {
  const result: XmlElement[] = []
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.nodeType !== 1) continue
    if (!localName || safeLocalName(child) === localName.toLocaleLowerCase("en-US")) result.push(child as XmlElement)
  }
  return result
}

export function descendantElements(node: XmlNode, localName?: string) {
  const result: XmlElement[] = []
  const expected = localName?.toLocaleLowerCase("en-US")
  const visit = (parent: XmlNode) => {
    for (let child = parent.firstChild; child; child = child.nextSibling) {
      if (child.nodeType !== 1) continue
      if (!expected || safeLocalName(child) === expected) result.push(child as XmlElement)
      visit(child)
    }
  }
  visit(node)
  return result
}

export function elementLocalName(element: XmlElement) {
  return safeLocalName(element)
}

export function normalizedWordText(node: XmlNode) {
  return descendantElements(node, "t")
    .map((element) => element.textContent || "")
    .join("")
    .replace(/[\u00a0\u3000]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function wordAttribute(element: XmlElement, localName: string) {
  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index)
    if (attribute && safeLocalName(attribute) === localName.toLocaleLowerCase("en-US")) return attribute.value
  }
  return null
}

export function setWordAttribute(element: XmlElement, localName: string, value: string) {
  const prefix = element.prefix || "w"
  element.setAttributeNS(WORDPROCESSINGML_NS, `${prefix}:${localName}`, value)
}

export function structuralPath(element: XmlElement) {
  const segments: string[] = []
  let current: XmlElement | null = element
  while (current) {
    const name = safeLocalName(current)
    let position = 1
    let sibling = current.previousSibling
    while (sibling) {
      if (sibling.nodeType === 1 && safeLocalName(sibling) === name) position += 1
      sibling = sibling.previousSibling
    }
    segments.push(`${name}[${position}]`)
    current = current.parentNode?.nodeType === 1 ? current.parentNode as XmlElement : null
  }
  return `/${segments.reverse().join("/")}`
}

export function wordContextHash(element: XmlElement) {
  const text = normalizedWordText(element).normalize("NFKC")
  const childShape = childElements(element).map((child) => safeLocalName(child)).join(",")
  const semanticAttrs = ["name", "tag", "val"].map((name) => wordAttribute(element, name) || "").join("|")
  return createHash("sha256").update(`${safeLocalName(element)}|${text}|${childShape}|${semanticAttrs}`).digest("hex").slice(0, 16)
}

export function inspectWordXmlPart(xml: string): WordXmlNodeInfo[] {
  const document = parseWordXml(xml)
  const root = document.documentElement
  if (!root) throw new Error("Word XML 缺少根元素")
  const result: WordXmlNodeInfo[] = []
  let order = 0
  const visit = (element: XmlElement) => {
    result.push({
      element,
      localName: safeLocalName(element),
      path: structuralPath(element),
      contextHash: wordContextHash(element),
      text: normalizedWordText(element),
      order: order++,
    })
    for (const child of childElements(element)) visit(child)
  }
  visit(root)
  return result
}

export function findElementByStructuralPath(document: XmlDocument, path: string) {
  const segments = path.split("/").filter(Boolean).map((segment) => {
    const match = /^([a-zA-Z][a-zA-Z0-9_-]*)\[(\d+)\]$/.exec(segment)
    if (!match) throw new Error(`Word 结构路径无效：${path}`)
    return { localName: match[1].toLocaleLowerCase("en-US"), index: Number(match[2]) }
  })
  if (!segments.length) throw new Error(`Word 结构路径无效：${path}`)
  let current: XmlElement | null = document.documentElement
  if (!current) return null
  if (safeLocalName(current) !== segments[0].localName || segments[0].index !== 1) return null
  for (const segment of segments.slice(1)) {
    if (!current) return null
    const candidates = childElements(current, segment.localName)
    current = candidates[segment.index - 1] || null
    if (!current) return null
  }
  return current
}

export function createWordElement(document: XmlDocument, localName: string) {
  const prefix = document.documentElement?.prefix || "w"
  return document.createElementNS(WORDPROCESSINGML_NS, `${prefix}:${localName}`)
}

export function cloneElementDeep<T extends XmlElement>(element: T) {
  return element.cloneNode(true) as T
}
