import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { createRequire } from "node:module"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "..")
const out = mkdtempSync(path.join(os.tmpdir(), "oa-generic-docx-"))
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [path.join(root, "src/lib/server/oa-form-export.ts"), "--bundle", "--platform=node", "--format=cjs", `--outfile=${path.join(out, "export.cjs")}`])
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [path.join(root, "src/lib/server/ooxml-package.ts"), "--bundle", "--platform=node", "--format=cjs", `--outfile=${path.join(out, "ooxml.cjs")}`])
const require = createRequire(import.meta.url)
const exporter = require(path.join(out, "export.cjs"))
const { readOoxmlPackage } = require(path.join(out, "ooxml.cjs"))

const access = {
  submission: {
    _id: "submission_1", formId: "form_1", submitterName: "张三", studentId: "20260001", submittedAt: Date.UTC(2026, 7, 14),
    answers: { name: "张三", direction: "教学", expense: [{ item: "机票", amount: 1000 }] },
    formSnapshot: { fields: [
      { id: "name", label: "姓名", type: "text" },
      { id: "direction", label: "方向", type: "radio" },
      { id: "expense", label: "费用", type: "table", columns: [{ id: "item", label: "项目", type: "text" }, { id: "amount", label: "金额", type: "number" }] },
    ] },
  },
  form: { _id: "form_1", title: "测试申请" },
  version: null,
}

test("a submission without an original template still gets a structured downloadable DOCX", () => {
  const artifact = exporter.buildGenericDocxArtifact(access)
  assert.match(artifact.fileName, /测试申请-张三\.docx$/)
  const pkg = readOoxmlPackage(artifact.bytes)
  const xml = pkg.readText("word/document.xml")
  for (const text of ["测试申请", "张三", "20260001", "方向", "教学", "费用", "机票", "1000"]) assert.match(xml, new RegExp(text))
  assert.match(xml, /w:eastAsia="宋体"/)
  assert.doesNotMatch(xml, /wp:anchor|w:position/)
})

test("selected-field tables include only authorized snapshot fields in snapshot order", () => {
  const selected = exporter.buildAuthorizedTable([access], ["direction", "name"])
  assert.deepEqual(selected.header, ["申请编号", "申请人", "学号", "提交时间", "姓名", "方向"])
  assert.deepEqual(selected.rows[0].slice(-2), ["张三", "教学"])
  assert.throws(() => exporter.buildAuthorizedTable([access], ["unknown"]), /字段/)
})
