import path from "node:path"
import { DOMParser, type Document as XmlDocument, type Element as XmlElement, type Node as XmlNode } from "@xmldom/xmldom"

import {
  inferSpreadsheetColumnType,
  normalizeSpreadsheetHeaders,
  OA_SPREADSHEET_LIMITS,
  type OASpreadsheetDetectedField,
  type OASpreadsheetDetectedTable,
  type OASpreadsheetSheet,
} from "@/lib/oa-spreadsheet-import"
import { readOoxmlPackage, type OoxmlPackage } from "@/lib/server/ooxml-package"

const SPREADSHEET_MAIN = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"
const OFFICE_DOCUMENT_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
const WORKSHEET_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"

function localName(node: XmlNode) {
  return (node.localName || node.nodeName.split(":").at(-1) || "").toLocaleLowerCase("en-US")
}

function parseXml(xml: string, label: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error(`${label} XML 不允许 DTD 或实体声明`)
  const errors: string[] = []
  const document = new DOMParser({
    onError: (level, message) => {
      if (level !== "warning") errors.push(String(message))
    },
  }).parseFromString(xml, "application/xml")
  if (errors.length || !document.documentElement || localName(document.documentElement) === "parsererror") {
    throw new Error(`${label} XML 解析失败${errors[0] ? `：${errors[0]}` : ""}`)
  }
  return document
}

function elements(node: XmlNode, expected?: string) {
  const result: XmlElement[] = []
  const wanted = expected?.toLocaleLowerCase("en-US")
  const stack: XmlNode[] = [node]
  while (stack.length) {
    const current = stack.pop()!
    const children: XmlNode[] = []
    for (let child = current.firstChild; child; child = child.nextSibling) {
      if (child.nodeType !== 1) continue
      children.push(child)
      if (!wanted || localName(child) === wanted) result.push(child as XmlElement)
    }
    for (let index = children.length - 1; index >= 0; index -= 1) stack.push(children[index])
  }
  return result
}

function attribute(element: XmlElement, name: string) {
  const wanted = name.toLocaleLowerCase("en-US")
  for (let index = 0; index < element.attributes.length; index += 1) {
    const item = element.attributes.item(index)
    if (item && localName(item) === wanted) return item.value
  }
  return ""
}

function normalizedText(value: string) {
  return value.normalize("NFKC").replace(/[\u00a0\u3000]/g, " ").replace(/\s+/g, " ").trim()
}

function workbookPart(pkg: OoxmlPackage) {
  if (!pkg.has("[Content_Types].xml") || !pkg.has("_rels/.rels")) throw new Error("XLSX 缺少内容类型或根关系")
  const contentTypes = parseXml(pkg.readText("[Content_Types].xml"), "XLSX 内容类型")
  const overrides = elements(contentTypes, "override")
  if (overrides.some((item) => /macroEnabled|vbaProject/i.test(attribute(item, "contenttype")))) throw new Error("不支持包含宏的 XLSX 文件")
  const workbookOverride = overrides.find((item) => attribute(item, "partname") === "/xl/workbook.xml")
  if (!workbookOverride || attribute(workbookOverride, "contenttype") !== SPREADSHEET_MAIN) throw new Error("XLSX 主工作簿内容类型无效")

  const rootRelationships = parseXml(pkg.readText("_rels/.rels"), "XLSX 根关系")
  const relationship = elements(rootRelationships, "relationship").find((item) => attribute(item, "type") === OFFICE_DOCUMENT_REL)
  if (!relationship || /external/i.test(attribute(relationship, "targetmode"))) throw new Error("XLSX 缺少安全的内部工作簿关系")
  const target = attribute(relationship, "target").replace(/^\/+/, "")
  if (target !== "xl/workbook.xml") throw new Error("XLSX 工作簿关系目标无效")
  return target
}

function safeRelationshipTarget(workbookName: string, target: string) {
  if (!target || target.startsWith("/") || target.startsWith("\\") || /^[a-zA-Z]:/.test(target) || target.includes("\\")) {
    throw new Error("XLSX 工作表关系目标无效")
  }
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(workbookName), target))
  if (!resolved.startsWith("xl/") || resolved.split("/").includes("..")) throw new Error("XLSX 工作表关系越出工作簿范围")
  return resolved
}

function sharedStrings(pkg: OoxmlPackage) {
  if (!pkg.has("xl/sharedStrings.xml")) return []
  const document = parseXml(pkg.readText("xl/sharedStrings.xml"), "XLSX 共享字符串")
  const items = elements(document, "si")
  if (items.length > 100_000) throw new Error("XLSX 共享字符串数量超过限制")
  return items.map((item) => elements(item, "t").map((text) => text.textContent || "").join(""))
}

function columnIndex(reference: string) {
  const match = /^([A-Z]{1,3})([1-9]\d*)$/.exec(reference.toLocaleUpperCase("en-US"))
  if (!match) throw new Error(`XLSX 单元格引用无效：${reference}`)
  let result = 0
  for (const character of match[1]) result = result * 26 + character.charCodeAt(0) - 64
  return { column: result, row: Number(match[2]) }
}

function cellValue(cell: XmlElement, strings: string[]) {
  if (elements(cell, "f").length) throw new Error("XLSX 表头不支持公式单元格")
  const type = attribute(cell, "t")
  if (type === "inlineStr") return elements(cell, "t").map((item) => item.textContent || "").join("")
  const value = elements(cell, "v")[0]?.textContent || ""
  if (type === "s") {
    const index = Number(value)
    if (!Number.isSafeInteger(index) || index < 0 || index >= strings.length) throw new Error("XLSX 共享字符串索引无效")
    return strings[index]
  }
  return value
}

type WorksheetCell = { row: number; column: number; value: string }

function worksheetRows(document: XmlDocument, strings: string[]) {
  const rows: Array<{ row: number; cells: WorksheetCell[] }> = []
  for (const rowElement of elements(document, "row")) {
    const declaredRow = Number(attribute(rowElement, "r") || 0)
    if (!Number.isSafeInteger(declaredRow) || declaredRow < 1) throw new Error("XLSX 行号无效")
    if (declaredRow > OA_SPREADSHEET_LIMITS.maxRows) continue
    const values = new Map<number, string>()
    for (const cell of elements(rowElement, "c")) {
      const reference = columnIndex(attribute(cell, "r"))
      if (reference.row !== declaredRow) throw new Error("XLSX 单元格行号与所在行不一致")
      if (reference.column > OA_SPREADSHEET_LIMITS.maxColumns) throw new Error(`Excel 表头不能超过 ${OA_SPREADSHEET_LIMITS.maxColumns} 列`)
      const value = cellValue(cell, strings).normalize("NFKC").replace(/[\u00a0\u3000]/g, " ").replace(/\s+/g, " ").trim()
      if (value) values.set(reference.column, value)
    }
    if (values.size > 0) rows.push({
      row: declaredRow,
      cells: [...values.entries()].sort(([left], [right]) => left - right).map(([column, value]) => ({ row: declaredRow, column, value })),
    })
  }
  return rows
}

function tabularHeader(rows: ReturnType<typeof worksheetRows>) {
  for (const row of rows) {
    const values = new Map(row.cells.map((cell) => [cell.column, cell.value]))
    if (values.size < 2) continue
    const indices = [...values.keys()].sort((left, right) => left - right)
    const first = indices[0]
    const last = indices.at(-1)!
    if (last - first + 1 > OA_SPREADSHEET_LIMITS.maxColumns) throw new Error(`Excel 表头不能超过 ${OA_SPREADSHEET_LIMITS.maxColumns} 列`)
    if (last - first + 1 !== values.size) continue
    const labels = Array.from({ length: last - first + 1 }, (_, index) => values.get(first + index) || "")
    return {
      headerRow: row.row,
      columns: normalizeSpreadsheetHeaders(labels).map((column, index) => ({ ...column, columnIndex: first + index })),
    }
  }
  return null
}

const TABLE_HEADER = /^(?:项目|单据|张数|备注|币种|金额|机票行程|出访行程|日期|时间|数量|单价|起点|终点|国家|城市)$/
const FIELD_PROMPT = /(?:姓名|学号|工号|邮箱|编码|编号|类型|类别|电话|借款|金额|项目号|职称|职务|收款人|银行卡号|开户行|负责人|是否同意)$/
const NON_FIELD = /(?:提示|请及时|如有任何|本表格|签字|盖章|默认\s*100%)/

function safeCoordinateId(prefix: string, row: number, column: number) {
  return `xlsx_${prefix}_r${row}_c${column}`
}

function fixedFormLayout(rows: ReturnType<typeof worksheetRows>) {
  const fields: OASpreadsheetDetectedField[] = []
  const seenLabels = new Set<string>()
  for (const row of rows) {
    for (const cell of row.cells) {
      const label = cell.value.replace(/[：:]$/, "").trim()
      if (!label || label.length > 60 || TABLE_HEADER.test(label) || NON_FIELD.test(label) || !FIELD_PROMPT.test(label)) continue
      const key = label.toLocaleLowerCase("en-US")
      if (seenLabels.has(key)) continue
      seenLabels.add(key)
      fields.push({
        id: safeCoordinateId("field", cell.row, cell.column),
        row: cell.row,
        column: cell.column,
        label,
        type: inferSpreadsheetColumnType(label),
      })
    }
  }

  const tables: OASpreadsheetDetectedTable[] = []
  for (const row of rows) {
    const headerCells = row.cells.filter((cell) => cell.value.length <= 30)
    const headerMatches = headerCells.filter((cell) => TABLE_HEADER.test(cell.value.replace(/[：:]$/, "").trim()))
    if (headerCells.length < 3 || headerMatches.length < 2) continue
    const labels = headerCells.map((cell) => cell.value.replace(/[：:]$/, "").trim()).filter(Boolean)
    if (new Set(labels).size !== labels.length) continue
    const normalized = normalizeSpreadsheetHeaders(labels)
    const label = labels.includes("币种") || labels.includes("金额") ? "费用明细" : "材料与行程明细"
    tables.push({
      id: safeCoordinateId("table", row.row, headerCells[0].column),
      label,
      headerRow: row.row,
      columns: normalized.map((column, index) => ({ ...column, columnIndex: headerCells[index].column })),
    })
  }
  return { fields, tables }
}

function analyzeWorksheet(document: XmlDocument, strings: string[]): Omit<OASpreadsheetSheet, "name"> | null {
  const rows = worksheetRows(document, strings)
  const tabular = tabularHeader(rows)
  const precedingContentRows = tabular ? rows.filter((row) => row.row < tabular.headerRow).length : 0
  const fixed = fixedFormLayout(rows)
  const isClearlyFixed = fixed.fields.length >= 2 && fixed.tables.length >= 1
  if (tabular && precedingContentRows <= 5 && !isClearlyFixed) return { ...tabular, layout: "tabular" }
  if (fixed.fields.length === 0 && fixed.tables.length === 0) {
    return tabular ? { ...tabular, layout: "tabular" } : null
  }
  return {
    headerRow: fixed.tables[0]?.headerRow || fixed.fields[0]?.row || 1,
    columns: fixed.tables[0]?.columns || [],
    layout: "fixed_form",
    ...fixed,
  }
}

export function analyzeXlsxHeaders(input: Uint8Array | Buffer): { sheets: OASpreadsheetSheet[] } {
  const pkg = readOoxmlPackage(input, {
    maxEntries: 1_000,
    maxExtractedBytes: 50 * 1024 * 1024,
    maxEntryBytes: 10 * 1024 * 1024,
    maxXmlPartBytes: 10 * 1024 * 1024,
    maxCompressionRatio: 100,
  })
  const workbookName = workbookPart(pkg)
  const workbookRelationshipsName = `${path.posix.dirname(workbookName)}/_rels/${path.posix.basename(workbookName)}.rels`
  if (!pkg.has(workbookName) || !pkg.has(workbookRelationshipsName)) throw new Error("XLSX 缺少工作簿或工作表关系")
  const workbook = parseXml(pkg.readText(workbookName), "XLSX 工作簿")
  const relationships = parseXml(pkg.readText(workbookRelationshipsName), "XLSX 工作簿关系")
  const relationshipById = new Map<string, XmlElement>()
  for (const relationship of elements(relationships, "relationship")) {
    const id = attribute(relationship, "id")
    if (!id || relationshipById.has(id)) throw new Error("XLSX 工作簿关系 ID 无效或重复")
    relationshipById.set(id, relationship)
  }
  const strings = sharedStrings(pkg)
  const sheets: OASpreadsheetSheet[] = []
  const names = new Set<string>()
  let visibleSheetCount = 0
  for (const sheet of elements(workbook, "sheet")) {
    if (attribute(sheet, "state").toLocaleLowerCase("en-US") !== "" && attribute(sheet, "state").toLocaleLowerCase("en-US") !== "visible") continue
    visibleSheetCount += 1
    if (visibleSheetCount > OA_SPREADSHEET_LIMITS.maxSheets) throw new Error(`Excel 可见工作表不能超过 ${OA_SPREADSHEET_LIMITS.maxSheets} 个`)
    const name = normalizedText(attribute(sheet, "name"))
    if (!name || name.length > 100 || names.has(name.toLocaleLowerCase("en-US"))) throw new Error("XLSX 工作表名称无效或重复")
    names.add(name.toLocaleLowerCase("en-US"))
    const relationship = relationshipById.get(attribute(sheet, "id"))
    if (!relationship || attribute(relationship, "type") !== WORKSHEET_REL) throw new Error(`XLSX 工作表“${name}”缺少关系`)
    if (/external/i.test(attribute(relationship, "targetmode"))) throw new Error(`XLSX 工作表“${name}”使用外部关系`)
    const worksheetName = safeRelationshipTarget(workbookName, attribute(relationship, "target"))
    if (!pkg.has(worksheetName)) throw new Error(`XLSX 工作表“${name}”部件不存在`)
    const analyzed = analyzeWorksheet(parseXml(pkg.readText(worksheetName), `XLSX 工作表“${name}”`), strings)
    if (!analyzed) continue
    sheets.push({ name, ...analyzed })
  }
  if (!sheets.length) throw new Error("Excel 没有包含可用表头的可见工作表")
  return { sheets }
}
