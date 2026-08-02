import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const backend = readFileSync("convex/oaForms.ts", "utf8")
const scopeHelpers = readFileSync("convex/lib/oaScopeAuthorization.ts", "utf8")
const detail = readFileSync("src/app/services/oa/submissions/[id]/page.tsx", "utf8")

test("submitter history projects every configured workflow node instead of only emitted events", () => {
  assert.match(backend, /steps\.map\(async \(node[^,]*,\s*stepIndex/)
  assert.match(backend, /kind:\s*"workflow_node"/)
  assert.match(backend, /nodeType:\s*node\.type/)
  assert.match(backend, /scopeLabels/)
  assert.match(backend, /targetFormTitle/)
})

test("pending group approvals show selector labels and completed approvals show only actual actors", () => {
  assert.match(backend, /describeOAWorkflowScope/)
  assert.match(scopeHelpers, /researchGroupScopeLabel/)
  assert.match(backend, /branch\.status === "approved"/)
  assert.match(backend, /branch\.status === "rejected"/)
  assert.match(backend, /branch\.status === "changes_requested"/)
  assert.doesNotMatch(detail, /group\.reviewers\.map/)
  assert.match(detail, /node\.scopeLabels/)
  assert.match(detail, /node\.decisions/)
})

test("the submitter timeline renders approval, notification, and fill-form nodes", () => {
  assert.match(detail, /WorkflowHistoryTimeline/)
  assert.match(detail, /notification:\s*"通知"/)
  assert.match(detail, /fill_form:\s*"填写表单"/)
  assert.match(detail, /create_form:\s*"创建表单"/)
  assert.match(detail, /完整流程/)
})
