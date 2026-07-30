import assert from "node:assert/strict"
import test from "node:test"

import {
  compactResearchGroupMemberOrder,
  createResearchGroupAccountSet,
  hasStructuredResearchGroupRelation,
  mergeResearchGroupPublicationSources,
  researchGroupPublicationIsVisible,
  sortResearchGroupMembers,
} from "../convex/lib/researchGroupPublications.ts"

test("legacy members without an explicit order retain their input order", () => {
  const members = [
    { userId: "user-c", name: "C" },
    { userId: "user-a", name: "A" },
    { userId: "user-b", name: "B" },
  ]

  assert.deepEqual(
    sortResearchGroupMembers(members).map((member) => member.userId),
    ["user-c", "user-a", "user-b"],
  )
  assert.deepEqual(members.map((member) => member.userId), ["user-c", "user-a", "user-b"])
})

test("explicit member order is numeric and stable for ties", () => {
  const members = [
    { userId: "user-c", sortOrder: 20 },
    { userId: "user-b", sortOrder: 10 },
    { userId: "user-a", sortOrder: 10 },
  ]

  assert.deepEqual(
    sortResearchGroupMembers(members).map((member) => member.userId),
    ["user-b", "user-a", "user-c"],
  )
})

test("legacy members follow explicitly ordered members without being reshuffled", () => {
  const members = [
    { userId: "legacy-b" },
    { userId: "ordered", sortOrder: 10 },
    { userId: "legacy-a" },
  ]

  assert.deepEqual(
    sortResearchGroupMembers(members).map((member) => member.userId),
    ["ordered", "legacy-b", "legacy-a"],
  )
})

test("member reorder compacts order to 10/20/30", () => {
  assert.deepEqual(
    compactResearchGroupMemberOrder(["user-c", "user-a", "user-b"]),
    [
      { userId: "user-c", sortOrder: 10 },
      { userId: "user-a", sortOrder: 20 },
      { userId: "user-b", sortOrder: 30 },
    ],
  )
})

test("group account set deduplicates the leader and member accounts", () => {
  assert.deepEqual(
    [...createResearchGroupAccountSet({
      leaderAccountUserId: "leader",
      memberAccountUserIds: ["member", "leader", "member", undefined],
    })],
    ["leader", "member"],
  )
})

test("structured author account relation matches a group account", () => {
  const groupAccountUserIds = new Set(["leader", "member"])

  assert.equal(
    hasStructuredResearchGroupRelation({
      groupAccountUserIds,
      authorAccountUserIds: ["outsider", "member"],
    }),
    true,
  )
})

test("publication owner is a structured fallback relation", () => {
  assert.equal(
    hasStructuredResearchGroupRelation({
      groupAccountUserIds: new Set(["leader"]),
      authorAccountUserIds: [],
      ownerAccountUserId: "leader",
    }),
    true,
  )
})

test("publication owner is not used when structured outsider authors are available", () => {
  assert.equal(
    hasStructuredResearchGroupRelation({
      groupAccountUserIds: new Set(["leader"]),
      authorAccountUserIds: ["outsider"],
      ownerAccountUserId: "leader",
    }),
    false,
  )
})

test("a nonmember publication without an owner is unrelated", () => {
  assert.equal(
    hasStructuredResearchGroupRelation({
      groupAccountUserIds: new Set(["leader"]),
      authorAccountUserIds: ["outsider"],
    }),
    false,
  )
})

test("text-only author names never create a group relation", () => {
  assert.equal(
    hasStructuredResearchGroupRelation({
      groupAccountUserIds: new Set(["user-ada"]),
      authorAccountUserIds: [],
      ownerAccountUserId: undefined,
      displayAuthorNames: ["Ada Lovelace"],
      groupMemberNames: ["Ada Lovelace"],
    }),
    false,
  )
})

test("automatic and explicit publication candidates are deduplicated with their source", () => {
  assert.deepEqual(
    mergeResearchGroupPublicationSources({
      automaticPublicationIds: ["publication-a", "publication-b", "publication-a"],
      explicitPublicationIds: ["publication-b", "publication-c", "publication-c"],
    }),
    [
      { publicationId: "publication-a", relationSource: "automatic" },
      { publicationId: "publication-b", relationSource: "automatic-and-explicit" },
      { publicationId: "publication-c", relationSource: "explicit" },
    ],
  )
})

test("a hidden override wins while candidates are visible by default", () => {
  assert.equal(researchGroupPublicationIsVisible({ contentVisible: true }), true)
  assert.equal(
    researchGroupPublicationIsVisible({
      contentVisible: true,
      visibilityOverride: false,
    }),
    false,
  )
  assert.equal(
    researchGroupPublicationIsVisible({
      contentVisible: false,
      visibilityOverride: true,
    }),
    false,
    "a group override must not expose globally hidden content",
  )
})
