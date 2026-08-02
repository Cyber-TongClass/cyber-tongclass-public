import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"
import { pathToFileURL } from "node:url"

const dtoModuleUrl = pathToFileURL(path.resolve("convex/lib/instituteDto.ts")).href
const dto = await import(dtoModuleUrl)

function assertRelationshipFieldsAreAbsent(value) {
  for (const field of [
    "_id",
    "_creationTime",
    "personId",
    "researchGroupId",
    "accountUserId",
    "email",
    "studentId",
    "visibility",
    "sortOrder",
    "startedAt",
    "endedAt",
    "createdAt",
    "updatedAt",
  ]) {
    assert.equal(Object.hasOwn(value, field), false, `${field} must not appear in a public relationship DTO`)
  }
}

test("public directory relationship DTOs emit only explicit roles and safe profile references", () => {
  const teacher = {
    _id: "institutePeople:teacher",
    slug: "professor-zhang",
    kind: "teacher",
    nameZh: "张教授",
    nameEn: "Professor Zhang",
    titleZh: "教授",
    researchAreas: ["可信人工智能"],
    publicLinks: [],
    publicEmail: "teacher@example.edu",
    isDemo: false,
    accountUserId: "users:teacher",
  }
  const graduate = {
    _id: "institutePeople:graduate",
    slug: "student-li",
    kind: "graduate",
    nameZh: "李同学",
    nameEn: "Student Li",
    titleZh: "博士生",
    researchAreas: ["可信人工智能"],
    publicLinks: [],
    publicEmail: "graduate@example.edu",
    isDemo: false,
    accountUserId: "users:graduate",
    studentId: "20260001",
  }
  const group = {
    _id: "researchGroups:trustworthy-ai",
    slug: "trustworthy-ai-lab",
    nameZh: "可信人工智能实验室",
    nameEn: "Trustworthy AI Lab",
    researchAreas: ["可信人工智能"],
    publicLinks: [],
    isDemo: false,
    leaderPersonId: "institutePeople:teacher",
  }

  const publicTeacher = dto.toPublicInstitutePerson(teacher, [{
    role: "leader",
    researchGroup: group,
  }])
  const publicGroup = dto.toPublicResearchGroup(group, teacher, [{
    role: "graduate",
    person: graduate,
  }])

  assert.deepEqual(publicTeacher.researchGroupMemberships, [{
    role: "leader",
    researchGroup: {
      slug: "trustworthy-ai-lab",
      nameZh: "可信人工智能实验室",
      nameEn: "Trustworthy AI Lab",
      isDemo: false,
    },
  }])
  assert.deepEqual(publicGroup.members, [{
    role: "graduate",
    person: {
      slug: "student-li",
      kind: "graduate",
      nameZh: "李同学",
      nameEn: "Student Li",
      titleZh: "博士生",
      isDemo: false,
    },
  }])

  assertRelationshipFieldsAreAbsent(publicTeacher.researchGroupMemberships[0])
  assertRelationshipFieldsAreAbsent(publicTeacher.researchGroupMemberships[0].researchGroup)
  assertRelationshipFieldsAreAbsent(publicGroup.members[0])
  assertRelationshipFieldsAreAbsent(publicGroup.members[0].person)
  assert.equal(Object.hasOwn(publicGroup.members[0].person, "publicEmail"), false)
})

test("public directory resolves relationships only through active public membership rows", () => {
  const directorySource = readFileSync("convex/instituteDirectory.ts", "utf8")
  const publicDirectorySource = directorySource.slice(
    directorySource.indexOf("function isPublicActiveMembership"),
    directorySource.indexOf("export const getMyPublicProfileDestination"),
  )

  assert.match(publicDirectorySource, /\.query\("researchGroupMemberships"\)/)
  assert.match(publicDirectorySource, /by_group_order/)
  assert.match(publicDirectorySource, /by_person_order/)
  assert.match(publicDirectorySource, /isPublicActiveMembership\(membership\)/)
  assert.match(publicDirectorySource, /membership\.visibility\s*===\s*["']public["']/)
  assert.match(publicDirectorySource, /membership\.endedAt\s*===\s*undefined/)
  assert.doesNotMatch(publicDirectorySource, /\.query\("users"\)/)
  assert.doesNotMatch(publicDirectorySource, /accountUserId|publicEmail|studentId/)
})

test("live group profiles render explicit membership roles while teacher profiles stay compact", () => {
  const livePersonProfile = readFileSync("src/components/institute/live-person-profile.tsx", "utf8")
  const liveGroupProfile = readFileSync("src/components/institute/live-research-group-profile.tsx", "utf8")
  const personProfile = readFileSync("src/components/institute/person-profile.tsx", "utf8")
  const groupProfile = readFileSync("src/components/institute/research-group-profile.tsx", "utf8")

  assert.match(livePersonProfile, /person\.researchGroupMemberships/)
  assert.match(liveGroupProfile, /group\.members/)
  assert.match(personProfile, /person\.kind !== "teacher"/)
  assert.doesNotMatch(personProfile, /相关团队的公开研究生/)
  assert.match(groupProfile, /roleLabel/)

  for (const source of [livePersonProfile, liveGroupProfile]) {
    assert.doesNotMatch(source, /accountUserId|studentId|publicEmail|\.email\b/)
  }
})
