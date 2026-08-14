import assert from "node:assert/strict"
import { mkdtempSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import test from "node:test"

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")
const out = mkdtempSync(path.join(os.tmpdir(), "oa-profile-autofill-"))
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [
  path.join(root, "src/lib/oa-profile-autofill.ts"),
  "--bundle", "--platform=node", "--format=cjs", `--outfile=${path.join(out, "profile.cjs")}`,
])
const require = createRequire(import.meta.url)
const profile = require(path.join(out, "profile.cjs"))

test("manual bindings survive through the existing bounded field metadata", () => {
  const field = profile.setOAProfileBinding({ id: "word_anchor_1", type: "text", label: "联系人", acceptedMimeTypes: ["text/plain"] }, "email")
  assert.equal(field.id, "word_anchor_1")
  assert.equal(profile.getOAProfileBinding(field), "email")
  assert.deepEqual(field.acceptedMimeTypes, ["text/plain", "application/x-oa-profile-binding;field=email"])
  assert.equal(profile.getOAProfileBinding(profile.setOAProfileBinding(field, "none")), null)
})

test("labels infer safe profile bindings without guessing unrelated questions", () => {
  assert.equal(profile.getEffectiveOAProfileBinding({ id: "a", type: "text", label: "姓名" }), "display_name")
  assert.equal(profile.getEffectiveOAProfileBinding({ id: "b", type: "text", label: "电子邮箱" }), "email")
  assert.equal(profile.getEffectiveOAProfileBinding({ id: "c", type: "text", label: "主要做法" }), null)
})

test("autofill fills only blank compatible answers and never overwrites user input", () => {
  const fields = [
    { id: "name", type: "text", label: "姓名" },
    { id: "email", type: "text", label: "联系邮箱" },
    { id: "cohort", type: "number", label: "年级" },
    { id: "org", type: "select", label: "学校", options: [{ label: "北京大学", value: "pku" }, { label: "清华大学", value: "thu" }] },
    { id: "essay", type: "textarea", label: "主要做法" },
  ]
  const result = profile.buildOAProfileAutofill(fields, { name: "张三", email: "new@example.com", cohort: 2024, organization: "pku" }, { name: "已输入姓名", email: "" })
  assert.deepEqual(result.answers, { name: "已输入姓名", email: "new@example.com", cohort: 2024, org: "pku" })
  assert.deepEqual(result.filledFieldIds, ["email", "cohort", "org"])
})
