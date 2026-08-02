import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path) => readFileSync(path, "utf8")

test("shared combobox pickers expose caller-defined accessible names", () => {
  const scopePicker = read("src/components/oa/oa-scope-picker.tsx")
  const formPicker = read("src/components/oa/oa-form-target-picker.tsx")
  const permissionPicker = read("src/components/permissions/permission-subject-picker.tsx")
  const contentEditor = read("src/components/class-work/content-submission-editor.tsx")

  for (const source of [scopePicker, formPicker]) {
    assert.match(source, /ariaLabel\?:\s*string/)
    assert.match(source, /aria-label=\{ariaLabel\}/)
  }

  assert.match(permissionPicker, /ariaLabel="查找要授权的人员或人员组"/)
  assert.match(contentEditor, /ariaLabel=\{`\$\{copy\.noun\}可见范围`\}/)
})

test("activedescendant combobox options do not create a second tab sequence", () => {
  const scopePicker = read("src/components/oa/oa-scope-picker.tsx")
  const formPicker = read("src/components/oa/oa-form-target-picker.tsx")

  for (const source of [scopePicker, formPicker]) {
    assert.match(source, /aria-activedescendant=/)
    assert.match(source, /role="option"[\s\S]{0,180}tabIndex=\{-1\}/)
  }
})

test("Markdown source and compact formatting controls have accessible names", () => {
  const markdown = read("src/components/markdown/markdown-split-editor.tsx")

  assert.match(markdown, /<label\s+htmlFor=\{id\}[\s\S]{0,120}\{sourceLabel\}[\s\S]{0,40}<\/label>/)
  assert.match(markdown, /aria-label="加粗"/)
  assert.match(markdown, /aria-label="斜体"/)
  assert.match(markdown, /aria-label="删除线"/)
})

