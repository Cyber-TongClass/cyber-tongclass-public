import assert from "node:assert/strict"
import test from "node:test"
import {
  contentReviewTaskNaturalKey,
  contentSubmissionFingerprint,
  decideContentReviewOutcome,
  uniqueEligibleReviewerIds,
} from "../convex/lib/contentReviewWorkflow.ts"

test("submission fingerprints are stable across object-key order and change with content", () => {
  const left = contentSubmissionFingerprint({
    category: "news",
    title: "通知",
    payload: { content: "正文", sourceUrl: "https://example.com" },
    targetScope: { userIds: ["u2", "u1"] },
  })
  const reordered = contentSubmissionFingerprint({
    targetScope: { userIds: ["u2", "u1"] },
    payload: { sourceUrl: "https://example.com", content: "正文" },
    title: "通知",
    category: "news",
  })
  const changed = contentSubmissionFingerprint({
    category: "news",
    title: "通知",
    payload: { content: "不同正文", sourceUrl: "https://example.com" },
    targetScope: { userIds: ["u2", "u1"] },
  })

  assert.equal(left, reordered)
  assert.notEqual(left, changed)
})

test("task natural keys are deterministic per submission and reviewer", () => {
  assert.equal(
    contentReviewTaskNaturalKey("submission-1", "reviewer-1"),
    "content-review:submission-1:reviewer:reviewer-1",
  )
})

test("reviewer resolution deduplicates eligible managers, including a creator with review rights", () => {
  assert.deepEqual(
    uniqueEligibleReviewerIds([
      { id: "creator", disabled: false },
      { id: "reviewer", disabled: false },
      { id: "reviewer", disabled: false },
      { id: "disabled", disabled: true },
    ]),
    ["creator", "reviewer"],
  )
})

test("the first approval publishes and skips every other pending reviewer", () => {
  assert.deepEqual(
    decideContentReviewOutcome([
      { id: "one", status: "pending" },
      { id: "two", status: "pending" },
      { id: "three", status: "skipped" },
    ], "one", "approved"),
    {
      outcome: "approved",
      taskUpdates: [
        { id: "one", status: "approved" },
        { id: "two", status: "skipped" },
      ],
    },
  )
})

test("audited skipped reviewers are neutral when the remaining panel approves", () => {
  assert.deepEqual(
    decideContentReviewOutcome([
      { id: "revoked", status: "skipped" },
      { id: "active", status: "pending" },
    ], "active", "approved"),
    {
      outcome: "approved",
      taskUpdates: [{ id: "active", status: "approved" }],
    },
  )
})

test("the first rejection rejects the submission and skips remaining tasks", () => {
  assert.deepEqual(
    decideContentReviewOutcome([
      { id: "one", status: "pending" },
      { id: "two", status: "pending" },
      { id: "three", status: "approved" },
    ], "one", "rejected"),
    {
      outcome: "rejected",
      taskUpdates: [
        { id: "one", status: "rejected" },
        { id: "two", status: "skipped" },
      ],
    },
  )
})

test("an empty reviewer task set is rejected", () => {
  assert.throws(
    () => decideContentReviewOutcome([], "missing", "approved"),
    /审核任务不存在/,
  )
})
