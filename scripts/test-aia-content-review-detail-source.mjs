import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const backend = await readFile("convex/contentReview.ts", "utf8")
const api = await readFile("src/lib/api.ts", "utf8")
const detailComponent = await readFile("src/components/class-work/content-submission-detail.tsx", "utf8")
const reviewDesk = await readFile("src/components/class-work/content-review-desk.tsx", "utf8")
const accessGuard = await readFile("src/components/class-work/class-work-access-guard.tsx", "utf8")

function detailQuerySource() {
  const start = backend.indexOf("export const getSubmissionDetail")
  const end = backend.indexOf("export const review =", start)
  assert.notEqual(start, -1, "getSubmissionDetail query must be exported")
  assert.notEqual(end, -1, "detail query must live before the review mutation")
  return backend.slice(start, end)
}

test("content detail accepts an exact submission and category instead of downloading a queue", () => {
  const detail = detailQuerySource()
  assert.match(detail, /id:\s*v\.id\("contentSubmissions"\)/)
  assert.match(detail, /category:\s*contentCategoryValidator/)
  assert.match(detail, /const submission = await ctx\.db\.get\(args\.id\)/)
  assert.match(detail, /submission\.category\s*!==\s*args\.category/)
})

test("creator, stored-task reviewer, and super admin are the only detail viewers", () => {
  const detail = detailQuerySource()
  assert.match(detail, /getUserBySession\(ctx,\s*args\.sessionToken\)/)
  assert.match(detail, /\.query\("contentReviewTasks"\)/)
  assert.match(detail, /\.withIndex\("by_submission_user"/)
  assert.match(detail, /submission\.createdBy/)
  assert.match(detail, /viewer\.role\s*===\s*"super_admin"/)
  assert.match(detail, /if\s*\(!canView\)\s*return null/)
  assert.doesNotMatch(detail, /requireRights/)
  assert.doesNotMatch(detail, /getPermission/)
})

test("missing, deleted, mismatched, and unauthorized submissions share the same safe result", () => {
  const detail = detailQuerySource()
  assert.match(detail, /if\s*\(!submission\s*\|\|\s*submission\.category\s*!==\s*args\.category\)\s*return null/)
  assert.match(detail, /if\s*\(!canView\)\s*return null/)
  assert.doesNotMatch(detail, /提交不存在|无权查看|权限/)
})

test("detail projection returns review progress without internal authorization records", () => {
  const detail = detailQuerySource()
  assert.match(detail, /projectSubmissionWithTasks\(ctx,\s*submission,\s*viewer\._id\)/)
  assert.match(backend, /tasks:\s*projectedTasks/)
  assert.match(backend, /myTaskId:/)
  assert.match(backend, /idempotencyKey:\s*_idempotencyKey/)
  assert.match(backend, /requestFingerprint:\s*_requestFingerprint/)
  assert.doesNotMatch(detail, /contentPermissions/)
  assert.doesNotMatch(detail, /canCreate|canManage|grantedBy/)
})

test("the canonical client hook fetches one exact detail and the page does not download queues", () => {
  assert.match(api, /makeFunctionReference<"query">\("contentReview:getSubmissionDetail"\)/)
  assert.match(api, /export function useContentSubmissionDetail\(/)
  assert.match(api, /sessionToken,\s*id:\s*id as any,\s*category/)
  assert.match(detailComponent, /useContentSubmissionDetail\(category,\s*id\)/)
  assert.doesNotMatch(detailComponent, /useContentReviewQueue/)
  assert.doesNotMatch(detailComponent, /useMyContentSubmissions/)
})

test("review desk enables any currently authorized manager, including one without a legacy stored task", () => {
  assert.match(reviewDesk, /submission\.canReview\s*===\s*true/)
  assert.match(reviewDesk, /\(!myTask\s*\|\|\s*myTask\.status\s*===\s*"pending"\)/)
})

test("a manage-only reviewer is not offered an unauthorized create route", () => {
  assert.match(reviewDesk, /useMyContentPermissions\(\)/)
  assert.match(reviewDesk, /permissions\?\.\[category\]\?\.canCreate/)
})

test("exact detail routes defer authorization to the server relationship query", () => {
  assert.match(accessGuard, /capability === "either"\s*\?\s*true/)
})
