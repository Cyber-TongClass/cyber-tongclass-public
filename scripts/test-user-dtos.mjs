import assert from "node:assert/strict"
import path from "node:path"
import test from "node:test"
import { pathToFileURL } from "node:url"

const moduleUrl = pathToFileURL(path.resolve("convex/lib/userDto.ts")).href
const dto = await import(moduleUrl)

const userDocument = {
  _id: "users:ada",
  _creationTime: 1_700_000_000_000,
  email: "ada@tongclass.example",
  username: "ada",
  englishName: "Ada Lovelace",
  chineseName: "艾达",
  role: "admin",
  organization: "pku",
  cohort: 2026,
  studentId: "20260001",
  personalEmails: ["ada.private@example"],
  personalEmail: "ada.legacy@example",
  bio: "Computing pioneer",
  profileMarkdown: "# Ada",
  researchDirections: ["Machine Learning"],
  researchInterests: ["Programming Languages"],
  links: [{
    type: "github",
    label: "GitHub",
    url: "https://github.com/ada",
    privateLinkToken: "must-not-leak",
  }],
  avatar: "https://images.example/avatar.png",
  realPhoto: "https://images.example/photo.png",
  isClassMember: true,
  isEmailVerified: true,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_001_000,
  accountStatus: "active",
  identityType: "password",
  verificationCode: "secret-code",
  lastVerificationRequestedAt: 1_700_000_000_500,
  password: "not-a-dto-field",
  passwordHash: "not-a-dto-field",
  salt: "not-a-dto-field",
  sessionToken: "not-a-dto-field",
  authSession: { token: "not-a-dto-field" },
  credentials: { passwordHash: "not-a-dto-field" },
  unknownTopLevel: "must-not-leak",
}

const publicFields = [
  "_id",
  "_creationTime",
  "email",
  "personalEmails",
  "personalEmail",
  "studentId",
  "role",
  "accountStatus",
  "identityType",
  "isEmailVerified",
  "verificationCode",
  "lastVerificationRequestedAt",
  "password",
  "passwordHash",
  "salt",
  "sessionToken",
  "authSession",
  "credentials",
  "createdAt",
  "updatedAt",
  "unknownTopLevel",
]

const credentialFields = [
  "_id",
  "_creationTime",
  "accountStatus",
  "identityType",
  "verificationCode",
  "lastVerificationRequestedAt",
  "password",
  "passwordHash",
  "salt",
  "sessionToken",
  "authSession",
  "credentials",
  "unknownTopLevel",
]

function assertFieldsAreAbsent(value, fields) {
  for (const field of fields) {
    assert.equal(Object.hasOwn(value, field), false, `${field} must not be in the DTO`)
  }
}

test("toPublicTongClassMemberDto returns only the public member profile", () => {
  const publicMember = dto.toPublicTongClassMemberDto(userDocument)

  assert.deepEqual(publicMember, {
    username: "ada",
    englishName: "Ada Lovelace",
    chineseName: "艾达",
    organization: "pku",
    cohort: 2026,
    bio: "Computing pioneer",
    profileMarkdown: "# Ada",
    researchDirections: ["Machine Learning"],
    researchInterests: ["Programming Languages"],
    links: [{
      type: "github",
      label: "GitHub",
      url: "https://github.com/ada",
    }],
    avatar: "https://images.example/avatar.png",
    realPhoto: "https://images.example/photo.png",
    isClassMember: true,
  })
  assert.notStrictEqual(publicMember.links, userDocument.links)
  assert.equal(Object.hasOwn(publicMember.links[0], "privateLinkToken"), false)
  assertFieldsAreAbsent(publicMember, publicFields)
})

test("toTongClassDirectoryUserDto gives signed-in tools an identifier without private account fields", () => {
  const directoryMember = dto.toTongClassDirectoryUserDto(userDocument)

  assert.deepEqual(directoryMember, {
    id: "users:ada",
    username: "ada",
    englishName: "Ada Lovelace",
    chineseName: "艾达",
    organization: "pku",
    cohort: 2026,
    bio: "Computing pioneer",
    profileMarkdown: "# Ada",
    researchDirections: ["Machine Learning"],
    researchInterests: ["Programming Languages"],
    links: [{
      type: "github",
      label: "GitHub",
      url: "https://github.com/ada",
    }],
    avatar: "https://images.example/avatar.png",
    realPhoto: "https://images.example/photo.png",
    isClassMember: true,
  })
  assert.equal(Object.hasOwn(directoryMember, "_id"), false)
  assertFieldsAreAbsent(directoryMember, publicFields)
})

test("toCurrentUserDto returns the owner account fields without credential or session data", () => {
  const currentUser = dto.toCurrentUserDto(userDocument)

  assert.deepEqual(currentUser, {
    email: "ada@tongclass.example",
    username: "ada",
    englishName: "Ada Lovelace",
    chineseName: "艾达",
    role: "admin",
    organization: "pku",
    cohort: 2026,
    studentId: "20260001",
    personalEmails: ["ada.private@example"],
    personalEmail: "ada.legacy@example",
    bio: "Computing pioneer",
    profileMarkdown: "# Ada",
    researchDirections: ["Machine Learning"],
    researchInterests: ["Programming Languages"],
    links: [{
      type: "github",
      label: "GitHub",
      url: "https://github.com/ada",
    }],
    avatar: "https://images.example/avatar.png",
    realPhoto: "https://images.example/photo.png",
    isClassMember: true,
    isEmailVerified: true,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_001_000,
  })
  assert.equal(Object.hasOwn(currentUser.links[0], "privateLinkToken"), false)
  assertFieldsAreAbsent(currentUser, credentialFields)
})

test("toAdminUserDto returns admin account fields without credential or session data", () => {
  const adminUser = dto.toAdminUserDto(userDocument)

  assert.deepEqual(adminUser, {
    email: "ada@tongclass.example",
    username: "ada",
    englishName: "Ada Lovelace",
    chineseName: "艾达",
    role: "admin",
    organization: "pku",
    cohort: 2026,
    studentId: "20260001",
    personalEmails: ["ada.private@example"],
    personalEmail: "ada.legacy@example",
    bio: "Computing pioneer",
    profileMarkdown: "# Ada",
    researchDirections: ["Machine Learning"],
    researchInterests: ["Programming Languages"],
    links: [{
      type: "github",
      label: "GitHub",
      url: "https://github.com/ada",
    }],
    avatar: "https://images.example/avatar.png",
    realPhoto: "https://images.example/photo.png",
    isClassMember: true,
    isEmailVerified: true,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_001_000,
  })
  assert.equal(Object.hasOwn(adminUser.links[0], "privateLinkToken"), false)
  assertFieldsAreAbsent(adminUser, credentialFields)
})
