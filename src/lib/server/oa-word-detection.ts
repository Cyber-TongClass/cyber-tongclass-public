import { createHash } from "node:crypto"
import {
  createStableDocumentFieldId,
  OA_DOCUMENT_LIMITS,
  type OADocumentAnswerType,
  type OADocumentBindingCandidate,
  type OADocumentRegionKind,
  type OADocumentSuggestion,
  type OADocumentSuggestionConfidence,
} from "@/lib/oa-document-templates"
import { readOoxmlPackage, type OoxmlPackage } from "@/lib/server/ooxml-package"
import {
  childElements,
  descendantElements,
  elementLocalName,
  inspectWordXmlPart,
  normalizedWordText,
  parseWordXml,
  structuralPath,
  wordAttribute,
  wordContextHash,
  type WordXmlElement,
} from "@/lib/server/oa-word-xml"

interface Candidate {
  partName: string
  path: string
  contextHash: string
  order: number
  kind: OADocumentRegionKind
  label: string
  inferredAnswerType: OADocumentAnswerType
  confidence: OADocumentSuggestionConfidence
  evidence: string[]
  fieldId?: string
  required?: boolean
  maxLength?: number
  options?: string[]
}

const PARAGRAPH_AFTER_LABELS = ["基本概况", "主要做法", "创新成效", "应用情况", "推广价值"]

function stableId(candidate: Candidate) {
  return `region_${createHash("sha256").update(`${candidate.partName}|${candidate.path}|${candidate.kind}|${candidate.label.normalize("NFKC")}`).digest("hex").slice(0, 16)}`
}

function cleanLabel(value: string) {
  return value.replace(/[：:]\s*$/, "").replace(/[（(][^）)]*(?:字|选)[^）)]*[）)]/g, "").replace(/[_＿.·…\s]+$/g, "").trim().slice(0, 200) || "未命名字段"
}

function inferAnswerType(label: string): OADocumentAnswerType {
  if (/(日期|时间|年月日|出生)/.test(label)) return "date"
  if (/(数量|人数|金额|经费|分数|年度|年级)/.test(label)) return "number"
  if (/(邮箱|电子邮件|email)/i.test(label)) return "email"
  if (/(电话|手机|联系方式)/.test(label)) return "phone"
  if (/(说明|简介|事迹|理由|意见|内容|摘要)/.test(label)) return "textarea"
  if (/(附件|证明材料|文件)/.test(label)) return "file"
  return "text"
}

function instructionHints(text: string) {
  const length = /(?:不超过|最多|限)\s*(\d{1,6})\s*(?:个?字|字符)/.exec(text)
  const required = /(?:必填|必须|请务必)/.test(text) ? true : undefined
  return { maxLength: length ? Number(length[1]) : undefined, required }
}

function isBlankRegionText(value: string) {
  return !value || /^(?:_{3,}|＿{3,}|\.{4,}|…{2,})$/.test(value.trim())
}

function previousElementSibling(element: WordXmlElement) {
  let node = element.previousSibling
  while (node && node.nodeType !== 1) node = node.previousSibling
  return node as WordXmlElement | null
}

function closestAncestor(element: WordXmlElement, localName: string) {
  let current: WordXmlElement | null = element
  while (current) {
    if (elementLocalName(current) === localName) return current
    current = current.parentNode?.nodeType === 1 ? current.parentNode as WordXmlElement : null
  }
  return null
}

function pushCandidate(candidates: Candidate[], candidate: Candidate) {
  if (candidates.length >= OA_DOCUMENT_LIMITS.maxDetectedRegions) return
  candidates.push(candidate)
}

function detectPart(partName: string, xml: string) {
  const document = parseWordXml(xml)
  const inspected = inspectWordXmlPart(xml)
  const orderByPath = new Map(inspected.map((item) => [item.path, item.order]))
  const candidates: Candidate[] = []
  const base = (element: WordXmlElement) => ({
    partName,
    path: structuralPath(element),
    contextHash: wordContextHash(element),
    order: orderByPath.get(structuralPath(element)) || 0,
  })

  for (const sdt of descendantElements(document, "sdt")) {
    const tagElement = descendantElements(sdt, "tag")[0]
    const aliasElement = descendantElements(sdt, "alias")[0]
    const tag = tagElement ? wordAttribute(tagElement, "val") || "" : ""
    const alias = aliasElement ? wordAttribute(aliasElement, "val") || "" : ""
    const taggedId = /^oa-field:([a-zA-Z][a-zA-Z0-9_-]{0,127})$/.exec(tag)?.[1]
    pushCandidate(candidates, {
      ...base(sdt), kind: "content_control", label: cleanLabel(alias || taggedId || normalizedWordText(sdt) || "已有内容控件"),
      inferredAnswerType: "text", confidence: taggedId ? "high" : "medium", evidence: [taggedId ? "检测到平台字段内容控件" : "检测到 Word 内容控件"], fieldId: taggedId,
    })
  }

  for (const bookmark of descendantElements(document, "bookmarkStart")) {
    const name = wordAttribute(bookmark, "name") || ""
    if (!name || name.startsWith("_")) continue
    pushCandidate(candidates, { ...base(bookmark), kind: "bookmark", label: cleanLabel(name), inferredAnswerType: inferAnswerType(name), confidence: "medium", evidence: ["检测到命名书签"] })
  }

  for (const table of descendantElements(document, "tbl")) {
    const rows = childElements(table, "tr")
    for (const row of rows) {
      const cells = childElements(row, "tc")
      cells.forEach((cell, index) => {
        const text = normalizedWordText(cell)
        if (!isBlankRegionText(text)) return
        const labelCell = cells.slice(0, index).reverse().find((candidate) => normalizedWordText(candidate))
        if (!labelCell) return
        const rawLabel = normalizedWordText(labelCell)
        const hints = instructionHints(rawLabel)
        pushCandidate(candidates, {
          ...base(cell), kind: "table_cell", label: cleanLabel(rawLabel), inferredAnswerType: inferAnswerType(rawLabel), confidence: "high",
          evidence: ["空白表格单元格位于标签右侧"], ...hints,
        })
      })
    }
    if (rows.length >= 2) {
      for (let index = 1; index < rows.length; index += 1) {
        const headerCells = childElements(rows[index - 1], "tc")
        const rowCells = childElements(rows[index], "tc")
        if (headerCells.length < 2 || headerCells.length !== rowCells.length) continue
        if (!headerCells.every((cell) => normalizedWordText(cell)) || !rowCells.every((cell) => isBlankRegionText(normalizedWordText(cell)))) continue
        const labels = headerCells.map((cell) => cleanLabel(normalizedWordText(cell)))
        pushCandidate(candidates, {
          ...base(rows[index]), kind: "repeat_row", label: `明细表（${labels.join("、")}）`, inferredAnswerType: "textarea", confidence: "medium",
          evidence: ["表头下方存在完整空白原型行", "批量聚合前需管理员确认重复行"],
        })
      }
    }
  }

  for (const paragraph of descendantElements(document, "p")) {
    if (closestAncestor(paragraph, "sdt")) continue
    const text = normalizedWordText(paragraph)
    const checkboxMatches = [...text.matchAll(/[□☐]([^□☐○◯●■]+)/g)].map((match) => match[1].trim()).filter(Boolean)
    const radioMatches = [...text.matchAll(/[○◯]([^□☐○◯●■]+)/g)].map((match) => match[1].trim()).filter(Boolean)
    const matches = radioMatches.length >= 2 ? radioMatches : checkboxMatches
    if (matches.length >= 2) {
      const colonIndex = text.search(/[：:]/)
      const label = cleanLabel(colonIndex >= 0 ? text.slice(0, colonIndex) : "选项")
      pushCandidate(candidates, {
        ...base(paragraph), kind: radioMatches.length >= 2 || /单选/.test(text) ? "radio_group" : "checkbox_group", label,
        inferredAnswerType: radioMatches.length >= 2 || /单选/.test(text) ? "single_choice" : "multiple_choice", confidence: "high",
        evidence: ["同一段落包含多个选择标记"], options: matches.map((value) => value.replace(/[（(].*$/, "").trim()),
      })
    }

    for (const run of descendantElements(paragraph, "r")) {
      if (closestAncestor(run, "sdt")) continue
      const runText = normalizedWordText(run)
      const underlined = descendantElements(run, "u").some((underline) => (wordAttribute(underline, "val") || "single") !== "none")
      const leader = /(?:_{3,}|＿{3,}|\.{4,}|…{2,})/.test(runText)
      if (!underlined && !leader) continue
      const previous = previousElementSibling(run)
      const precedingText = previous ? normalizedWordText(previous) : text.replace(runText, "")
      const rawLabel = cleanLabel(precedingText || "填写内容")
      const hints = instructionHints(`${precedingText} ${text}`)
      pushCandidate(candidates, {
        ...base(run), kind: "underline", label: rawLabel, inferredAnswerType: inferAnswerType(rawLabel), confidence: underlined ? "high" : "medium",
        evidence: [underlined ? "检测到带下划线的填写区域" : "检测到连续引导符空白"], ...hints,
      })
    }

    if (/[：:]\s*$/.test(text) && !/[□☐○◯]/.test(text)) {
      const label = cleanLabel(text)
      const hints = instructionHints(text)
      pushCandidate(candidates, {
        ...base(paragraph), kind: "label_blank", label, inferredAnswerType: inferAnswerType(label), confidence: "medium",
        evidence: ["段落以标签冒号结尾"], ...hints,
      })
    } else {
      const paragraphAfterLabel = PARAGRAPH_AFTER_LABELS.find((label) => text.includes(label))
      const boundedInstruction = /(?:不超过|最多|限)\s*\d{1,6}\s*(?:个?字|字符)/.test(text)
      if (paragraphAfterLabel || boundedInstruction) {
        const label = cleanLabel(paragraphAfterLabel || text)
        const hints = instructionHints(text)
        pushCandidate(candidates, {
          ...base(paragraph), kind: "label_blank", label, inferredAnswerType: "textarea", confidence: "medium",
          evidence: [paragraphAfterLabel ? "检测到叙述类填写说明段落" : "检测到带长度限制的填写说明段落", "答案应写入下一段而非说明文字"], ...hints,
        })
      }
    }
  }

  return candidates
}

function packageParts(pkg: OoxmlPackage) {
  return [...pkg.entries.keys()]
    .filter((name) => name === "word/document.xml" || /^word\/(?:header|footer)\d+\.xml$/i.test(name))
    .sort((left, right) => left === "word/document.xml" ? -1 : right === "word/document.xml" ? 1 : left.localeCompare(right, "en"))
}

export function detectWordFormRegions(
  input: Uint8Array | Buffer | OoxmlPackage,
  bindingCandidates?: readonly OADocumentBindingCandidate[] | ReadonlyMap<string, readonly OADocumentBindingCandidate[]>,
): OADocumentSuggestion[] {
  const pkg = typeof (input as OoxmlPackage).readText === "function" ? input as OoxmlPackage : readOoxmlPackage(input as Uint8Array)
  const candidates = packageParts(pkg).flatMap((partName) => detectPart(partName, pkg.readText(partName)))
  const withIds = candidates.map((candidate) => ({ ...candidate, id: stableId(candidate) }))
  const candidateKey = (candidate: Pick<OADocumentBindingCandidate, "partName" | "path" | "contextHash">) => `${candidate.partName}|${candidate.path}|${candidate.contextHash}`
  const candidatesByLocator = new Map<string, readonly OADocumentBindingCandidate[]>()
  if (bindingCandidates) {
    if (typeof (bindingCandidates as ReadonlyMap<string, readonly OADocumentBindingCandidate[]>).get === "function") {
      for (const [key, values] of bindingCandidates as ReadonlyMap<string, readonly OADocumentBindingCandidate[]>) candidatesByLocator.set(key, values)
    } else {
      for (const candidate of bindingCandidates as readonly OADocumentBindingCandidate[]) {
        const key = candidateKey(candidate)
        candidatesByLocator.set(key, [...(candidatesByLocator.get(key) || []), candidate])
      }
    }
  }
  const conflictsById = new Map<string, string[]>()
  for (let index = 0; index < withIds.length; index += 1) {
    const current = withIds[index]
    const conflicts = withIds.filter((other, otherIndex) => otherIndex !== index && other.partName === current.partName && (other.path === current.path || other.path.startsWith(`${current.path}/`) || current.path.startsWith(`${other.path}/`)))
    if (conflicts.length) conflictsById.set(current.id, conflicts.map((item) => item.id).sort())
  }
  return withIds
    .sort((left, right) => packageParts(pkg).indexOf(left.partName) - packageParts(pkg).indexOf(right.partName) || left.order - right.order || left.kind.localeCompare(right.kind))
    .map((candidate) => {
      const conflictIds = conflictsById.get(candidate.id) || []
      const fieldId = candidate.fieldId || createStableDocumentFieldId(candidate.label, `${candidate.partName}|${candidate.path}|${candidate.kind}`)
      const bindings = [...(candidatesByLocator.get(candidateKey(candidate)) || [])].sort((left, right) => left.id.localeCompare(right.id, "en-US"))
      const hasBindingInput = bindingCandidates !== undefined
      const reviewState = hasBindingInput
        ? bindings.length > 1 || conflictIds.length ? "conflict" : bindings.length === 1 ? "confirmed" : "unresolved"
        : conflictIds.length ? "conflict" : candidate.kind === "repeat_row" || candidate.confidence !== "high" ? "unresolved" : "confirmed"
      return {
        id: candidate.id,
        partName: candidate.partName,
        path: candidate.path,
        contextHash: candidate.contextHash,
        kind: candidate.kind,
        label: candidate.label,
        inferredAnswerType: candidate.inferredAnswerType,
        confidence: candidate.confidence,
        reviewState,
        evidence: candidate.evidence,
        conflictIds,
        fieldId,
        ...(bindings.length === 1 ? { visual: bindings[0].visual } : {}),
        ...(hasBindingInput ? { bindingCandidateIds: bindings.map((binding) => binding.id) } : {}),
        ...(candidate.required !== undefined ? { required: candidate.required } : {}),
        ...(candidate.maxLength !== undefined ? { maxLength: candidate.maxLength } : {}),
        ...(candidate.options?.length ? { options: candidate.options } : {}),
      } satisfies OADocumentSuggestion
    })
}
