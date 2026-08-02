import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const backend = await readFile("convex/contentReview.ts", "utf8")

function reviewMutationSource() {
  const start = backend.indexOf("export const review = mutationGeneric")
  assert.notEqual(start, -1, "content review mutation must be exported")
  return backend.slice(start)
}

function taskProjectionSource() {
  const start = backend.indexOf("async function projectSubmissionWithTasks")
  const end = backend.indexOf("export const reviewQueue", start)
  assert.notEqual(start, -1, "task projection helper must exist")
  assert.notEqual(end, -1, "task projection helper must precede the queue")
  return backend.slice(start, end)
}

test("review revalidates the task owner's active category management right before any decision retry", () => {
  const review = reviewMutationSource()
  const submissionLookup = review.indexOf("await ctx.db.get(task.submissionId)")
  const rightsCheck = review.indexOf(
    'requireRights(ctx, args.sessionToken, submission.category as ContentCategory, "canManage")',
  )
  const idempotentReturn = review.indexOf("if (task.status === args.decision) return true")

  assert.notEqual(submissionLookup, -1, "review must resolve the task's submission")
  assert.ok(
    rightsCheck > submissionLookup,
    "review must re-read active rights for the submission category after resolving the stored task",
  )
  assert.ok(
    idempotentReturn > rightsCheck,
    "revoked reviewers must be rejected even when retrying an already-decided old task",
  )

  const rightsHelper = backend.slice(
    backend.indexOf("async function requireRights"),
    backend.indexOf("async function notify"),
  )
  assert.match(rightsHelper, /getUserBySession\(ctx,\s*sessionToken\)/)
  assert.match(rightsHelper, /effectiveRights\(user,\s*permission\)/)
  assert.match(rightsHelper, /if\s*\(!rights\[right\]\)/)
  assert.doesNotMatch(rightsHelper, /user\.role\s*===\s*"super_admin"/)
})

test("parallel task DTOs expose ownership as isMine without leaking reviewer user ids", () => {
  const projection = taskProjectionSource()
  const projectedObject = projection.slice(
    projection.indexOf("projectedTasks.push({"),
    projection.indexOf("})", projection.indexOf("projectedTasks.push({")) + 2,
  )

  assert.doesNotMatch(projectedObject, /\buserId\s*:/)
  assert.match(projectedObject, /isMine:\s*String\(task\.userId\)\s*===\s*String\(viewerId\)/)
  assert.match(projectedObject, /reviewerName:\s*displayName\(reviewer\)/)
  assert.match(projectedObject, /status:\s*task\.status/)
  assert.match(projection, /myTaskId:\s*projectedTasks\.find\(\(task\)\s*=>\s*task\.isMine\)\?\._id/)
})
