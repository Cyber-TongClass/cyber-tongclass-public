import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"
import { pathToFileURL } from "node:url"

const dtoModuleUrl = pathToFileURL(path.resolve("convex/lib/instituteDto.ts")).href
const dto = await import(dtoModuleUrl)

function assertFieldsAreAbsent(value, fields) {
  for (const field of fields) {
    assert.equal(Object.hasOwn(value, field), false, `${field} must not be in the public DTO`)
  }
}

test("public institute person DTO allow-lists profile fields and redacts account data", () => {
  const person = {
    _id: "institutePeople:ada",
    _creationTime: 1_700_000_000_000,
    slug: "ada-lovelace",
    kind: "teacher",
    nameZh: "艾达·洛夫莱斯",
    nameEn: "Ada Lovelace",
    titleZh: "教授",
    titleEn: "Professor",
    bioZh: "计算先驱",
    bioEn: "Computing pioneer",
    photoUrl: "https://images.example/ada.png",
    researchAreas: ["Machine Learning"],
    publicLinks: [{
      kind: "homepage",
      label: "Homepage",
      href: "https://example.edu/ada",
      privateLinkToken: "must-not-leak",
    }],
    publicEmail: "ada@institute.example",
    coffeeTalkOpen: true,
    visibility: "public",
    displayOrder: 1,
    isDemo: true,
    accountUserId: "users:ada",
    email: "ada@login.example",
    studentId: "20260001",
    role: "admin",
    identityType: "teacher",
    accountStatus: "active",
    isEmailVerified: true,
    verificationCode: "secret-code",
    sessionToken: "secret-session",
    credentials: { passwordHash: "secret-hash" },
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_001_000,
  }

  const publicPerson = dto.toPublicInstitutePerson(person)

  assert.deepEqual(publicPerson, {
    slug: "ada-lovelace",
    kind: "teacher",
    nameZh: "艾达·洛夫莱斯",
    nameEn: "Ada Lovelace",
    titleZh: "教授",
    titleEn: "Professor",
    bioZh: "计算先驱",
    bioEn: "Computing pioneer",
    photoUrl: "https://images.example/ada.png",
    researchAreas: ["Machine Learning"],
    publicLinks: [{
      kind: "homepage",
      label: "Homepage",
      href: "https://example.edu/ada",
    }],
    publicEmail: "ada@institute.example",
    coffeeTalkOpen: true,
    isDemo: true,
  })
  assert.notStrictEqual(publicPerson.researchAreas, person.researchAreas)
  assert.notStrictEqual(publicPerson.publicLinks, person.publicLinks)
  assertFieldsAreAbsent(publicPerson, [
    "_id",
    "_creationTime",
    "accountUserId",
    "email",
    "studentId",
    "role",
    "identityType",
    "accountStatus",
    "isEmailVerified",
    "verificationCode",
    "sessionToken",
    "credentials",
    "createdAt",
    "updatedAt",
    "visibility",
    "displayOrder",
  ])
  assert.equal(Object.hasOwn(publicPerson.publicLinks[0], "privateLinkToken"), false)
})

test("Coffee Talk availability is public only for an explicitly account-bound teacher", () => {
  const basePerson = {
    slug: "bound-teacher",
    kind: "teacher",
    nameZh: "绑定教师",
    nameEn: "Bound Teacher",
    researchAreas: [],
    publicLinks: [],
    coffeeTalkOpen: true,
    isDemo: false,
  }

  assert.equal(
    dto.toPublicInstitutePerson(basePerson).coffeeTalkOpen,
    undefined,
    "an unbound directory teacher must not collect Coffee Talk applications",
  )
  assert.equal(
    dto.toPublicInstitutePerson({ ...basePerson, accountUserId: "users:teacher" }).coffeeTalkOpen,
    true,
  )
})

test("public research group DTO nests only a public leader profile", () => {
  const group = {
    _id: "researchGroups:logic",
    slug: "logic-lab",
    nameZh: "逻辑实验室",
    nameEn: "Logic Lab",
    summaryZh: "简述",
    summaryEn: "Summary",
    descriptionZh: "详情",
    descriptionEn: "Details",
    leaderPersonId: "institutePeople:ada",
    researchAreas: ["Logic"],
    publicLinks: [{ label: "Lab", href: "https://example.edu/lab", privateNote: "hidden" }],
    recruitmentZh: "招募中",
    recruitmentEn: "Recruiting",
    visibility: "public",
    displayOrder: 2,
    isDemo: true,
    createdAt: 1,
    updatedAt: 2,
  }
  const leader = {
    _id: "institutePeople:ada",
    slug: "ada-lovelace",
    kind: "teacher",
    nameZh: "艾达·洛夫莱斯",
    nameEn: "Ada Lovelace",
    researchAreas: ["Logic"],
    publicLinks: [],
    visibility: "public",
    displayOrder: 1,
    isDemo: true,
    accountUserId: "users:ada",
    createdAt: 1,
    updatedAt: 2,
  }

  const publicGroup = dto.toPublicResearchGroup(group, leader)

  assert.deepEqual(publicGroup, {
    slug: "logic-lab",
    nameZh: "逻辑实验室",
    nameEn: "Logic Lab",
    summaryZh: "简述",
    summaryEn: "Summary",
    descriptionZh: "详情",
    descriptionEn: "Details",
    researchAreas: ["Logic"],
    publicLinks: [{ label: "Lab", href: "https://example.edu/lab" }],
    recruitmentZh: "招募中",
    recruitmentEn: "Recruiting",
    isDemo: true,
    leader: {
      slug: "ada-lovelace",
      kind: "teacher",
      nameZh: "艾达·洛夫莱斯",
      nameEn: "Ada Lovelace",
      researchAreas: ["Logic"],
      publicLinks: [],
      isDemo: true,
    },
  })
  assertFieldsAreAbsent(publicGroup, [
    "_id",
    "leaderPersonId",
    "visibility",
    "displayOrder",
    "createdAt",
    "updatedAt",
  ])
  assert.equal(Object.hasOwn(publicGroup.publicLinks[0], "privateNote"), false)
  assert.equal(Object.hasOwn(publicGroup.leader, "accountUserId"), false)
})

test("a research-group leader has exactly one active leader membership", () => {
  assert.throws(
    () => dto.validateGroupMemberships("person-1", [
      { personId: "person-1", role: "faculty", endedAt: undefined },
    ]),
    /INSTITUTE_LEADER_MEMBERSHIP_REQUIRED/,
  )
  assert.throws(
    () => dto.validateGroupMemberships("person-1", [
      { personId: "person-1", role: "leader", endedAt: undefined },
      { personId: "person-1", role: "leader", endedAt: undefined },
    ]),
    /INSTITUTE_LEADER_MEMBERSHIP_REQUIRED/,
  )
  assert.doesNotThrow(() => dto.validateGroupMemberships("person-1", [
    { personId: "person-1", role: "leader", endedAt: undefined },
    { personId: "person-2", role: "faculty", endedAt: undefined },
    { personId: "person-1", role: "leader", endedAt: 1_700_000_000_000 },
  ]))
})

test("public directory query source does not expose raw people or hidden switches", () => {
  const source = readFileSync("convex/instituteDirectory.ts", "utf8")

  assert.match(source, /toPublicInstitutePerson/)
  assert.match(source, /toPublicResearchGroup/)
  assert.doesNotMatch(source, /includeHidden/)
  assert.doesNotMatch(source, /return\s+(?:person|people)\s*[;,]/)
  assert.doesNotMatch(source, /publicLinks\s*:\s*person\.publicLinks/)
  assert.doesNotMatch(source, /publicLinks\s*:\s*group\.publicLinks/)
})
