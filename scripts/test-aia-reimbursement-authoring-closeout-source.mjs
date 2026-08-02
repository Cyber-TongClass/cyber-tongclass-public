import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const managePage = readFileSync("src/app/forms/manage/page.tsx", "utf8")
const editPage = readFileSync("src/app/forms/manage/[id]/page.tsx", "utf8")
const formEditor = readFileSync("src/app/forms/manage/form-editor.tsx", "utf8")
const reimbursementWorkspace = readFileSync("src/components/oa/aia-reimbursement-workspace-client.tsx", "utf8")
const workflowEditor = readFileSync("src/components/oa/oa-workflow-editor.tsx", "utf8")
const oaForms = readFileSync("convex/oaForms.ts", "utf8")

test("reimbursement creators can manage and publish their own draft forms", () => {
  assert.match(managePage, /useMyContentPermissions/)
  assert.match(managePage, /reimbursement\.canCreate/)
  assert.match(managePage, /新建报销表单/)
  assert.match(editPage, /reimbursement\.canCreate/)
  assert.match(formEditor, /canViewSubmissions/)
  assert.match(reimbursementWorkspace, /href="\/forms\/manage"/)
  assert.match(reimbursementWorkspace, /管理我的报销表单/)
})

test("reimbursement workflow normalization preserves non-review nodes", () => {
  assert.match(oaForms, /function buildCurrentReimbursementWorkflow/)
  assert.match(oaForms, /node\.type === "approval" \|\| node\.type === "batch_approval"/)
  assert.match(oaForms, /return node/)
  assert.match(oaForms, /nodes\.splice\(1,\s*0,/)
  assert.doesNotMatch(
    oaForms,
    /const reviewNode = nodes\.find[\s\S]{0,800}?nodes:\s*\[\s*\{[\s\S]*?createNode[\s\S]*?\},\s*\{[\s\S]*?reviewNode/,
  )
})

test("workflow editor has one external audience source and notification-specific scope purpose", () => {
  assert.doesNotMatch(workflowEditor, /启用研究院可见范围/)
  assert.doesNotMatch(workflowEditor, /恢复旧版通班成员范围/)
  assert.match(workflowEditor, /purpose="workflow_approver"/)
  assert.match(workflowEditor, /purpose="notification"/)
})

test("save-time scope authorization uses each node purpose", () => {
  assert.match(oaForms, /workflowDefinitionScopedPurposes/)
  assert.match(oaForms, /purpose:\s*"workflow_approver"/)
  assert.match(oaForms, /purpose:\s*"notification"/)
  assert.match(oaForms, /assertActorCanUseScope\(ctx,\s*[^,]+,\s*entry\.scope,\s*entry\.purpose\)/)
})
