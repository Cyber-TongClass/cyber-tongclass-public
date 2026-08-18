import assert from "node:assert/strict"
import test from "node:test"

// @ts-ignore -- Node's strip-types test runner requires the explicit extension.
import { intersectActiveReviewers } from "../lib/externalNewsModel.ts"
// @ts-ignore -- Node's strip-types test runner requires the explicit extension.
import { contentReviewTaskNaturalKey } from "../lib/contentReviewWorkflow.ts"

test("resolved routing is intersected with active canReview accounts", () => {
  assert.deepEqual(
    intersectActiveReviewers(
      ["u1", "u2", "u3", "u2"],
      [
        { id: "u1", canReview: true, disabled: false },
        { id: "u2", canReview: false, disabled: false },
        { id: "u3", canReview: true, disabled: true },
      ],
    ),
    ["u1"],
  )
})

test("review and publication tasks never share a natural key", () => {
  assert.notEqual(
    contentReviewTaskNaturalKey("submission", "reviewer", "source_review"),
    contentReviewTaskNaturalKey("submission", "reviewer", "publication_approval"),
  )
})
