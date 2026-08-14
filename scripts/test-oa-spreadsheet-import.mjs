import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "..")
const outDir = mkdtempSync(path.join(tmpdir(), "oa-spreadsheet-import-"))
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [
  path.join(root, "src/lib/oa-spreadsheet-import.ts"),
  "--bundle", "--platform=node", "--format=cjs", `--outfile=${path.join(outDir, "domain.cjs")}`,
])
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [
  path.join(root, "src/lib/server/oa-xlsx-reader.ts"),
  "--bundle", "--platform=node", "--format=cjs", `--outfile=${path.join(outDir, "reader.cjs")}`,
])
const require = createRequire(import.meta.url)
const importer = require(path.join(outDir, "domain.cjs"))
const reader = require(path.join(outDir, "reader.cjs"))
const { buildSimpleZip } = require(path.join(root, "src/lib/server/simple-zip.ts"))

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const zipSignature = Buffer.from([0x50, 0x4b, 0x03, 0x04])

test("accepts only a matching safe XLSX filename, MIME, signature, and bounded size", () => {
  assert.equal(importer.normalizeSpreadsheetSource(XLSX_MIME, "新创刊意向征集表.xlsx", zipSignature), "xlsx")
  assert.doesNotThrow(() => importer.assertSpreadsheetSourceSize(10 * 1024 * 1024))
  assert.throws(() => importer.normalizeSpreadsheetSource("application/octet-stream", "form.xlsx", zipSignature), /MIME/)
  assert.throws(() => importer.normalizeSpreadsheetSource(XLSX_MIME, "form.xls", zipSignature), /\.xlsx/)
  assert.throws(() => importer.normalizeSpreadsheetSource(XLSX_MIME, "../form.xlsx", zipSignature), /文件名/)
  assert.throws(() => importer.normalizeSpreadsheetSource(XLSX_MIME, "form.xlsx", Buffer.from("not-zip")), /签名/)
  assert.throws(() => importer.assertSpreadsheetSourceSize(0), /不能为空/)
  assert.throws(() => importer.assertSpreadsheetSourceSize(10 * 1024 * 1024 + 1), /10 MiB/)
})

test("normalizes ordered headers with deterministic IDs and conservative types", () => {
  const columns = importer.normalizeSpreadsheetHeaders([
    "序号", "拟创办期刊名称", "主编", "拟创刊时间", "期刊所属学科", "合作单位", "联系人", "电话",
  ])
  assert.deepEqual(columns.map((column) => [column.columnIndex, column.label, column.type]), [
    [1, "序号", "number"],
    [2, "拟创办期刊名称", "text"],
    [3, "主编", "text"],
    [4, "拟创刊时间", "date"],
    [5, "期刊所属学科", "text"],
    [6, "合作单位", "text"],
    [7, "联系人", "text"],
    [8, "电话", "text"],
  ])
  assert.deepEqual(columns.map((column) => column.id), [
    "xlsx_1_column", "xlsx_2_column", "xlsx_3_column", "xlsx_4_column",
    "xlsx_5_column", "xlsx_6_column", "xlsx_7_column", "xlsx_8_column",
  ])
  assert.equal(importer.inferSpreadsheetColumnType("联系电话"), "text")
  assert.equal(importer.inferSpreadsheetColumnType("证件编号"), "text")
  assert.equal(importer.inferSpreadsheetColumnType("人数"), "number")
  assert.equal(importer.inferSpreadsheetColumnType("出生年月"), "date")
  assert.throws(() => importer.normalizeSpreadsheetHeaders(["姓名", " 姇名 ".replace("姇", "姓")]), /重复/)
  assert.throws(() => importer.normalizeSpreadsheetHeaders(["姓名", ""]), /空白/)
})

test("creates a creator-only scalar-field draft in source header order", () => {
  const columns = importer.normalizeSpreadsheetHeaders(["序号", "拟创办期刊名称", "主编"])
  const draft = importer.createSpreadsheetImportDraftPayload(
    "新创刊意向征集表.xlsx", "creator_1", "nonce_1", "Sheet1", columns, "fields",
  )
  assert.equal(draft.title, "新创刊意向征集表")
  assert.equal(draft.status, "draft")
  assert.match(draft.slug, /^xlsx-import-/)
  assert.deepEqual(draft.targetScope, { userIds: ["creator_1"] })
  assert.deepEqual(draft.fields.map((field) => [field.id, field.label, field.type, field.required]), [
    ["xlsx_1_column", "序号", "number", false],
    ["xlsx_2_column", "拟创办期刊名称", "text", false],
    ["xlsx_3_column", "主编", "text", false],
  ])
  assert.match(draft.description, /Sheet1/)
})

test("creates one repeatable table field with ordered source columns", () => {
  const columns = importer.normalizeSpreadsheetHeaders(["序号", "拟创办期刊名称", "拟创刊时间"])
  const draft = importer.createSpreadsheetImportDraftPayload(
    "新创刊意向征集表.xlsx", "creator_1", "nonce_2", "Sheet1", columns, "table",
  )
  assert.equal(draft.fields.length, 1)
  assert.equal(draft.fields[0].id, "xlsx_table")
  assert.equal(draft.fields[0].type, "table")
  assert.equal(draft.fields[0].required, false)
  assert.deepEqual(draft.fields[0].columns, columns.map(({ id, label, type }) => ({ id, label, type, required: false })))
  assert.deepEqual(draft.targetScope, { userIds: ["creator_1"] })
})

const spreadsheetContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"
const worksheetContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"

function columnName(index) {
  let value = index
  let result = ""
  while (value > 0) {
    value -= 1
    result = String.fromCharCode(65 + (value % 26)) + result
    value = Math.floor(value / 26)
  }
  return result
}

function worksheetWithSharedHeaders(headers, row = 1) {
  return `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="${row}">${headers.map((_, index) => `<c r="${columnName(index + 1)}${row}" t="s"><v>${index}</v></c>`).join("")}</row></sheetData></worksheet>`
}

function worksheetWithInlineHeaders(headers, row = 1) {
  return `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="${row}">${headers.map((header, index) => `<c r="${columnName(index + 1)}${row}" t="inlineStr"><is><t>${header}</t></is></c>`).join("")}</row></sheetData></worksheet>`
}

function workbookPackage({
  headers = ["序号", "拟创办期刊名称"],
  inline = false,
  hiddenSecond = false,
  externalWorksheet = false,
  macroEnabled = false,
  headerRow = 1,
} = {}) {
  const workbookType = macroEnabled ? "application/vnd.ms-excel.sheet.macroEnabled.main+xml" : spreadsheetContentType
  const rootRels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="root1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  const workbook = `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/><sheet name="Sheet2" sheetId="2"${hiddenSecond ? " state=\"hidden\"" : ""} r:id="rId2"/></sheets></workbook>`
  const relationships = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"${externalWorksheet ? " TargetMode=\"External\"" : ""}/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>`
  const contentTypes = `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${workbookType}"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="${worksheetContentType}"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="${worksheetContentType}"/>${inline ? "" : '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'}</Types>`
  const entries = [
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rootRels },
    { name: "xl/workbook.xml", data: workbook },
    { name: "xl/_rels/workbook.xml.rels", data: relationships },
    { name: "xl/worksheets/sheet1.xml", data: inline ? worksheetWithInlineHeaders(headers, headerRow) : worksheetWithSharedHeaders(headers, headerRow) },
    { name: "xl/worksheets/sheet2.xml", data: `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>` },
  ]
  if (!inline) entries.push({
    name: "xl/sharedStrings.xml",
    data: `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${headers.length}" uniqueCount="${headers.length}">${headers.map((header) => `<si><t>${header}</t></si>`).join("")}</sst>`,
  })
  return buildSimpleZip(entries)
}

function manySheetPackage(sheetCount) {
  const sheetTags = Array.from({ length: sheetCount }, (_, index) => `<sheet name="Sheet${index + 1}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")
  const relationshipTags = Array.from({ length: sheetCount }, (_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")
  const worksheetEntries = Array.from({ length: sheetCount }, (_, index) => ({
    name: `xl/worksheets/sheet${index + 1}.xml`,
    data: index === 0 ? worksheetWithInlineHeaders(["姓名", "电话"]) : `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>`,
  }))
  return buildSimpleZip([
    { name: "[Content_Types].xml", data: `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/xl/workbook.xml" ContentType="${spreadsheetContentType}"/></Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="root1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", data: `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetTags}</sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationshipTags}</Relationships>` },
    ...worksheetEntries,
  ])
}

test("reads ordered shared-string headers and omits empty worksheets", () => {
  const analyzed = reader.analyzeXlsxHeaders(workbookPackage({ headers: ["序号", "拟创办期刊名称", "主编"], headerRow: 3 }))
  assert.equal(analyzed.sheets.length, 1)
  assert.equal(analyzed.sheets[0].name, "Sheet1")
  assert.equal(analyzed.sheets[0].headerRow, 3)
  assert.deepEqual(analyzed.sheets[0].columns.map(({ label, type }) => [label, type]), [
    ["序号", "number"], ["拟创办期刊名称", "text"], ["主编", "text"],
  ])
})

test("reads inline-string headers and ignores hidden worksheets", () => {
  const analyzed = reader.analyzeXlsxHeaders(workbookPackage({ headers: ["联系人", "电话"], inline: true, hiddenSecond: true }))
  assert.deepEqual(analyzed.sheets.map((sheet) => sheet.name), ["Sheet1"])
  assert.deepEqual(analyzed.sheets[0].columns.map((column) => column.label), ["联系人", "电话"])
})

test("fails closed for unsafe relationships, macros, duplicate headers, and excessive columns", () => {
  assert.throws(() => reader.analyzeXlsxHeaders(workbookPackage({ externalWorksheet: true })), /外部|关系/)
  assert.throws(() => reader.analyzeXlsxHeaders(workbookPackage({ macroEnabled: true })), /宏|类型/)
  assert.throws(() => reader.analyzeXlsxHeaders(workbookPackage({ headers: ["姓名", "姓名"] })), /重复/)
  assert.throws(() => reader.analyzeXlsxHeaders(workbookPackage({ headers: Array.from({ length: 257 }, (_, index) => `字段${index + 1}`) })), /256/)
})

test("requires at least one visible worksheet with a usable header row", () => {
  assert.throws(() => reader.analyzeXlsxHeaders(workbookPackage({ headers: ["只有一列"] })), /表头|工作表/)
  assert.throws(() => reader.analyzeXlsxHeaders(manySheetPackage(51)), /50/)
})
