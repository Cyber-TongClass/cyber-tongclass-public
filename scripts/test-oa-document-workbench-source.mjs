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
  assert.match(canvas, /touch-none/)
  assert.match(canvas, /Escape/)
  assert.match(canvas, /cancelDraw/)
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
  assert.match(overlay, /min-h-11|min-w-11/)
  assert.match(overlay, /pointer-events-none absolute inset-[028]/)
  assert.match(overlay, /touch-none/)
  assert.match(overlay, /resizeHandleAtPointer/)
  assert.doesNotMatch(overlay, /handles\.map/)
})

test("workbench has AIA states, page controls, edit decisions, and publish blocking", async () => {
  const code = `${await read("oa-document-workbench.tsx")}\n${await read("oa-document-annotation-panel.tsx")}`
  for (const token of ["aia-serif", "aia-mono", "aia-border-rule", "aia-paper"]) assert.match(code, new RegExp(token))
  for (const action of ["confirmed", "ignored", "deleted", "添加问题", "上一页", "下一页", "保存批注"]) assert.match(code, new RegExp(action))
  assert.match(code, /全部处理后才能编译并启用模板/)
})

test("workbench loads bounded authenticated preview pages without leaking credentials", async () => {
  const code = await read("oa-document-workbench.tsx")
  assert.match(code, /versionId/)
  assert.match(code, /getTongClassStoredSessionToken/)
  assert.match(code, /Authorization:\s*`Bearer \$\{sessionToken\}`/)
  assert.match(code, /\/api\/oa\/document-templates\/\$\{versionId\}\/preview/)
  assert.match(code, /response\.blob\(\)/)
  assert.match(code, /URL\.createObjectURL/)
  assert.match(code, /URL\.revokeObjectURL/)
  assert.match(code, /Math\.min\(pageCount,\s*Math\.max\(1,/)
  assert.doesNotMatch(code, /[?&](?:token|sessionToken)=/)
  assert.doesNotMatch(code, /data:image\/svg\+xml/)
  assert.match(code, /正在加载文档预览/)
  assert.match(code, /文档预览加载失败/)
})

test("workbench connects select and draw modes to binding-aware canvas edits", async () => {
  const code = `${await read("oa-document-workbench.tsx")}\n${await read("oa-document-annotation-panel.tsx")}\n${await read("oa-document-field-editor.tsx")}`
  assert.match(code, /useState<"select" \| "draw">/)
  assert.match(code, /mode=\{mode\}/)
  assert.match(code, /onDraw=\{handleDraw\}/)
  assert.match(code, /onChange=\{handleVisualChange\}/)
  assert.match(code, /setMode\("select"\)/)
  assert.match(code, /event\.key === "Escape"/)
  assert.doesNotMatch(code, /\/manual\//)
  assert.match(code, /bindingCandidateIds/)
  assert.match(code, /bindingCandidateId/)
  assert.match(code, /candidate\.description/)
  assert.match(code, /已绑定 Word 可写位置/)
  assert.match(code, /未绑定 Word 位置/)
  assert.match(code, /reviewState:\s*"unresolved"/)
})

test("workbench removes field anchors on delete, follows selection pages, and avoids conflict double counts", async () => {
  const code = await read("oa-document-workbench.tsx")
  assert.match(code, /fields:\s*draft\.fields\.filter/)
  assert.match(code, /anchors:\s*draft\.anchors\.filter/)
  assert.match(code, /active\?\.visual\?\.page/)
  assert.match(code, /reviewState === "unresolved"/)
  assert.match(code, /reviewState === "conflict" \|\| suggestion\.conflictIds\.length > 0/)
  assert.doesNotMatch(code, /countTemplateReviewStates/)
})
