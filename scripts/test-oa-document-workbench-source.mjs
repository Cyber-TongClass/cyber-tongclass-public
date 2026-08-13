import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const base = new URL("../src/components/oa-documents/", import.meta.url)
const read = (name) => readFile(new URL(name, base), "utf8")

test("Word import accepts docx and doc without requiring placeholders", async () => {
  const code = await read("oa-document-import.tsx")
  assert.match(code, /\.docx,\.doc/)
  assert.match(code, /无需手动插入占位符/)
})

test("canvas and annotations share regions for hover, focus, and click", async () => {
  const [canvas, panel] = await Promise.all([read("oa-document-canvas.tsx"), read("oa-document-annotation-panel.tsx")])
  for (const code of [canvas, panel]) {
    assert.match(code, /data-region-id/)
    assert.match(code, /onMouseEnter/)
    assert.match(code, /onFocus/)
    assert.match(code, /onClick/)
  }
})

test("workbench has AIA states, page controls, edit decisions, and publish blocking", async () => {
  const code = `${await read("oa-document-workbench.tsx")}\n${await read("oa-document-annotation-panel.tsx")}`
  for (const token of ["aia-serif", "aia-mono", "aia-border-rule", "aia-paper"]) assert.match(code, new RegExp(token))
  for (const action of ["confirmed", "ignored", "deleted", "添加问题", "上一页", "下一页", "保存批注"]) assert.match(code, new RegExp(action))
  assert.match(code, /全部处理后才能编译并启用模板/)
})
