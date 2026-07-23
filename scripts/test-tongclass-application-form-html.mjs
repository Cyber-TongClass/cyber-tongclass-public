import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const htmlPath = path.join(currentDirectory, "..", "public", "intranet-materials", "北京大学通班学术交流支持申请表.html")

let html
try {
  html = await readFile(htmlPath, "utf8")
} catch {
  assert.fail(`Expected standalone form HTML at ${htmlPath}`)
}

assert.match(html, /@page\s*\{\s*size:\s*A4\s*;/, "The form must define an A4 print page")
assert.match(html, /width:\s*210mm/, "The canvas must use A4 width")
assert.match(html, /min-height:\s*297mm/, "The canvas must use A4 height")

for (const label of [
  "北京大学通班学术交流支持",
  "申 请 表",
  "[通] 202607-001 号",
  "个人信息",
  "项目信息",
  "支出明细",
  "关联接受论文及其作者单位",
  "附件材料：论文全文见后附 PDF",
]) {
  assert.ok(html.includes(label), `Missing required source label: ${label}`)
}

assert.equal((html.match(/class="form-table/g) || []).length, 3, "Expected three bordered form tables")
assert.equal((html.match(/class="expense-row"/g) || []).length, 6, "Expected six blank expense rows")
assert.ok((html.match(/contenteditable="true"/g) || []).length >= 12, "Blank form values must remain editable")

console.log("Academic exchange application-form HTML checks passed.")
