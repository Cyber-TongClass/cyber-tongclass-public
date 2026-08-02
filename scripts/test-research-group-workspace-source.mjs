import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const schema = readFileSync("convex/schema.ts", "utf8")
const directory = readFileSync("convex/instituteDirectory.ts", "utf8")
const resolver = readFileSync("convex/lib/researchGroupPublications.ts", "utf8")

test("member assignments persist optional order and visibility overrides are uniquely indexed", () => {
  const assignmentStart = schema.indexOf("studentResearchGroupAssignments: defineTable")
  const authorshipStart = schema.indexOf("publicationAuthorships: defineTable", assignmentStart)
  const assignmentBlock = schema.slice(assignmentStart, authorshipStart)
  assert.match(assignmentBlock, /sortOrder:\s*v\.optional\(v\.number\(\)\)/)
  assert.match(assignmentBlock, /\.index\("by_researchGroupId"/)

  const overrideStart = schema.indexOf("researchGroupPublicationVisibilityOverrides: defineTable")
  assert.notEqual(overrideStart, -1)
  const overrideBlock = schema.slice(overrideStart, schema.indexOf(":", overrideStart + 70) === -1 ? undefined : schema.length)
  assert.match(overrideBlock, /researchGroupId:\s*v\.id\("researchGroups"\)/)
  assert.match(overrideBlock, /publicationId:\s*v\.id\("publications"\)/)
  assert.match(overrideBlock, /\.index\("by_group_publication",\s*\["researchGroupId",\s*"publicationId"\]\)/)
  assert.match(overrideBlock, /\.index\("by_group",\s*\["researchGroupId"\]\)/)
})

test("all group workspace writes share leader or super-administrator authorization", () => {
  assert.match(directory, /export async function resolveManagedResearchGroup/)
  assert.match(directory, /actor\.role === "super_admin"/)
  for (const mutation of [
    "assignTeacherGroupMember",
    "removeTeacherGroupMember",
    "setTeacherGroupMemberSubtitle",
    "setTeacherGroupMemberOrder",
    "setTeacherGroupPublicationVisibility",
    "updateTeacherGroupProfile",
  ]) {
    const start = directory.indexOf(`export const ${mutation}`)
    assert.notEqual(start, -1, `${mutation} should exist`)
    const next = directory.indexOf("\nexport const ", start + 1)
    const block = directory.slice(start, next === -1 ? undefined : next)
    assert.match(block, /resolveManagedResearchGroup/)
  }
})

test("member reorder validates the exact member set and compacts persisted order", () => {
  const start = directory.indexOf("export const setTeacherGroupMemberOrder")
  const end = directory.indexOf("\nexport const ", start + 1)
  const block = directory.slice(start, end)
  assert.match(block, /compactResearchGroupMemberOrder/)
  assert.match(block, /RESEARCH_GROUP_MEMBER_ORDER_SET_MISMATCH/)
  assert.match(block, /orderedUserIds:\s*v\.array\(v\.id\("users"\)\)/)
})

test("visibility mutation uses an indexed idempotent upsert", () => {
  const start = directory.indexOf("export const setTeacherGroupPublicationVisibility")
  const end = directory.indexOf("\nexport const ", start + 1)
  const block = directory.slice(start, end)
  assert.match(block, /resolveResearchGroupPublicationCandidates\(ctx,\s*String\(group\._id\)\)/)
  assert.match(block, /RESEARCH_GROUP_PUBLICATION_NOT_RELATED/)
  assert.match(block, /withIndex\("by_group_publication"/)
  assert.match(block, /if\s*\(existing\.visible === args\.visible\)\s*return/)
})

test("profile mutation normalizes once and avoids same-value writes", () => {
  const start = directory.indexOf("export const updateTeacherGroupProfile")
  const end = directory.indexOf("\nexport const ", start + 1)
  const block = directory.slice(start, end)
  assert.match(block, /normalizeResearchGroupProfile\(args\.profile\)/)
  assert.match(block, /Object\.keys\(patch\)\.length === 0/)
  assert.match(block, /groupId:\s*v\.optional\(v\.id\("researchGroups"\)\)/)
})

test("management and public content import the same structured publication resolver", () => {
  assert.match(resolver, /export async function resolveResearchGroupPublicationCandidates/)
  assert.match(resolver, /publicationAuthorships/)
  assert.match(resolver, /accountUserId/)
  assert.doesNotMatch(resolver, /collectPublicationUserIds/)
  assert.doesNotMatch(resolver, /publication\.authors[^]*userId/)
  assert.doesNotMatch(resolver, /\.includes\([^)]*name/i)
  assert.match(directory, /resolveResearchGroupPublicationCandidates/)
  assert.match(directory, /relationSource/)
  assert.match(directory, /effectiveVisibility/)
})

test("scope options bypass bounded fuzzy results for super admins and stay leader-scoped for teachers", () => {
  const start = directory.indexOf("export const listResearchGroupScopeOptions")
  const end = directory.indexOf("\nexport const ", start + 1)
  const block = directory.slice(start, end)
  assert.match(block, /actor\.role === "super_admin"/)
  assert.match(block, /ctx\.db\.query\("researchGroups"\)\.collect\(\)/)
  assert.match(block, /teacherLedResearchGroups\(ctx,\s*actor\._id\)/)
  assert.doesNotMatch(block, /searchManageableScopeOptions/)
  assert.doesNotMatch(block, /\.slice\(0,\s*20\)/)
})

test("roster returns ordered members, the fixed leader, complete profile, and safe publication DTOs", () => {
  const start = directory.indexOf("export const listTeacherGroupRoster")
  const end = directory.indexOf("\nexport const ", start + 1)
  const block = directory.slice(start, end)
  assert.match(block, /groupId:\s*v\.optional\(v\.id\("researchGroups"\)\)/)
  assert.match(block, /sortResearchGroupMembers/)
  for (const field of [
    "leader",
    "nameZh",
    "nameEn",
    "summaryZh",
    "summaryEn",
    "descriptionZh",
    "descriptionEn",
    "researchAreas",
    "publicLinks",
    "recruitmentZh",
    "recruitmentEn",
    "publications",
  ]) {
    assert.match(block, new RegExp(`\\b${field}\\b`), `${field} should be projected`)
  }
  assert.doesNotMatch(block, /authorAccountUserIds\s*:/)
})
