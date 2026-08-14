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
const require = createRequire(import.meta.url)
const importer = require(path.join(outDir, "domain.cjs"))

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
