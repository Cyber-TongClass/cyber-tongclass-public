import assert from "node:assert/strict"
import path from "node:path"
import test from "node:test"
import { pathToFileURL } from "node:url"

const moduleUrl = pathToFileURL(path.resolve("convex/lib/authz-policy.ts")).href
const policy = await import(moduleUrl)

test("decideAuthorization denies when no candidates match", () => {
  assert.deepEqual(policy.decideAuthorization([]), {
    allowed: false,
    reason: "NO_MATCH",
  })
})

test("decideAuthorization lets a more-specific deny override a less-specific allow", () => {
  assert.deepEqual(policy.decideAuthorization([
    { effect: "allow", specificity: 10 },
    { effect: "deny", specificity: 20 },
  ]), {
    allowed: false,
    reason: "DENY",
  })
})

test("decideAuthorization lets a more-specific allow override a less-specific deny", () => {
  assert.deepEqual(policy.decideAuthorization([
    { effect: "deny", specificity: 10 },
    { effect: "allow", specificity: 20 },
  ]), {
    allowed: true,
    reason: "ALLOW",
  })
})

test("decideAuthorization resolves an equal-specificity conflict to deny", () => {
  assert.deepEqual(policy.decideAuthorization([
    { effect: "allow", specificity: 20 },
    { effect: "deny", specificity: 20 },
  ]), {
    allowed: false,
    reason: "DENY",
  })
})

test("decideAuthorization resolves an equal-specificity deny before allow to deny", () => {
  assert.deepEqual(policy.decideAuthorization([
    { effect: "deny", specificity: 20 },
    { effect: "allow", specificity: 20 },
  ]), {
    allowed: false,
    reason: "DENY",
  })
})

test("decideAuthorization is deterministic and does not mutate its candidates", () => {
  const candidates = Object.freeze([
    Object.freeze({ effect: "deny", specificity: 1 }),
    Object.freeze({ effect: "allow", specificity: 2 }),
    Object.freeze({ effect: "deny", specificity: 2 }),
  ])
  const before = structuredClone(candidates)

  const first = policy.decideAuthorization(candidates)
  const second = policy.decideAuthorization(candidates)

  assert.deepEqual(first, { allowed: false, reason: "DENY" })
  assert.deepEqual(second, first)
  assert.deepEqual(candidates, before)
})
