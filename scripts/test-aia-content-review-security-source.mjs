import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const schema = await readFile("convex/schema.ts", "utf8")
const backend = await readFile("convex/contentReview.ts", "utf8")

test("content review tasks have idempotency and inbox indexes", () => {
  const tasks = schema.slice(
    schema.indexOf("contentReviewTasks: defineTable"),
    schema.indexOf("// Events table"),
  )
  assert.match(tasks, /naturalKey:\s*v\.string\(\)/)
  assert.match(tasks, /\.index\("by_naturalKey",\s*\["naturalKey"\]\)/)
  assert.match(tasks, /\.index\("by_submission_user",\s*\["submissionId",\s*"userId"\]\)/)
  assert.match(tasks, /\.index\("by_user_status_createdAt",\s*\["userId",\s*"status",\s*"createdAt"\]\)/)
})

test("submissions use caller idempotency keys with payload fingerprints", () => {
  assert.match(schema, /idempotencyKey:\s*v\.optional\(v\.string\(\)\)/)
  assert.match(schema, /requestFingerprint:\s*v\.optional\(v\.string\(\)\)/)
  assert.match(schema, /\.index\("by_creator_idempotency",\s*\["createdBy",\s*"idempotencyKey"\]\)/)
  assert.match(backend, /contentSubmissionFingerprint/)
  assert.match(backend, /请求标识已用于不同内容/)
})

test("submission resolves every current manager, including the creator, and refuses an empty panel", () => {
  const submit = backend.slice(
    backend.indexOf("export const submit"),
    backend.indexOf("export const reviewQueue"),
  )
  const createTasks = backend.slice(
    backend.indexOf("export async function createPublicationApprovalTasks"),
    backend.indexOf("async function retirePendingReviewTasks"),
  )
  assert.match(submit, /createPublicationApprovalTasks\(ctx,\s*submission,\s*now\)/)
  assert.match(createTasks, /uniqueEligibleReviewerIds/)
  assert.doesNotMatch(createTasks, /uniqueEligibleReviewerIds\([\s\S]*?submission\.createdBy\s*,?\s*\)/)
  assert.doesNotMatch(createTasks, /candidate\.role\s*===\s*"super_admin"/)
  assert.match(createTasks, /没有可用发布审核人/)
  assert.match(createTasks, /contentReviewTasks/)
  assert.match(createTasks, /contentReviewTaskNaturalKey\(submission\._id,\s*reviewerId,\s*"publication_approval"\)/)
})

test("any current manager can acquire an idempotent task and finalise publication once", () => {
  const review = backend.slice(backend.indexOf("export const review"))
  assert.match(review, /taskId:\s*v\.optional\(v\.id\("contentReviewTasks"\)\)/)
  assert.match(review, /contentReviewTaskNaturalKey/)
  assert.match(review, /ctx\.db\.insert\("contentReviewTasks"/)
  assert.match(review, /String\(task\.userId\)\s*!==\s*String\(reviewer\._id\)/)
  assert.match(review, /decideContentReviewOutcome/)
  assert.match(review, /publishedContentId/)
  assert.match(review, /task\.status\s*!==\s*"pending"/)
})

test("review queues and creator history expose the parallel task projection", () => {
  const queue = backend.slice(
    backend.indexOf("export const reviewQueue"),
    backend.indexOf("export const review = mutationGeneric"),
  )
  assert.match(queue, /projectSubmissionWithTasks/)
  assert.match(backend, /myTaskId/)
  assert.match(backend, /reviewerName/)
  assert.match(backend, /submission\.status\s*===\s*"pending"[\s\S]*?getPermission\(ctx,\s*submission\.category,\s*task\.userId\)/)
})

test("review and notification retries are naturally idempotent", () => {
  assert.match(backend, /by_naturalKey/)
  assert.match(backend, /content_review:done:/)
  assert.match(backend, /if\s*\(task\.status\s*===\s*args\.decision\)\s*return true/)
})
