import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const builder = await readFile("src/components/oa-forms/oa-form-builder.tsx", "utf8")
const renderer = await readFile("src/components/oa-forms/oa-form-renderer.tsx", "utf8")

test("field editor exposes explicit profile binding and common profile-field shortcuts", () => {
  assert.match(builder, /关联个人资料/)
  assert.match(builder, /setOAProfileBinding/)
  assert.match(builder, /姓名/)
  assert.match(builder, /邮箱/)
  assert.match(builder, /学号/)
})

test("form renderer offers an opt-in blank-only autofill action when bindings exist", () => {
  assert.match(renderer, /从个人资料填写空白项/)
  assert.match(renderer, /buildOAProfileAutofill/)
  assert.match(renderer, /useCurrentUser/)
  assert.match(renderer, /useStudentFormProfile/)
  assert.match(renderer, /不会覆盖已填写内容/)
})
