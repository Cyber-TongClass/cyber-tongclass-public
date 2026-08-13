import assert from "node:assert/strict"
import test from "node:test"

import { classifyLegacyPublicationAuthors } from "../convex/lib/publicationAuthorshipMigration.ts"

const encoded = (metadata) => `张老师 [tc-author:${encodeURIComponent(JSON.stringify(metadata))}]`

test("migration uses explicit account ids and preserves corresponding role", () => {
  const decisions = classifyLegacyPublicationAuthors(
    { _id: "p1", authors: [encoded({ isTongClass: true, userId: "u1", corresponding: true }), "外部作者"] },
    new Map([["u1", [{ _id: "person1", kind: "teacher" }]]]), new Map(), 10,
  )
  assert.equal(decisions[0].kind, "insert")
  assert.equal(decisions[0].value.role, "corresponding_author")
  assert.deepEqual(decisions[1], { kind: "skipped", authorOrder: 1, reason: "external_or_unlinked" })
})

test("migration reports malformed, missing, duplicate, and non-teacher bindings", () => {
  const publication = { _id: "p2", authors: [
    "坏 [tc-author:%not-json]", encoded({ isTongClass: true, userId: "missing" }),
    encoded({ isTongClass: true, userId: "duplicate" }), encoded({ isTongClass: true, userId: "graduate" }),
  ] }
  const decisions = classifyLegacyPublicationAuthors(publication, new Map([
    ["duplicate", [{ _id: "a", kind: "teacher" }, { _id: "b", kind: "teacher" }]],
    ["graduate", [{ _id: "g", kind: "graduate" }]],
  ]), new Map(), 10)
  assert.deepEqual(decisions.map((item) => item.kind === "skipped" || item.kind === "conflict" ? item.reason : item.kind), [
    "malformed_metadata", "missing_binding", "multiple_bindings", "not_teacher",
  ])
})

test("existing natural key converges to patch then unchanged", () => {
  const publication = { _id: "p3", authors: [encoded({ isTongClass: true, userId: "u1" })] }
  const people = new Map([["u1", [{ _id: "person1", kind: "teacher" }]]])
  const outdated = new Map([["p3:person1", { _id: "row", naturalKey: "p3:person1", role: "corresponding_author", authorOrder: 3, isPrimary: false }]])
  assert.equal(classifyLegacyPublicationAuthors(publication, people, outdated, 10)[0].kind, "patch")
  const current = new Map([["p3:person1", { _id: "row", naturalKey: "p3:person1", role: "author", authorOrder: 0, isPrimary: true }]])
  assert.equal(classifyLegacyPublicationAuthors(publication, people, current, 20)[0].kind, "unchanged")
})
