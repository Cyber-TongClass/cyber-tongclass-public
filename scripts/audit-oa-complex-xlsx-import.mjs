import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { createRequire } from "node:module"

const fixturePath = process.argv[2]
if (!fixturePath) throw new Error("用法：node scripts/audit-oa-complex-xlsx-import.mjs <fixture.xlsx>")
const root = path.resolve(import.meta.dirname, "..")
const out = mkdtempSync(path.join(tmpdir(), "oa-complex-xlsx-audit-"))
const require = createRequire(import.meta.url)
const bundle = (source, name) => {
  const target = path.join(out, name)
  execFileSync(path.join(root, "node_modules/.bin/esbuild"), [path.join(root, source), "--bundle", "--platform=node", "--format=cjs", `--outfile=${target}`], { stdio: "ignore" })
  return require(target)
}
const reader = bundle("src/lib/server/oa-xlsx-reader.ts", "reader.cjs")
const importer = bundle("src/lib/oa-spreadsheet-import.ts", "importer.cjs")
const sheet = reader.analyzeXlsxHeaders(readFileSync(fixturePath)).sheets[0]
assert.equal(sheet.layout, "fixed_form")
for (const label of ["出国人姓名", "职工号/学号", "核销表确认邮箱", "业务类型", "借款金额", "银行卡号", "开户行"]) {
  assert.ok(sheet.fields.some((field) => field.label === label), `缺少独立问题：${label}`)
}
assert.ok(sheet.tables.some((table) => table.label === "材料与行程明细"))
assert.ok(sheet.tables.some((table) => table.label === "费用明细" && table.columns.some((column) => column.label === "金额" && column.type === "number")))
const draft = importer.createFixedSpreadsheetImportDraftPayload(path.basename(fixturePath), "audit_creator", "complex_audit", sheet)
assert.equal(draft.fields.length, sheet.fields.length + sheet.tables.length)
assert.ok(draft.fields.every((field) => field.id && field.label))
process.stdout.write(`${JSON.stringify({ ok: true, layout: sheet.layout, questions: sheet.fields.length, tables: sheet.tables.map((table) => ({ label: table.label, columns: table.columns.map((column) => column.label) })), draftFields: draft.fields.length }, null, 2)}\n`)
