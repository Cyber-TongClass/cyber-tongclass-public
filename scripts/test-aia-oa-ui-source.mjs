import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const routeFiles = [
  "src/app/services/oa/page.tsx",
  "src/app/services/oa/[slug]/page.tsx",
  "src/app/services/oa/my/page.tsx",
  "src/app/services/oa/approvals/page.tsx",
  "src/app/services/oa/submissions/[id]/page.tsx",
]

function read(path) {
  return readFileSync(path, "utf8")
}

test("AIA OA exposes an entry point plus submitter and reviewer routes", () => {
  for (const path of routeFiles) {
    assert.equal(existsSync(path), true, `expected ${path}`)
  }

  const portalClient = read("src/components/portal/portal-client.tsx")
  assert.match(portalClient, /href:\s*withReturnTo\(["']\/services\/oa["']/)

  const list = read("src/components/oa/aia-oa-form-list-client.tsx")
  assert.match(list, /usePublishedOAForms/)
  assert.match(list, /useAuth/)
  assert.match(list, /isAuthenticated/)
  assert.doesNotMatch(list, /useTongClassSessionToken/)
  assert.match(list, /mine:\s*"oa-my"/)
  assert.match(list, /approvals:\s*"oa-approvals"/)
  assert.match(list, /AiaOAMySubmissionsClient/)
  assert.match(list, /AiaOAApprovalInboxClient/)

  const submitter = read("src/components/oa/aia-oa-form-submission-client.tsx")
  assert.match(submitter, /useOAForm/)
  assert.match(submitter, /useSubmitOAForm/)
  assert.match(submitter, /OAFormRenderer/)
  assert.match(submitter, /useAuth/)
  assert.doesNotMatch(submitter, /useTongClassSessionToken/)

  const mine = read("src/components/oa/aia-oa-my-submissions-client.tsx")
  assert.match(mine, /useMyOAFormSubmissions/)
  assert.match(mine, /useAuth/)
  assert.doesNotMatch(mine, /useTongClassSessionToken/)
  assert.match(mine, /formTitle/)
  assert.match(mine, /ordinalFor/)
  assert.match(mine, /\/services\/oa\/submissions\//)

  const detail = read("src/app/services/oa/submissions/[id]/page.tsx")
  assert.match(detail, /formSnapshot/)
  assert.match(detail, /完整流程/)
  assert.match(detail, /useMyOAApprovalHistory/)
  assert.match(detail, /operatorName/)

  const oaForms = read("convex/oaForms.ts")
  assert.match(oaForms, /export const listMineApprovalHistory = query/)
  assert.match(oaForms, /describeOAWorkflowScope/)

  const approvals = read("src/components/oa/aia-oa-approval-inbox-client.tsx")
  assert.match(approvals, /useOAApprovalInbox/)
  assert.match(approvals, /useReviewOAFormSubmission/)
  assert.match(approvals, /useOAFormAttachmentUrl/)
  assert.match(approvals, /function AttachmentLink\(/)
  assert.match(approvals, /storageId: file\.storageId/)
  assert.match(approvals, /taskId/)
  assert.match(approvals, /action/)
  assert.doesNotMatch(approvals, /await review\(\{\s*id:/)
  assert.doesNotMatch(approvals, /await review\(\{[^}]*reviewStatus/)
  assert.match(approvals, /request_changes/)
  assert.match(approvals, /暂缓评审/)
  assert.match(approvals, /暂缓评审时必须填写处理意见/)
  assert.match(approvals, /expectedVersion/)
  assert.match(detail, /useUpdateOAFormSubmission/)
  assert.match(approvals, /useAuth/)
  assert.doesNotMatch(approvals, /useTongClassSessionToken/)

  const shared = read("src/components/oa/aia-oa-shared.tsx")
  assert.match(shared, /\/login\?next=/)
})
