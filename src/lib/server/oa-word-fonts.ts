import { DOMParser, type Element as XmlElement, type Node as XmlNode } from "@xmldom/xmldom"

import type { OoxmlPackage } from "@/lib/server/ooxml-package"

const CONTENT_PART = /^word\/(?:document|header\d+|footer\d+|footnotes|endnotes)\.xml$/

function localName(node: XmlNode) {
  return node.localName || node.nodeName.split(":").at(-1) || ""
}

function elements(node: XmlNode, name: string) {
  const result: XmlElement[] = []
  const stack: XmlNode[] = [node]
  while (stack.length) {
    const current = stack.pop()!
    if (current.nodeType === 1 && localName(current) === name) result.push(current as XmlElement)
    for (let child = current.lastChild; child; child = child.previousSibling) stack.push(child)
  }
  return result
}

function attribute(element: XmlElement, name: string) {
  return element.getAttributeNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", name)
    || element.getAttribute(`w:${name}`)
    || element.getAttribute(name)
    || ""
}

const EAST_ASIAN_CHARACTER = /[\u2e80-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af\uff00-\uffef]/u
const COMPLEX_SCRIPT_CHARACTER = /[\u0590-\u08ff\u0900-\u0dff\u0f00-\u109f]/u
const ASCII_CHARACTER = /[\u0021-\u007e]/u

function renderedScriptFonts(visible: string, font: XmlElement) {
  const characters = [...visible].filter((character) => !/\s/u.test(character))
  const selected: string[] = []
  if (characters.some((character) => ASCII_CHARACTER.test(character))) selected.push(attribute(font, "ascii"))
  if (characters.some((character) => EAST_ASIAN_CHARACTER.test(character))) selected.push(attribute(font, "eastAsia"))
  if (characters.some((character) => COMPLEX_SCRIPT_CHARACTER.test(character))) selected.push(attribute(font, "cs"))
  if (characters.some((character) => (
    !ASCII_CHARACTER.test(character)
    && !EAST_ASIAN_CHARACTER.test(character)
    && !COMPLEX_SCRIPT_CHARACTER.test(character)
  ))) selected.push(attribute(font, "hAnsi"))
  return selected
}

/** Returns fonts used by non-hidden runs that can contribute visible text. */
export function extractDirectWordFonts(pkg: OoxmlPackage) {
  const fonts = new Set<string>()
  for (const name of pkg.entries.keys()) {
    if (!CONTENT_PART.test(name)) continue
    const document = new DOMParser().parseFromString(pkg.readText(name), "application/xml")
    for (const run of elements(document, "r")) {
      const properties = elements(run, "rPr")[0]
      if (!properties || elements(properties, "vanish").length) continue
      const visible = elements(run, "t").map((item) => item.textContent || "").join("")
      if (!visible.trim()) continue
      const font = elements(properties, "rFonts")[0]
      if (!font) continue
      for (const value of renderedScriptFonts(visible, font)) {
        const normalized = value.normalize("NFKC").trim()
        if (normalized && normalized.length <= 200) fonts.add(normalized)
      }
    }
  }
  return [...fonts].sort((left, right) => left.localeCompare(right, "zh-CN"))
}
