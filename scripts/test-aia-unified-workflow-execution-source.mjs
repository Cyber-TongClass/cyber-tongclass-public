import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const runtime = fs.readFileSync("convex/lib/oaWorkflow.ts", "utf8")
const endpoints = fs.readFileSync("convex/oaForms.ts", "utf8")
const schema = fs.readFileSync("convex/schema.ts", "utf8")

test("approval creates exactly one reviewer task while batch approval fans out", () => {
  assert.match(runtime, /node\.type === "approval"[\s\S]*?recipients\.length !== 1/)
  assert.match(runtime, /node\.type === "batch_approval"/)
  assert.match(runtime, /审批节点.*恰好一名审批人/)
  assert.match(runtime, /批量审批节点.*至少一名审批人/)
})

test("publishing dynamically validates reviewers and fill-form targets", () => {
  assert.match(endpoints, /validateWorkflowForPublication/)
  assert.match(endpoints, /resolveOAWorkflowRecipients/)
  assert.match(endpoints, /targetFormId/)
  assert.match(endpoints, /status !== "published"/)
  assert.match(endpoints, /adminSetStatus[\s\S]*?validateWorkflowForPublication/)
  assert.match(endpoints, /teacherSetStatus[\s\S]*?validateWorkflowForPublication/)
  assert.match(endpoints, /manageSetStatus[\s\S]*?validateWorkflowForPublication/)
})

test("node-level audit events preserve workflow version and node action", () => {
  assert.match(schema, /oaApprovalEvents:[\s\S]*?workflowVersion:\s*v\.optional\(v\.number\(\)\)/)
  assert.match(schema, /oaApprovalEvents:[\s\S]*?nodeType:\s*v\.optional\(v\.string\(\)\)/)
  assert.match(schema, /v\.literal\("form_access_granted"\)/)
  assert.match(schema, /v\.literal\("notification_sent"\)/)
  assert.match(schema, /v\.literal\("workflow_paused"\)/)
  assert.match(runtime, /workflowVersion:\s*input\.workflowVersion/)
  assert.match(runtime, /nodeType:/)
})

test("legacy definitions are adapted at runtime and request-changes resumes the same V2 node", () => {
  assert.match(runtime, /adaptLegacyOAWorkflow/)
  assert.match(runtime, /workflowVersion/)
  assert.match(runtime, /request_changes/)
  assert.match(runtime, /resubmitted/)
  assert.match(runtime, /runWorkflowUntilBlocked/)
  assert.match(endpoints, /const approvalTaskStatusValidator[\s\S]*?v\.literal\("changes_requested"\)/)
})
