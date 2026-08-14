import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const runtime = fs.readFileSync("convex/lib/oaWorkflow.ts", "utf8")
const schema = fs.readFileSync("convex/schema.ts", "utf8")
const endpoints = fs.readFileSync("convex/oaForms.ts", "utf8")

test("V2 runtime snapshots definitions and executes ordered non-review nodes until blocked", () => {
  assert.match(runtime, /export async function runWorkflowUntilBlocked/)
  assert.match(runtime, /workflowDefinitionSnapshot/)
  assert.match(runtime, /case "create_form"/)
  assert.match(runtime, /case "fill_form"/)
  assert.match(runtime, /case "notification"/)
  assert.match(runtime, /case "approval"/)
  assert.match(runtime, /case "batch_approval"/)
  assert.match(runtime, /currentWorkflowNodeIndex/)
})

test("fill-form grants, tasks, and node effects have deterministic natural keys", () => {
  assert.match(schema, /oaFormAccessGrants:\s*defineTable/)
  assert.match(schema, /\.index\("by_naturalKey", \["naturalKey"\]\)/)
  assert.match(schema, /\.index\("by_form_user", \["formId", "userId"\]\)/)
  assert.match(schema, /oaApprovalTasks:[\s\S]*?naturalKey:\s*v\.optional\(v\.string\(\)\)/)
  assert.match(runtime, /oa:grant:/)
  assert.match(runtime, /oa:task:/)
  assert.match(runtime, /by_naturalKey/)
  assert.match(runtime, /completionRequired/)
  assert.match(runtime, /reason:\s*"fill_form"/)
  assert.match(runtime, /completeRequiredOAFormGrants/)
  assert.match(endpoints, /completeRequiredOAFormGrants\(ctx/)
})

test("fill-form grants participate in published list, detail, submit, and revision access", () => {
  assert.match(endpoints, /hasOAFormAccessGrant/)
  assert.match(endpoints, /by_form_user/)
  assert.match(endpoints, /assertUserCanAccessOAForm/)
  assert.match(endpoints, /canUserAccessOAForm/)
})

test("invalid fill targets pause the workflow with an actionable audited error", () => {
  assert.match(runtime, /workflow_paused/)
  assert.match(runtime, /workflowError/)
  assert.match(runtime, /目标表单/)
  assert.match(runtime, /status !== "published"/)
})

test("ordinary OA blocks self review while permission-driven reimbursement allows it", () => {
  assert.match(runtime, /user\.accountStatus !== "disabled"/)
  assert.match(runtime, /formKind\s*===\s*"reimbursement"\s*\?\s*resolvedRecipients/)
  assert.match(endpoints, /formKind\(form\)\s*!==\s*"reimbursement"[\s\S]*?申请人不能审批自己的提交/)
})

test("notification routing selects the current pending review task rather than an old first task", () => {
  assert.match(endpoints, /task\.status === "pending"/)
  assert.match(endpoints, /\(task\.workflowVersion \?\? 1\) === \(submission\.workflowVersion \?\? 1\)/)
  assert.match(endpoints, /task\.stepIndex === \(submission\.currentWorkflowNodeIndex \?\? submission\.currentApprovalStep\)/)
})
