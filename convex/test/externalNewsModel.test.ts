import assert from "node:assert/strict"
import test from "node:test"

import {
  canonicalizeExternalNewsUrl,
  decideExternalReview,
  externalNewsIdentity,
  intersectActiveReviewers,
  sourceSnapshotHash,
// @ts-ignore -- Node's strip-types test runner requires the explicit extension.
} from "../lib/externalNewsModel.ts"

test("canonical identity removes fragments, tracking parameters, and duplicate slashes", () => {
  const canonical = canonicalizeExternalNewsUrl(
    "https://www.ai.pku.edu.cn//xwgg1/136707.htm?utm_source=wechat&Page=1#top",
  )

  assert.equal(canonical, "https://www.ai.pku.edu.cn/xwgg1/136707.htm?Page=1")
  assert.equal(externalNewsIdentity("news", canonical), `news:${canonical}`)
})

test("canonical identity rejects non-HTTPS and non-AIA hosts", () => {
  assert.throws(() => canonicalizeExternalNewsUrl("http://www.ai.pku.edu.cn/a.htm"), /HTTPS/)
  assert.throws(() => canonicalizeExternalNewsUrl("https://example.com/a.htm"), /来源域名/)
})

test("snapshot hash is stable for normalized content and changes with content", async () => {
  const left = await sourceSnapshotHash({ title: "  标题 ", markdown: "正文\r\n", sourcePublishedAt: 1 })
  const right = await sourceSnapshotHash({ title: "标题", markdown: "正文\n", sourcePublishedAt: 1 })
  const changed = await sourceSnapshotHash({ title: "标题", markdown: "新正文\n", sourcePublishedAt: 1 })

  assert.equal(left, right)
  assert.notEqual(left, changed)
  assert.match(left, /^[a-f0-9]{64}$/)
})

test("request changes chooses the actor and skips pending siblings", () => {
  assert.deepEqual(
    decideExternalReview(
      [{ id: "a", status: "pending" }, { id: "b", status: "pending" }],
      "a",
      "request_changes",
    ),
    {
      sourceReviewStatus: "needs_changes",
      nextStage: "source_review",
      taskUpdates: [
        { id: "a", status: "changes_requested" },
        { id: "b", status: "skipped" },
      ],
    },
  )
})

test("accept enters publication approval; reject never enters it", () => {
  assert.equal(
    decideExternalReview([{ id: "a", status: "pending" }], "a", "accept").nextStage,
    "publication_approval",
  )
  assert.equal(decideExternalReview([{ id: "a", status: "pending" }], "a", "reject").nextStage, "complete")
})

test("review routing keeps unique active accounts with review permission", () => {
  assert.deepEqual(
    intersectActiveReviewers(
      ["u1", "u2", "u3", "u1"],
      [
        { id: "u1", canReview: true, disabled: false },
        { id: "u2", canReview: false, disabled: false },
        { id: "u3", canReview: true, disabled: true },
      ],
    ),
    ["u1"],
  )
})

test("a completed review task cannot decide twice", () => {
  assert.throws(
    () => decideExternalReview([{ id: "a", status: "accepted" }], "a", "reject"),
    /已处理/,
  )
})
