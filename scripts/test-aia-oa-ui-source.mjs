import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const routeFiles = [
  "src/app/services/oa/page.tsx",
  "src/app/services/oa/[slug]/page.tsx",
  "src/app/services/oa/my/page.tsx",
  "src/app/services/oa/approvals/page.tsx",
]

function read(path) {
  return readFileSync(path, "utf8")
}

test("AIA OA exposes an entry point plus submitter and reviewer routes", () => {
  for (const path of routeFiles) {
    assert.equal(existsSync(path), true, `expected ${path}`)
  }

  const services = read("src/app/services/page.tsx")
  assert.match(services, /href=["']\/services\/oa["']/)

  const list = read("src/components/oa/aia-oa-form-list-client.tsx")
  assert.match(list, /usePublishedOAForms/)
  assert.match(list, /useAuth/)
  assert.match(list, /isAuthenticated/)
  assert.doesNotMatch(list, /useTongClassSessionToken/)
  assert.match(list, /\/services\/oa\/my/)
  assert.match(list, /\/services\/oa\/approvals/)

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
  assert.doesNotMatch(approvals, /needs_changes/)
  assert.match(approvals, /useAuth/)
  assert.doesNotMatch(approvals, /useTongClassSessionToken/)

  const shared = read("src/components/oa/aia-oa-shared.tsx")
  assert.match(shared, /\/login\?next=/)
})
