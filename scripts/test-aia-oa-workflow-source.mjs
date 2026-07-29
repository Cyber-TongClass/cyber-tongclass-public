import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

function source(path) {
  assert.ok(existsSync(path), `Expected ${path} to exist`)
  return readFileSync(path, "utf8")
}

test("AIA OA workflow persists additive target scopes, ordered approvals, and generic notices", () => {
  const schema = source("convex/schema.ts")

  assert.match(schema, /const oaUserScope = v\.object\(/)
  assert.match(schema, /const oaApprovalStep = v\.object\(/)
  assert.match(schema, /targetScope: v\.optional\(oaUserScope\)/)
  assert.match(schema, /approvalSteps: v\.optional\(v\.array\(oaApprovalStep\)\)/)
  assert.match(schema, /oaApprovalTasks: defineTable\(/)
  assert.match(schema, /oaApprovalEvents: defineTable\(/)
  assert.match(schema, /v\.literal\("oa_workflow"\)/)
})

test("AIA OA workflow starts a current step, advances in order, and exposes action/task APIs", () => {
  const workflow = source("convex/lib/oaWorkflow.ts")
  const forms = source("convex/oaForms.ts")

  assert.match(workflow, /export async function startOAWorkflow\(/)
  assert.match(workflow, /export async function advanceOAWorkflow\(/)
  assert.match(workflow, /export async function notifyOAWorkflowRecipients\(/)
  assert.match(forms, /export const listMyApprovalTasks = query\(/)
  assert.match(forms, /export const actOnApprovalTask = mutation\(/)
  assert.match(forms, /export const listMyNotifications = query\(/)
  assert.match(forms, /await startOAWorkflow\(/)
  assert.match(workflow, /request_changes/)
  assert.match(workflow, /workflow_changes_requested/)
  assert.match(workflow, /export async function resumeOAWorkflow\(/)
  assert.match(forms, /expectedVersion/)
  assert.match(forms, /workflowVersion/)
})

test("legacy Tong Class OA paths remain explicitly available when no AIA target scope is configured", () => {
  const forms = source("convex/oaForms.ts")

  assert.match(forms, /if \(!form\.targetScope\) \{\s*requireMember\(user\)/)
  assert.match(forms, /const requestedApprovalSteps = normalizeApprovalSteps\(args\.approvalSteps\)/)
  assert.match(forms, /existingById\?\.approvalSteps/)
})

test("AIA workflow authorization uses stored current tasks and keeps owner data projections private", () => {
  const forms = source("convex/oaForms.ts")

  assert.match(forms, /approvalStepsSnapshot: _approvalStepsSnapshot/)
  assert.match(forms, /task\.status === "pending" && task\.stepIndex === submission\.currentApprovalStep/)
  assert.match(forms, /return await advanceOAWorkflow\(/)
  assert.match(forms, /args\.reviewStatus === "needs_changes"[\s\S]*?request_changes/)
  assert.match(forms, /try \{\s*user = await getUserBySession\(ctx, args\.sessionToken\)\s*\} catch \{\s*return \[\]/)
})

test("AIA submitter and ordinary-admin form reads do not expose workflow routing scopes", () => {
  const forms = source("convex/oaForms.ts")

  assert.match(forms, /function toPublishedOAForm\(form: any\)/)
  assert.match(forms, /targetScope: _targetScope/)
  assert.match(forms, /approvalSteps: _approvalSteps/)
  assert.match(forms, /\.map\(toPublishedOAForm\)/)
  assert.match(forms, /return toPublishedOAForm\(form\)/)
  assert.match(forms, /function assertCanManageAIAWorkflowForm\(/)
  assert.match(forms, /assertCanManageAIAWorkflowForm\(admin, form\)/)
})
