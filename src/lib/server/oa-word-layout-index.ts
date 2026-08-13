import { createHash } from "node:crypto"
import type { OADocumentRegionKind, OADocumentStructuralLocator, OADocumentWriteTarget } from "@/lib/oa-document-templates"
import type { OoxmlPackage } from "@/lib/server/ooxml-package"
import { childElements, descendantElements, elementLocalName, normalizedWordText, parseWordXml, structuralPath, wordAttribute, wordContextHash, type WordXmlElement } from "@/lib/server/oa-word-xml"

export interface OAWordWritableNode extends OADocumentStructuralLocator {
  id: string
  order: number
  kind: OADocumentRegionKind
  writeTarget: OADocumentWriteTarget
  label: string
  normalizedText: string
  table?: { table: number; row: number; cell: number }
  styleSourcePath?: string
}

const NARRATIVE_LABELS = ["基本概况", "主要做法", "创新成效", "应用情况", "推广价值"]

function normalized(value: string) {
  return value.normalize("NFKC").replace(/[\u00a0\u3000]/g, " ").replace(/\s+/g, " ").trim()
}

function cleanLabel(value: string) {
  return normalized(value).replace(/[：:]\s*$/g, "").replace(/[（(](?:[^）)]*(?:不超过|最多|限)[^）)]*)[）)]/g, "").replace(/[_＿.·…\s]+$/g, "").trim().slice(0, 200) || "未命名字段"
}

function isBlank(value: string) {
  return !value || /^(?:_{3,}|＿{3,}|\.{4,}|…{2,})$/.test(value)
}

function closest(element: WordXmlElement, name: string) {
  let current: WordXmlElement | null = element
  while (current) {
    if (elementLocalName(current) === name) return current
    current = current.parentNode?.nodeType === 1 ? current.parentNode as WordXmlElement : null
  }
  return null
}

function previousText(element: WordXmlElement) {
  let current = element.previousSibling
  while (current) {
    if (current.nodeType === 1) {
      const text = normalizedWordText(current)
      if (text) return text
    }
    current = current.previousSibling
  }
  return ""
}

function stableId(locator: OADocumentStructuralLocator, writeTarget: OADocumentWriteTarget, label: string) {
  return `binding_${createHash("sha256").update(`${locator.partName}|${locator.path}|${locator.contextHash}|${writeTarget}|${normalized(label)}`).digest("hex").slice(0, 20)}`
}

function packageParts(pkg: OoxmlPackage) {
  return [...pkg.entries.keys()].filter((name) => name === "word/document.xml" || /^word\/(?:header|footer)\d+\.xml$/i.test(name)).sort((left, right) => left === "word/document.xml" ? -1 : right === "word/document.xml" ? 1 : left.localeCompare(right, "en-US"))
}

export function indexWordWritableNodes(pkg: OoxmlPackage): OAWordWritableNode[] {
  const result: OAWordWritableNode[] = []
  let order = 0
  const add = (partName: string, element: WordXmlElement, input: Omit<OAWordWritableNode, keyof OADocumentStructuralLocator | "id" | "order">) => {
    const locator = { partName, path: structuralPath(element), contextHash: wordContextHash(element) }
    result.push({ ...locator, id: stableId(locator, input.writeTarget, input.label), order: order++, ...input })
  }
  for (const partName of packageParts(pkg)) {
    const document = parseWordXml(pkg.readText(partName))
    const tables = descendantElements(document, "tbl")
    tables.forEach((table, tableIndex) => {
      const rows = childElements(table, "tr")
      rows.forEach((row, rowIndex) => {
        const cells = childElements(row, "tc")
        cells.forEach((cell, cellIndex) => {
          const value = normalized(normalizedWordText(cell))
          if (!isBlank(value)) return
          const labelCell = cells.slice(0, cellIndex).reverse().find((candidate) => normalizedWordText(candidate))
          if (!labelCell) return
          const label = cleanLabel(normalizedWordText(labelCell))
          add(partName, cell, { kind: "table_cell", writeTarget: "table-cell", label, normalizedText: normalized(normalizedWordText(labelCell)), table: { table: tableIndex + 1, row: rowIndex + 1, cell: cellIndex + 1 }, styleSourcePath: structuralPath(cell) })
        })
        if (rowIndex > 0) {
          const headers = childElements(rows[rowIndex - 1], "tc")
          if (headers.length >= 2 && headers.length === cells.length && headers.every((cell) => normalizedWordText(cell)) && cells.every((cell) => isBlank(normalized(normalizedWordText(cell))))) {
            const labels = headers.map((cell) => cleanLabel(normalizedWordText(cell)))
            add(partName, row, { kind: "repeat_row", writeTarget: "repeat-row", label: `明细表（${labels.join("、")}）`, normalizedText: normalized(labels.join(" ")), table: { table: tableIndex + 1, row: rowIndex + 1, cell: 0 }, styleSourcePath: structuralPath(row) })
          }
        }
      })
    })

    for (const paragraph of descendantElements(document, "p")) {
      if (closest(paragraph, "sdt")) continue
      const paragraphText = normalized(normalizedWordText(paragraph))
      const choiceMarks = [...paragraphText.matchAll(/[□☐○◯]([^□☐○◯●■]+)/g)].map((match) => normalized(match[1]).replace(/[（(].*$/, "")).filter(Boolean)
      if (choiceMarks.length >= 2) {
        const label = cleanLabel(paragraphText.split(/[：:]/, 1)[0] || "选项")
        const radio = /[○◯]/.test(paragraphText)
        add(partName, paragraph, { kind: radio ? "radio_group" : "checkbox_group", writeTarget: "choice", label, normalizedText: paragraphText, styleSourcePath: structuralPath(paragraph) })
      }
      for (const run of descendantElements(paragraph, "r")) {
        if (closest(run, "sdt")) continue
        const text = normalized(normalizedWordText(run))
        const underlined = descendantElements(run, "u").some((underline) => (wordAttribute(underline, "val") || "single") !== "none")
        if (!underlined && !/^(?:_{3,}|＿{3,}|\.{4,}|…{2,})$/.test(text)) continue
        const preceding = previousText(run) || paragraphText.replace(text, "")
        const label = cleanLabel(preceding || "填写内容")
        add(partName, run, { kind: "underline", writeTarget: "inline-run", label, normalizedText: normalized(preceding), styleSourcePath: structuralPath(run) })
      }
      const boundedInstruction = /(?:不超过|最多|限)\s*\d{1,6}\s*(?:个?字|字符)/.test(paragraphText)
      const narrativeLabel = NARRATIVE_LABELS.find((label) => paragraphText.includes(label))
      if (narrativeLabel || boundedInstruction) {
        const label = cleanLabel(narrativeLabel || paragraphText)
        add(partName, paragraph, { kind: "label_blank", writeTarget: "paragraph-after", label, normalizedText: paragraphText, styleSourcePath: structuralPath(paragraph) })
      }
    }
  }
  return result
}
