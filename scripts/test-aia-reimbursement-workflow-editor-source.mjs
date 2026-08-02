import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const createPage = readFileSync("src/app/forms/manage/reimbursements/new/page.tsx", "utf8")
const workspace = readFileSync("src/components/oa/aia-reimbursement-workspace-client.tsx", "utf8")
const workflowEditor = readFileSync("src/components/oa/oa-workflow-editor.tsx", "utf8")
const api = readFileSync("src/lib/api.ts", "utf8")
const inbox = readFileSync("src/components/oa/aia-oa-approval-inbox-client.tsx", "utf8")

test("custom reimbursement creation never previews super administrators as default reviewers", () => {
  assert.match(createPage, /OAWorkflowEditor/)
  assert.match(createPage, /DEFAULT_REIMBURSEMENT_WORKFLOW/)
  assert.match(createPage, /type:\s*"create_form"/)
  assert.match(createPage, /type:\s*"batch_approval"/)
  assert.match(createPage, /scope:\s*\{\}/)
  assert.doesNotMatch(createPage, /roles:\s*\["super_admin"\]/)
  assert.match(createPage, /completion:\s*"any"/)
  assert.match(createPage, /useState<OAWorkflowDraftConfig>/)
})

test("custom reimbursement creation persists the edited workflow with the form", () => {
  assert.match(createPage, /workflowDefinition:\s*workflowConfig\.workflowDefinition/)
  assert.match(createPage, /value=\{workflowConfig\}/)
  assert.match(createPage, /onChange=\{setWorkflowConfig\}/)
  assert.match(createPage, /useEditorVisibleOAForms/)
  assert.match(createPage, /formCandidates=/)
})

test("every new reimbursement draft receives a collision-resistant slug", () => {
  assert.match(createPage, /Date\.now\(\)\.toString\(36\)/)
  assert.match(createPage, /slug:\s*`reimbursement-\$\{suffix\}`/)
  assert.match(createPage, /useState\(\(\)\s*=>\s*createUniqueReimbursementDraft\(\)\)/)
  assert.doesNotMatch(createPage, /createDefaultReimbursementFormDraft\("未命名报销申请"\)/)
})

test("the workflow surface explains dynamic reimbursement managers and retains AIA typography", () => {
  assert.match(createPage, /报销审核与管理权/)
  assert.match(createPage, /表单发布/)
  assert.match(createPage, /aia-serif/)
  assert.match(createPage, /aia-mono/)
  assert.match(createPage, /aia-border-rule/)
  assert.doesNotMatch(createPage, /(?:<Card|shadow-|rounded-(?:lg|xl|2xl))/)
})

test("reimbursement managers can reach the unified OA approval desk", () => {
  assert.match(workspace, /canManageForm/)
  assert.match(workspace, /href="\/services\/oa\/approvals"/)
  assert.match(workspace, /审核报销/)
  assert.match(workspace, /aia-serif/)
  assert.match(workspace, /aia-mono/)
})

test("all batch review nodes default to any-one approval", () => {
  assert.match(workflowEditor, /type,\s*title:\s*"批量审批",\s*scope:\s*\{\},\s*completion:\s*"any"/)
  assert.doesNotMatch(workflowEditor, /type,\s*title:\s*"批量审批",\s*scope:\s*\{\},\s*completion:\s*"all"/)
})

test("the approval inbox idempotently claims legacy pending reimbursement tasks", () => {
  assert.match(api, /oaForms:ensureMyReimbursementApprovalTasks/)
  assert.match(api, /export function useEnsureMyReimbursementApprovalTasks/)
  assert.match(inbox, /useEnsureMyReimbursementApprovalTasks/)
  assert.match(inbox, /void ensureReimbursementTasks\(\)/)
})
