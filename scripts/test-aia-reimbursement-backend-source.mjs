import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("convex/oaForms.ts", "utf8")
const runtime = readFileSync("convex/lib/oaWorkflow.ts", "utf8")

test("custom reimbursement definitions require the explicit create grant", () => {
  const createChecks = source.match(/requireReimbursementRight\(ctx,\s*(?:admin|manager),\s*"canCreate"\)/g) || []
  assert.ok(createChecks.length >= 2, "both legacy admin and canonical manage writes must enforce canCreate")
  assert.match(source, /const requestedKind(?::[^=]+)?\s*=\s*existingById[\s\S]*?\?\s*formKind\(existingById\)/)
  assert.match(source, /args\.kind\s*===\s*"reimbursement"/)
  assert.match(source, /普通管理员不会自动获得报销权限/)
})

test("reimbursement workflows resolve the current manager panel server-side", () => {
  assert.match(source, /buildCurrentReimbursementWorkflow/)
  assert.match(source, /\.eq\("category",\s*"reimbursement"\)/)
  assert.match(source, /canManage\s*===\s*true/)
  assert.doesNotMatch(
    source.slice(source.indexOf("async function currentReimbursementManagerIds"), source.indexOf("async function buildCurrentReimbursementWorkflow")),
    /role\s*===\s*"super_admin"/,
  )
  assert.match(source, /completion:\s*"any"/)
  assert.match(source, /workflowDefinition:\s*await buildCurrentReimbursementWorkflow/)
  const runtimeResolver = runtime.slice(
    runtime.indexOf("async function resolveCurrentReimbursementReviewers"),
    runtime.indexOf("async function activateReviewNode"),
  )
  assert.doesNotMatch(runtimeResolver, /role\s*===\s*"super_admin"/)
})

test("reimbursement rights are strict permission-list rights for every account role", () => {
  const helper = source.slice(
    source.indexOf("async function hasReimbursementRight"),
    source.indexOf("async function requireReimbursementRight"),
  )
  assert.doesNotMatch(helper, /super_admin/)
  assert.match(helper, /permission\?\.\[right\]\s*===\s*true/)
  const branches = source.slice(
    source.indexOf("async function approvalBranchesForTask"),
    source.indexOf("async function listApprovalTasksForUser"),
  )
  assert.match(branches, /currentReimbursementManagerIds/)
  assert.match(branches, /allowedReviewerIds/)
})

test("revoked reimbursement managers cannot see or act on old tasks", () => {
  assert.match(source, /hasReimbursementRight\(ctx,\s*user,\s*"canManage"\)/)
  assert.match(source, /await requireReimbursementRight\(ctx,\s*actor,\s*"canManage"\)/)
  const submitterHistory = source.slice(
    source.indexOf("export const listMineApprovalHistory"),
    source.indexOf("function workflowStepForTask"),
  )
  // Pending reviewer identities are never exposed to submitters; only decided
  // branches are returned, and reimbursement scopes use a generic label.
  assert.match(submitterHistory, /branch\.status === "approved"/)
  assert.match(submitterHistory, /branch\.status === "rejected"/)
  assert.match(submitterHistory, /branch\.status === "changes_requested"/)
  assert.doesNotMatch(submitterHistory, /branch\.status\s*===\s*"pending"/)
  assert.match(submitterHistory, /报销审核与管理权人员/)
})

test("OA submission remains retry-safe and reimbursement managers may review their own request", () => {
  assert.match(source, /by_submitter_idempotency/)
  assert.match(source, /startOAWorkflow\(ctx,\s*\{\s*form:\s*runtimeForm,\s*submission,\s*now\s*\}\)/)
  assert.match(
    readFileSync("convex/lib/oaWorkflow.ts", "utf8"),
    /formKind\s*===\s*"reimbursement"\s*\?\s*resolvedRecipients\s*:\s*resolvedRecipients\.filter/,
  )
  assert.match(source, /export const ensureMyReimbursementApprovalTasks = mutation/)
  assert.match(source, /contentPermissions/)
  assert.match(source, /oa:task:/)
})
