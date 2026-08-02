import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  normalizeOAWorkflowDefinition,
  normalizeOAUserScope,
} from "../src/lib/oa-forms.ts"

const runtime = readFileSync("convex/lib/oaWorkflow.ts", "utf8")
const forms = readFileSync("convex/oaForms.ts", "utf8")

function exportedBlock(source, name) {
  const marker = `export const ${name} = `
  const start = source.indexOf(marker)
  assert.notEqual(start, -1, `${name} must be exported`)
  const next = source.indexOf("export const ", start + marker.length)
  return source.slice(start, next === -1 ? undefined : next)
}

test("publishing re-authorizes every persisted audience and workflow scope", () => {
  assert.match(forms, /async function assertActorCanPublishFormScopes/)
  assert.match(
    forms,
    /async function validateWorkflowForPublication[\s\S]*?await assertActorCanPublishFormScopes/,
  )
  assert.match(exportedBlock(forms, "teacherSetStatus"), /validateWorkflowForPublication/)
  assert.match(exportedBlock(forms, "manageSetStatus"), /validateWorkflowForPublication/)
})

test("a create-form-only V2 definition is an executable workflow", () => {
  assert.match(
    runtime,
    /form\?\.workflowDefinition\?\.version === 2 && form\.workflowDefinition\.nodes\?\.length > 0/,
  )
})

test("legacy any approval keeps its multi-recipient batch semantics in the editor", () => {
  const scope = { identityTypes: ["teacher"] }
  const definition = normalizeOAWorkflowDefinition(undefined, [
    { id: "legacy", title: "任一教师审批", scope, completion: "any" },
  ])
  assert.deepEqual(definition.nodes[1], {
    id: "legacy",
    type: "batch_approval",
    title: "任一教师审批",
    scope,
    completion: "any",
  })
})

test("a deferred submission can be revised by its owner after the live audience changes", () => {
  const update = exportedBlock(forms, "updateSubmission")
  assert.match(update, /if \(hasWorkflow\)[\s\S]*?workflowStatus !== "needs_changes"/)
  assert.doesNotMatch(
    update.slice(0, update.indexOf("if (hasWorkflow)")),
    /assertUserCanAccessOAForm/,
  )
})

test("both approval mutations reject self review only for ordinary OA", () => {
  assert.match(
    exportedBlock(forms, "actOnApprovalTask"),
    /formKind\(form\)\s*!==\s*"reimbursement"[\s\S]*?申请人不能审批自己的提交/,
  )
  assert.match(
    exportedBlock(forms, "adminReviewSubmission"),
    /formKind\(form\)\s*!==\s*"reimbursement"[\s\S]*?申请人不能审批自己的提交/,
  )
})

test("ordinary re-review preserves the prior actual assignees while reimbursement re-resolves current managers", () => {
  assert.match(runtime, /resolvePriorOAWorkflowReviewers/)
  assert.match(runtime, /resolveCurrentReimbursementReviewers/)
  assert.match(runtime, /formKind === "reimbursement"[\s\S]*?resolveCurrentReimbursementReviewers/)
  assert.match(runtime, /workflowVersion > 1[\s\S]*?resolvePriorOAWorkflowReviewers/)
})

test("member is a first-class OA workflow role in the shared client contract", () => {
  assert.deepEqual(normalizeOAUserScope({ roles: ["member", "admin", "super_admin"] }), {
    roles: ["member", "admin", "super_admin"],
  })
})
