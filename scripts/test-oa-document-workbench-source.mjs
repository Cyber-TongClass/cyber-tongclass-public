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
  const [canvas, overlay, panel] = await Promise.all([
    read("oa-document-canvas.tsx"),
    read("oa-document-overlay.tsx"),
    read("oa-document-annotation-panel.tsx"),
  ])
  for (const code of [`${canvas}\n${overlay}`, panel]) {
    assert.match(code, /data-region-id/)
    assert.match(code, /onMouseEnter/)
    assert.match(code, /onFocus/)
    assert.match(code, /onClick/)
  }
})

test("canvas renders a real authenticated page image with normalized editable overlays", async () => {
  const [canvas, overlay] = await Promise.all([read("oa-document-canvas.tsx"), read("oa-document-overlay.tsx")])
  assert.match(canvas, /previewPageUrl/)
  assert.match(canvas, /<img/)
  assert.match(canvas, /draggable=\{false\}/)
  assert.match(canvas, /pointerId/)
  assert.match(canvas, /setPointerCapture/)
  assert.match(canvas, /mode.*select.*draw/s)
  assert.doesNotMatch(canvas, /结构化预览 · 非原始 Word HTML/)

  assert.match(overlay, /position.*absolute|absolute/)
  assert.match(overlay, /visual\.x \* 100/)
  assert.match(overlay, /resizeVisualAnchor/)
  assert.match(overlay, /setPointerCapture/)
  assert.match(overlay, /onKeyDown/)
  assert.match(overlay, /编辑/)
  assert.match(overlay, /删除/)
  assert.match(overlay, /top-left/)
  assert.match(overlay, /bottom-right/)
})

test("workbench has AIA states, page controls, edit decisions, and publish blocking", async () => {
  const code = `${await read("oa-document-workbench.tsx")}\n${await read("oa-document-annotation-panel.tsx")}`
  for (const token of ["aia-serif", "aia-mono", "aia-border-rule", "aia-paper"]) assert.match(code, new RegExp(token))
  for (const action of ["confirmed", "ignored", "deleted", "添加问题", "上一页", "下一页", "保存批注"]) assert.match(code, new RegExp(action))
  assert.match(code, /全部处理后才能编译并启用模板/)
})
