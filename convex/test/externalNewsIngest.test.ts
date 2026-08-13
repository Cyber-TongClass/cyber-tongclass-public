import assert from "node:assert/strict"
import test from "node:test"

import { decideExternalNewsIngest } from "../lib/externalNewsModel.ts"

test("first observation never creates a draft", () => {
  assert.equal(decideExternalNewsIngest({ mode: "observation", ledger: null, incomingHash: "h1", historicalMatch: false }), "observe")
})

test("draft mode creates once, repeats only touch lastSeenAt", () => {
  assert.equal(decideExternalNewsIngest({ mode: "draft", ledger: null, incomingHash: "h1", historicalMatch: false }), "create_draft")
  assert.equal(decideExternalNewsIngest({ mode: "draft", ledger: { currentHash: "h1" }, incomingHash: "h1", historicalMatch: false }), "create_draft")
  assert.equal(decideExternalNewsIngest({ mode: "draft", ledger: { currentHash: "h1", submissionId: "s" }, incomingHash: "h1", historicalMatch: false }), "touch")
})

test("changed source creates an available snapshot and never overwrites draft", () => {
  assert.equal(decideExternalNewsIngest({ mode: "draft", ledger: { currentHash: "h1", submissionId: "s" }, incomingHash: "h2", historicalMatch: false }), "record_update")
})

test("historical manual source URL is adopted without another draft", () => {
  assert.equal(decideExternalNewsIngest({ mode: "draft", ledger: null, incomingHash: "h1", historicalMatch: true }), "adopt_historical")
})
