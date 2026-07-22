import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const workflowEditor = readFileSync("src/components/admin/oa-workflow/oa-workflow-editor.tsx", "utf8")
const workflowHelpers = readFileSync("src/lib/oa-forms.ts", "utf8")
const backend = readFileSync("convex/oaForms.ts", "utf8")

test("super-admin can explicitly remove a configured AIA submitter scope and restore legacy behavior", () => {
  assert.match(workflowEditor, /targetScope:\s*enabled\s*\?\s*\{\}\s*:\s*null/)
  assert.match(workflowHelpers, /targetScope\?:\s*OAUserScope\s*\|\s*null/)
  assert.match(workflowHelpers, /draft\.targetScope\s*===\s*null/)
  assert.match(backend, /v\.union\(userScopeValidator,\s*v\.null\(\)\)/)
  assert.match(backend, /args\.targetScope\s*===\s*null/)
  assert.match(backend, /targetScope:\s*undefined/)
})
