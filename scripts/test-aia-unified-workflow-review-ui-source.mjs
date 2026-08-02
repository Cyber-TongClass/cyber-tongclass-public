import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

function read(path) {
  return readFileSync(path, "utf8")
}

test("review actions use defer-review language and require a comment", () => {
  const inbox = read("src/components/oa/aia-oa-approval-inbox-client.tsx")

  assert.match(inbox, /request_changes:\s*\{\s*label:\s*"暂缓评审"/)
  assert.match(inbox, /approve:\s*\{\s*label:\s*"同意"/)
  assert.match(inbox, /reject:\s*\{\s*label:\s*"拒绝"/)
  assert.match(inbox, /action === "request_changes" && !comment/)
  assert.match(inbox, /暂缓评审时必须填写处理意见/)
  assert.match(inbox, /处理意见（暂缓评审时必填）/)
  assert.match(inbox, /text-amber-[678]00|bg-amber-[123]00/)
})

test("task detail preserves defer context with an amber status", () => {
  const detail = read("src/components/oa/aia-oa-approval-task-detail-client.tsx")

  assert.match(detail, /changes_requested:\s*"暂缓评审"/)
  assert.match(detail, /taskComment/)
  assert.match(detail, /text-amber-[678]00|bg-amber-[123]00/)
})

test("submission history projects complete workflow nodes and actual decisions", () => {
  const detail = read("src/app/services/oa/submissions/[id]/page.tsx")
  const endpoint = read("convex/oaForms.ts")

  assert.match(detail, /workflowVersion\?: number/)
  assert.match(detail, /nodeId\?: string/)
  assert.match(detail, /decisions\?:/)
  assert.match(detail, /WorkflowHistoryTimeline/)
  assert.match(detail, /scopeLabels/)
  assert.match(detail, /nodeType/)
  assert.match(detail, /复审/)
  assert.match(detail, /暂缓评审/)
  assert.match(detail, /bg-amber-500/)
  assert.match(detail, /comment/)
  assert.match(endpoint, /kind:\s*"workflow_node"/)
  assert.match(endpoint, /nodeId:\s*String\(node\.id\)/)
  assert.match(endpoint, /decisions/)
  assert.match(endpoint, /by_submission_step/)
  assert.match(endpoint, /workflowVersion\s*\?\?\s*1/)
})

test("task detail receives every reviewer branch for the same node revision", () => {
  const endpoint = read("convex/oaForms.ts")
  const detail = read("src/components/oa/aia-oa-approval-task-detail-client.tsx")

  assert.match(endpoint, /async function approvalBranchesForTask/)
  assert.match(endpoint, /branches:\s*await approvalBranchesForTask/)
  assert.match(endpoint, /reviewerName/)
  assert.match(endpoint, /status:\s*branch\.status/)
  assert.match(detail, /reviewerBranches/)
})

test("legacy history DTOs retain an explicit fallback path", () => {
  const detail = read("src/app/services/oa/submissions/[id]/page.tsx")

  assert.match(detail, /buildLegacyTimeline/)
  assert.match(detail, /workflowNodes\?\.length/)
  assert.match(detail, /legacyTimeline/)
})
