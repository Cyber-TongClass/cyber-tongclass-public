import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "..")
const out = mkdtempSync(path.join(tmpdir(), "simple-xlsx-test-"))
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [path.join(root, "src/lib/server/simple-xlsx.ts"), path.join(root, "src/lib/server/simple-zip.ts"), path.join(root, "src/lib/server/ooxml-package.ts"), "--bundle", "--platform=node", "--format=cjs", `--outdir=${out}`])
const require = createRequire(import.meta.url)
const xlsx = require(path.join(out, "simple-xlsx.js"))
const zip = require(path.join(out, "simple-zip.js"))
const pkg = require(path.join(out, "ooxml-package.js"))

function readWorkbook(entries) {
  return pkg.readOoxmlPackage(zip.buildSimpleZip(entries))
}

test("metadata customizes safe sheet name, title, and creator", () => {
  const workbook = readWorkbook(xlsx.buildSimpleXlsx([["姓名", "奖励"], ["张三", "最佳论文"]], { sheetName: "奖励/汇总*", title: "教师奖励汇总", creator: "北京大学人工智能研究院" }))
  assert.match(workbook.readText("xl/workbook.xml"), /name="奖励 汇总"/)
  assert.match(workbook.readText("docProps/core.xml"), /教师奖励汇总/)
  assert.match(workbook.readText("docProps/core.xml"), /北京大学人工智能研究院/)
})

test("legacy caller defaults remain byte-contract compatible in metadata", () => {
  const workbook = readWorkbook(xlsx.buildSimpleXlsx([["A"], [1]]))
  assert.match(workbook.readText("xl/workbook.xml"), /学术交流支持申请/)
  assert.match(workbook.readText("docProps/core.xml"), /学术交流支持申请汇总/)
  assert.match(workbook.readText("docProps/core.xml"), /Tong Class/)
})

test("XML content is escaped", () => {
  const workbook = readWorkbook(xlsx.buildSimpleXlsx([["<A&B>"]], { sheetName: "A&B", title: "<汇总>" }))
  assert.match(workbook.readText("xl/worksheets/sheet1.xml"), /&lt;A&amp;B&gt;/)
  assert.match(workbook.readText("xl/workbook.xml"), /A&amp;B/)
})
