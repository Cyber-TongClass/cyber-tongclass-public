import { createHash } from "node:crypto"
import { OA_DOCUMENT_LIMITS, type OADocumentManifestField } from "@/lib/oa-document-templates"
import { readOoxmlPackage } from "@/lib/server/ooxml-package"
import {
  childElements,
  cloneElementDeep,
  createWordElement,
  descendantElements,
  parseWordXml,
  serializeWordXml,
  wordAttribute,
  type WordXmlDocument,
  type WordXmlElement,
} from "@/lib/server/oa-word-xml"

export interface FillWordSubmission {
  fields: OADocumentManifestField[]
  answers: Record<string, unknown>
  fileDisplayNames?: Record<string, string | string[] | undefined>
}

export interface FilledWordTemplate {
  bytes: Buffer
  changedParts: string[]
  untouchedPartSha256: Record<string, string>
}

export interface FillRepeatRowsRequest {
  fields: OADocumentManifestField[]
  repeatFieldId: string
  submissions: Array<{ answers: Record<string, unknown>; fileDisplayNames?: Record<string, string | string[] | undefined> }>
}

function sha256(data: Uint8Array) {
  return createHash("sha256").update(data).digest("hex")
}

function assertPlainRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error(`${label}必须是普通答案对象`)
}

function normalizeString(value: unknown, field: OADocumentManifestField) {
  if (value === null || value === undefined || value === "") return ""
  if (typeof value !== "string") throw new Error(`字段“${field.label}”的答案类型无效`)
  return value.normalize("NFC")
}

function normalizeAnswer(field: OADocumentManifestField, value: unknown, authorizedFileName: string | string[] | undefined) {
  let output = ""
  switch (field.answerType) {
    case "number": {
      if (value === null || value === undefined || value === "") output = ""
      else if (typeof value === "number" && Number.isFinite(value)) output = String(value)
      else if (typeof value === "string" && /^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(value.trim())) output = value.trim()
      else throw new Error(`字段“${field.label}”的数字答案无效`)
      break
    }
    case "date": {
      output = normalizeString(value, field)
      if (output && !/^\d{4}-\d{2}-\d{2}$/.test(output)) throw new Error(`字段“${field.label}”的日期答案无效`)
      break
    }
    case "single_choice": {
      output = normalizeString(value, field)
      if (output && !field.options?.includes(output)) throw new Error(`字段“${field.label}”的选项答案无效`)
      break
    }
    case "multiple_choice": {
      if (value === null || value === undefined || value === "") value = []
      if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new Error(`字段“${field.label}”的多选答案无效`)
      const selected = new Set(value as string[])
      if ([...selected].some((item) => !field.options?.includes(item))) throw new Error(`字段“${field.label}”的多选答案无效`)
      output = (field.options || []).map((option) => `${selected.has(option) ? "☒" : "☐"} ${option}`).join("  ")
      break
    }
    case "file": {
      // Browser answer values and object keys are never treated as trusted names or URLs.
      if (authorizedFileName === undefined) output = ""
      else if (typeof authorizedFileName === "string") output = authorizedFileName
      else if (Array.isArray(authorizedFileName) && authorizedFileName.every((item) => typeof item === "string")) output = authorizedFileName.join("；")
      else throw new Error(`字段“${field.label}”的授权文件名无效`)
      break
    }
    default:
      output = normalizeString(value, field)
  }
  if (field.maxLength !== undefined && [...output].length > field.maxLength) throw new Error(`字段“${field.label}”的答案长度超过 ${field.maxLength}`)
  return output
}

function sdtTag(sdt: WordXmlElement) {
  const properties = childElements(sdt, "sdtPr")[0]
  const tag = properties && childElements(properties, "tag")[0]
  return tag ? wordAttribute(tag, "val") || "" : ""
}

function createTextRuns(document: WordXmlDocument, value: string, prototypeRunProperties?: WordXmlElement) {
  const segments = value.split(/\r?\n/)
  const fragment = document.createDocumentFragment()
  segments.forEach((segment, index) => {
    if (index > 0) {
      const breakRun = createWordElement(document, "r")
      if (prototypeRunProperties) breakRun.appendChild(cloneElementDeep(prototypeRunProperties))
      breakRun.appendChild(createWordElement(document, "br"))
      fragment.appendChild(breakRun)
    }
    const run = createWordElement(document, "r")
    if (prototypeRunProperties) run.appendChild(cloneElementDeep(prototypeRunProperties))
    const text = createWordElement(document, "t")
    if (/^\s|\s$|\s{2}/.test(segment)) text.setAttribute("xml:space", "preserve")
    text.appendChild(document.createTextNode(segment))
    run.appendChild(text)
    fragment.appendChild(run)
  })
  return fragment
}

function fillSdtElement(sdt: WordXmlElement, value: string) {
  const document = sdt.ownerDocument
  if (!document) throw new Error("内容控件缺少所属文档")
  let content = childElements(sdt, "sdtContent")[0]
  if (!content) {
    content = createWordElement(document, "sdtContent")
    sdt.appendChild(content)
  }
  const existingParagraph = descendantElements(content, "p")[0]
  const existingRun = descendantElements(content, "r")[0]
  const paragraphProperties = existingParagraph ? childElements(existingParagraph, "pPr")[0] : undefined
  const runProperties = existingRun ? childElements(existingRun, "rPr")[0] : undefined
  while (content.firstChild) content.removeChild(content.firstChild)
  if (existingParagraph) {
    const paragraph = createWordElement(document, "p")
    if (paragraphProperties) paragraph.appendChild(cloneElementDeep(paragraphProperties))
    paragraph.appendChild(createTextRuns(document, value, runProperties))
    content.appendChild(paragraph)
  } else {
    content.appendChild(createTextRuns(document, value, runProperties))
  }
}

function fillDocument(document: WordXmlDocument, submission: FillWordSubmission, within?: WordXmlElement) {
  assertPlainRecord(submission.answers, "answers")
  if (submission.fileDisplayNames !== undefined) assertPlainRecord(submission.fileDisplayNames, "fileDisplayNames")
  const fields = new Map(submission.fields.map((field) => [field.fieldId, field]))
  if (fields.size !== submission.fields.length) throw new Error("提交快照包含重复字段 ID")
  const normalized = new Map(submission.fields.map((field) => [
    field.fieldId,
    normalizeAnswer(field, submission.answers[field.fieldId], submission.fileDisplayNames?.[field.fieldId]),
  ]))
  let filled = 0
  for (const sdt of descendantElements(within || document, "sdt")) {
    const match = /^oa-field:([a-zA-Z][a-zA-Z0-9_-]{0,127})$/.exec(sdtTag(sdt))
    if (!match) continue
    const field = fields.get(match[1])
    // A deleted field is deliberately rendered empty; no current-form fallback is allowed.
    const value = field ? normalized.get(field.fieldId)! : ""
    fillSdtElement(sdt, value)
    filled += 1
  }
  return filled
}

function wordParts(pkg: ReturnType<typeof readOoxmlPackage>) {
  return [...pkg.entries.keys()].filter((name) => /^word\/(?:document|header\d+|footer\d+)\.xml$/i.test(name)).sort((a, b) => a.localeCompare(b, "en"))
}

function buildResult(pkg: ReturnType<typeof readOoxmlPackage>, changes: Map<string, string>): FilledWordTemplate {
  const untouchedPartSha256: Record<string, string> = {}
  for (const [name, entry] of pkg.entries) if (!changes.has(name)) untouchedPartSha256[name] = sha256(entry.data)
  return { bytes: pkg.replaceEntries(changes), changedParts: [...changes.keys()], untouchedPartSha256 }
}

export function fillWordTemplate(input: Uint8Array | Buffer, submission: FillWordSubmission): FilledWordTemplate {
  const pkg = readOoxmlPackage(input)
  const changes = new Map<string, string>()
  for (const partName of wordParts(pkg)) {
    const document = parseWordXml(pkg.readText(partName))
    if (fillDocument(document, submission) > 0) changes.set(partName, serializeWordXml(document))
  }
  return buildResult(pkg, changes)
}

export function fillWordTemplateRepeatRows(input: Uint8Array | Buffer, request: FillRepeatRowsRequest): FilledWordTemplate {
  if (request.submissions.length > OA_DOCUMENT_LIMITS.maxSelectedSubmissions) throw new Error("每批最多导出 100 条申请")
  if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,127}$/.test(request.repeatFieldId)) throw new Error("重复行字段 ID 无效")
  const pkg = readOoxmlPackage(input)
  const changes = new Map<string, string>()
  let repeatFound = false
  for (const partName of wordParts(pkg)) {
    const document = parseWordXml(pkg.readText(partName))
    const repeatControls = descendantElements(document, "sdt").filter((sdt) => sdtTag(sdt) === `oa-repeat:${request.repeatFieldId}`)
    if (!repeatControls.length) continue
    if (repeatControls.length > 1 || repeatFound) throw new Error("模板包含重复的聚合行锚点")
    repeatFound = true
    const repeat = repeatControls[0]
    const content = childElements(repeat, "sdtContent")[0]
    const prototype = content && descendantElements(content, "tr")[0]
    const parent = repeat.parentNode
    if (!prototype || !parent) throw new Error("重复行锚点缺少完整原型行")
    for (const submission of request.submissions) {
      const row = cloneElementDeep(prototype)
      fillDocument(document, { fields: request.fields, answers: submission.answers, fileDisplayNames: submission.fileDisplayNames }, row)
      parent.insertBefore(row, repeat)
    }
    parent.removeChild(repeat)
    changes.set(partName, serializeWordXml(document))
  }
  if (!repeatFound) throw new Error("模板没有已确认的重复行锚点")
  return buildResult(pkg, changes)
}

export function fillWordTemplateBatch(
  input: Uint8Array | Buffer,
  fields: OADocumentManifestField[],
  submissions: Array<{ answers: Record<string, unknown>; fileDisplayNames?: Record<string, string | string[] | undefined> }>,
  repeatFieldId?: string,
) {
  if (repeatFieldId) return { aggregate: fillWordTemplateRepeatRows(input, { fields, repeatFieldId, submissions }), documents: [] as FilledWordTemplate[] }
  return { aggregate: null, documents: submissions.map((submission) => fillWordTemplate(input, { fields, ...submission })) }
}
