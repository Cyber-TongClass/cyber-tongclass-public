import { createHash } from "node:crypto"
import type { OADocumentRegionKind, OADocumentStructuralLocator, OADocumentWriteTarget } from "@/lib/oa-document-templates"
import type { OoxmlPackage } from "@/lib/server/ooxml-package"
import { extractGroupedWordChoiceOptions } from "@/lib/server/oa-word-choice"
import { genericNarrativeHeading, looksLikeNarrativeInstruction } from "@/lib/server/oa-word-narrative"
import { childElements, descendantElements, elementLocalName, inspectWordXmlPart, normalizedWordText, parseWordXml, structuralPath, wordAttribute, wordContextHash, type WordXmlElement } from "@/lib/server/oa-word-xml"

export interface OAWordWritableNode extends OADocumentStructuralLocator {
  id: string
  order: number
  kind: OADocumentRegionKind
  writeTarget: OADocumentWriteTarget
  label: string
  normalizedText: string
  existingText?: string
  options?: string[]
  columns?: Array<{ id: string; label: string; type: "text" | "number" | "date"; required?: boolean }>
  table?: { table: number; row: number; cell: number }
  styleSourcePath?: string
}

const NARRATIVE_LABELS = ["基本概况", "主要做法", "应用成效", "创新点", "创新成效", "应用情况"]
const EVIDENCE_LABELS = ["相关佐证材料", "佐证材料", "证明材料"]

function normalized(value: string) {
  return value.normalize("NFKC").replace(/[\u00a0\u3000]/g, " ").replace(/\s+/g, " ").trim()
}

function cleanLabel(value: string) {
  return normalized(value).replace(/[：:]\s*$/g, "").replace(/[（(](?:[^）)]*(?:不超过|最多|限)[^）)]*)[）)]/g, "").replace(/[_＿.·…\s]+$/g, "").trim().slice(0, 200) || "未命名字段"
}

function isBlank(value: string) {
  return !value || /^(?:_{3,}|＿{3,}|\.{4,}|…{2,})$/.test(value)
}

function choiceOptions(element: WordXmlElement) {
  return extractGroupedWordChoiceOptions(descendantElements(element, "p").map((paragraph) => normalizedWordText(paragraph)))
}

function looksInstructionalAnswer(value: string) {
  return value.length <= 500 && /(?:不超过|以内|最多|限\s*\d|简述|请(?:填写|说明|概述)|阐述|总结)/.test(value)
}

function contextualTableLabel(section: string, cells: WordXmlElement[], labelIndex: number) {
  const raw = cleanLabel(normalizedWordText(cells[labelIndex]))
  const role = /^(?:职务|联系方式)$/.test(raw)
    ? cells.slice(0, labelIndex).reverse().map((cell) => cleanLabel(normalizedWordText(cell))).find((value) => /^(?:负责人|联系人)$/.test(value))
    : undefined
  return [section, role, raw].filter(Boolean).join(" · ") || raw
}

function exactHeadingLabel(value: string, labels: string[]) {
  const heading = cleanLabel(normalized(value).replace(/^[一二三四五六七八九十0-9]+[、.．]\s*/, ""))
  return labels.find((label) => heading === label)
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
  const values: string[] = []
  let current = element.previousSibling
  while (current) {
    if (current.nodeType === 1) {
      const text = normalizedWordText(current)
      if (text) values.unshift(text)
    }
    current = current.previousSibling
  }
  return values.join("")
}

function stableId(locator: OADocumentStructuralLocator, writeTarget: OADocumentWriteTarget, label: string) {
  return `binding_${createHash("sha256").update(`${locator.partName}|${locator.path}|${locator.contextHash}|${writeTarget}|${normalized(label)}`).digest("hex").slice(0, 20)}`
}

function packageParts(pkg: OoxmlPackage) {
  return [...pkg.entries.keys()].filter((name) => name === "word/document.xml" || /^word\/(?:header|footer)\d+\.xml$/i.test(name)).sort((left, right) => left === "word/document.xml" ? -1 : right === "word/document.xml" ? 1 : left.localeCompare(right, "en-US"))
}

export function indexWordWritableNodes(pkg: OoxmlPackage): OAWordWritableNode[] {
  const result: OAWordWritableNode[] = []
  const orderByLocator = new Map<string, number>()
  let fallbackOrder = 1_000_000_000
  const add = (partName: string, element: WordXmlElement, input: Omit<OAWordWritableNode, keyof OADocumentStructuralLocator | "id" | "order">) => {
    const locator = { partName, path: structuralPath(element), contextHash: wordContextHash(element) }
    result.push({ ...locator, id: stableId(locator, input.writeTarget, input.label), order: orderByLocator.get(`${partName}|${locator.path}`) ?? fallbackOrder++, ...input })
  }
  let partOffset = 0
  for (const partName of packageParts(pkg)) {
    const xml = pkg.readText(partName)
    const inspected = inspectWordXmlPart(xml)
    for (const item of inspected) orderByLocator.set(`${partName}|${item.path}`, partOffset + item.order)
    partOffset += inspected.length + 1
    const document = parseWordXml(xml)
    const tables = descendantElements(document, "tbl")
    const groupedChoiceCells = new Set<WordXmlElement>()
    tables.forEach((table, tableIndex) => {
      const rows = childElements(table, "tr")
      let section = ""
      rows.forEach((row, rowIndex) => {
        const cells = childElements(row, "tc")
        if (cells.length === 1) {
          const heading = cleanLabel(normalizedWordText(cells[0]))
          const gridSpan = descendantElements(cells[0], "gridSpan")[0]
          if (heading && (gridSpan || /(?:基本信息|单位信息)/.test(heading))) section = heading
        }
        cells.forEach((cell, cellIndex) => {
          const value = normalized(normalizedWordText(cell))
          const labelCell = cells.slice(0, cellIndex).reverse().find((candidate) => normalizedWordText(candidate))
          if (!labelCell) return
          const labelIndex = cells.indexOf(labelCell)
          const rawLabel = cleanLabel(normalizedWordText(labelCell))
          const options = choiceOptions(cell)
          if (options.length >= 2) {
            const radio = /[○◯]/.test(value) && !/[□☐]/.test(value)
            add(partName, cell, { kind: radio ? "radio_group" : "checkbox_group", writeTarget: "choice", label: rawLabel, normalizedText: normalized(normalizedWordText(labelCell)), options, table: { table: tableIndex + 1, row: rowIndex + 1, cell: cellIndex + 1 }, styleSourcePath: structuralPath(cell) })
            groupedChoiceCells.add(cell)
            return
          }
          if (!isBlank(value) && !looksInstructionalAnswer(value)) return
          const label = contextualTableLabel(section, cells, labelIndex)
          add(partName, cell, {
            kind: "table_cell", writeTarget: "table-cell", label,
            normalizedText: normalized(normalizedWordText(labelCell)),
            ...(value ? { existingText: value } : {}),
            table: { table: tableIndex + 1, row: rowIndex + 1, cell: cellIndex + 1 },
            styleSourcePath: structuralPath(cell),
          })
        })
        if (rowIndex > 0) {
          const headers = childElements(rows[rowIndex - 1], "tc")
          if (headers.length >= 2 && headers.length === cells.length && headers.every((cell) => normalizedWordText(cell)) && cells.every((cell) => isBlank(normalized(normalizedWordText(cell))))) {
            const labels = headers.map((cell) => cleanLabel(normalizedWordText(cell)))
            add(partName, row, { kind: "repeat_row", writeTarget: "repeat-row", label: `明细表（${labels.join("、")}）`, normalizedText: normalized(labels.join(" ")), columns: labels.map((label, index) => ({ id: `column_${index + 1}`, label, type: /起止/.test(label) ? "text" : /(?:日期|年月|时间)/.test(label) ? "date" : /(?:数量|人数|金额|分数)/.test(label) ? "number" : "text" })), table: { table: tableIndex + 1, row: rowIndex + 1, cell: 0 }, styleSourcePath: structuralPath(row) })
          }
        }
      })
    })

    const paragraphs = descendantElements(document, "p")
    for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
      const paragraph = paragraphs[paragraphIndex]
      if (closest(paragraph, "sdt")) continue
      const paragraphText = normalized(normalizedWordText(paragraph))
      const tableCell = closest(paragraph, "tc")
      if (tableCell && groupedChoiceCells.has(tableCell)) continue
      const signatureContext = paragraphs.slice(Math.max(0, paragraphIndex - 8), paragraphIndex)
        .some((candidate) => /(?:亲笔签名|提名人声明|签署)/.test(normalizedWordText(candidate)))
      if (signatureContext) {
        const dateRun = descendantElements(paragraph, "r").find((run) => /^年\s*月\s*日$/.test(normalized(normalizedWordText(run))))
        if (dateRun) add(partName, dateRun, { kind: "label_blank", writeTarget: "inline-run", label: "签署日期", normalizedText: normalized(normalizedWordText(dateRun)), styleSourcePath: structuralPath(dateRun) })
      }
      const choiceMarks = [...paragraphText.matchAll(/[□☐○◯]([^□☐○◯●■]+)/g)].map((match) => normalized(match[1]).replace(/[（(].*$/, "")).filter(Boolean)
      if (choiceMarks.length >= 2) {
        const label = cleanLabel(paragraphText.split(/[：:]/, 1)[0] || "选项")
        const radio = /[○◯]/.test(paragraphText)
        add(partName, paragraph, { kind: radio ? "radio_group" : "checkbox_group", writeTarget: "choice", label, normalizedText: normalized(label), options: choiceMarks, styleSourcePath: structuralPath(paragraph) })
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
      if (tableCell) {
        const heading = genericNarrativeHeading(paragraphText)
        if (heading) {
          const table = closest(paragraph, "tbl")
          const target = paragraphs.slice(paragraphIndex + 1).find((candidate) => closest(candidate, "tbl") === table)
          const targetText = target ? normalizedWordText(target) : ""
          if (target && (!normalized(targetText) || looksLikeNarrativeInstruction(targetText))) {
            const targetIsBlank = !normalized(targetText)
            add(partName, target, { kind: "label_blank", writeTarget: targetIsBlank ? "inline-run" : "paragraph-after", label: heading.label, normalizedText: normalized(normalizedWordText(target)), styleSourcePath: structuralPath(target) })
          }
        }
        continue
      }
      const directLabel = NARRATIVE_LABELS.find((label) => cleanLabel(paragraphText).startsWith(label))
      const boundedInstruction = /(?:(?:不超过|最多|限)\s*\d{1,6}\s*(?:个?字|字符)|\d{1,6}\s*(?:个?字|字符)\s*以内)/.test(paragraphText)
      if (directLabel && (boundedInstruction || /[：:]\s*$/.test(paragraphText))) {
        add(partName, paragraph, { kind: "label_blank", writeTarget: "paragraph-after", label: directLabel, normalizedText: paragraphText, styleSourcePath: structuralPath(paragraph) })
        continue
      }
      const headingLabel = exactHeadingLabel(paragraphText, NARRATIVE_LABELS)
      const evidenceLabel = exactHeadingLabel(paragraphText, EVIDENCE_LABELS)
      if (headingLabel || evidenceLabel) {
        const target = paragraphs.slice(paragraphIndex + 1).find((candidate) => !closest(candidate, "tc") && normalized(normalizedWordText(candidate)))
        if (target) {
          const label = headingLabel || evidenceLabel!
          add(partName, target, { kind: "label_blank", writeTarget: "paragraph-after", label, normalizedText: normalized(normalizedWordText(target)), styleSourcePath: structuralPath(target) })
        }
        continue
      }
    }
  }
  return result
}
