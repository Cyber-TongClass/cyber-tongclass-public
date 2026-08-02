import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const workflowEditor = readFileSync("src/components/oa/oa-workflow-editor.tsx", "utf8")
const workflowHelpers = readFileSync("src/lib/oa-forms.ts", "utf8")
const backend = readFileSync("convex/oaForms.ts", "utf8")

test("submitter scope clearing remains a backend contract and is not duplicated in the workflow editor", () => {
  assert.doesNotMatch(workflowEditor, /targetScope:\s*event\.target\.checked\s*\?\s*\{\}\s*:\s*null/)
  assert.match(workflowHelpers, /targetScope\?:\s*OAUserScope\s*\|\s*null/)
  assert.match(workflowHelpers, /draft\.targetScope\s*===\s*null/)
  assert.match(backend, /v\.union\(userScopeValidator,\s*v\.null\(\)\)/)
  assert.match(backend, /args\.targetScope\s*===\s*null/)
  assert.match(backend, /targetScope:\s*undefined/)
})
