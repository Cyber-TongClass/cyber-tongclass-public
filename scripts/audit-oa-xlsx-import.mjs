import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { createRequire } from "node:module"

const fixturePath = process.argv[2]
if (!fixturePath) throw new Error("用法：node scripts/audit-oa-xlsx-import.mjs <fixture.xlsx>")

const root = path.resolve(new URL("..", import.meta.url).pathname)
const outDir = mkdtempSync(path.join(tmpdir(), "oa-xlsx-audit-"))
const require = createRequire(import.meta.url)
function bundle(source, output) {
  const target = path.join(outDir, output)
  execFileSync(path.join(root, "node_modules/.bin/esbuild"), [
    path.join(root, source), "--bundle", "--platform=node", "--format=cjs", `--outfile=${target}`,
  ], { stdio: "ignore" })
  return require(target)
}

const importer = bundle("src/lib/oa-spreadsheet-import.ts", "importer.cjs")
const reader = bundle("src/lib/server/oa-xlsx-reader.ts", "reader.cjs")
const exporter = bundle("src/lib/server/oa-form-export.ts", "exporter.cjs")

const expectedHeaders = ["序号", "拟创办期刊名称", "主编", "拟创刊时间", "期刊所属学科", "合作单位", "联系人", "电话"]
const sourceBytes = readFileSync(fixturePath)
importer.assertSpreadsheetSourceSize(sourceBytes.length)
importer.normalizeSpreadsheetSource(importer.XLSX_MIME, path.basename(fixturePath), sourceBytes)
const analyzed = reader.analyzeXlsxHeaders(sourceBytes)
assert.equal(analyzed.sheets.length, 1, "样例应仅包含一个有有效表头的可见工作表")
const sourceSheet = analyzed.sheets[0]
assert.equal(sourceSheet.headerRow, 1)
assert.deepEqual(sourceSheet.columns.map((column) => column.label), expectedHeaders)

const fieldsDraft = importer.createSpreadsheetImportDraftPayload(path.basename(fixturePath), "audit_creator", "audit-fields", sourceSheet.name, sourceSheet.columns, "fields")
assert.equal(fieldsDraft.fields.length, expectedHeaders.length)
assert.deepEqual(fieldsDraft.fields.map((field) => field.label), expectedHeaders)
assert.deepEqual(fieldsDraft.targetScope, { userIds: ["audit_creator"] })

const tableDraft = importer.createSpreadsheetImportDraftPayload(path.basename(fixturePath), "audit_creator", "audit-table", sourceSheet.name, sourceSheet.columns, "table")
assert.equal(tableDraft.fields.length, 1)
assert.equal(tableDraft.fields[0].type, "table")
assert.deepEqual(tableDraft.fields[0].columns.map((column) => column.label), expectedHeaders)

const tableField = tableDraft.fields[0]
const rows = [
  { 序号: 1, 拟创办期刊名称: "智能教育", 主编: "张老师", 拟创刊时间: "2027-01", 期刊所属学科: "人工智能", 合作单位: "甲单位", 联系人: "甲", 电话: "13800000001" },
  { 序号: 2, 拟创办期刊名称: "机器学习前沿", 主编: "李老师", 拟创刊时间: "2027-02", 期刊所属学科: "计算机", 合作单位: "乙单位", 联系人: "乙", 电话: "13800000002" },
  { 序号: 3, 拟创办期刊名称: "具身智能", 主编: "王老师", 拟创刊时间: "2027-03", 期刊所属学科: "自动化", 合作单位: "丙单位", 联系人: "丙", 电话: "13800000003" },
  { 序号: 4, 拟创办期刊名称: "科学智能", 主编: "赵老师", 拟创刊时间: "2027-04", 期刊所属学科: "交叉学科", 合作单位: "丁单位", 联系人: "丁", 电话: "13800000004" },
]
const toAnswer = (row) => Object.fromEntries(tableField.columns.map((column) => [column.id, row[column.label]]))
const accesses = [0, 1].map((submissionIndex) => ({
  submission: {
    _id: `audit_submission_${submissionIndex + 1}`,
    formId: "audit_form",
    submitterName: submissionIndex ? "填写人乙" : "填写人甲",
    studentId: submissionIndex ? "20260002" : "20260001",
    submittedAt: Date.UTC(2026, 7, 14, submissionIndex),
    answers: { [tableField.id]: rows.slice(submissionIndex * 2, submissionIndex * 2 + 2).map(toAnswer) },
    formSnapshot: { fields: tableDraft.fields },
  },
  form: { _id: "audit_form", title: tableDraft.title },
  version: null,
}))

const exportedTable = exporter.buildAuthorizedTable(accesses)
assert.equal(exportedTable.rows.length, 4)
assert.deepEqual(exportedTable.header, ["申请编号", "申请人", "学号", "提交时间", ...expectedHeaders])
assert.deepEqual(exportedTable.rows.map((row) => row[4]), ["1", "2", "3", "4"])
const artifact = exporter.buildXlsxArtifact(accesses)
const exportedWorkbook = reader.analyzeXlsxHeaders(artifact.bytes)
assert.deepEqual(exportedWorkbook.sheets[0].columns.map((column) => column.label), exportedTable.header)

process.stdout.write(`${JSON.stringify({
  ok: true,
  source: path.basename(fixturePath),
  sheet: sourceSheet.name,
  headerRow: sourceSheet.headerRow,
  headers: expectedHeaders,
  scalarQuestionCount: fieldsDraft.fields.length,
  tableColumnCount: tableField.columns.length,
  exportedRowCount: exportedTable.rows.length,
  exportedFileName: artifact.fileName,
}, null, 2)}\n`)
