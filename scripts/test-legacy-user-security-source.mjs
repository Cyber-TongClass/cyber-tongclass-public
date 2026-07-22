import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const usersSource = await readFile("convex/users.ts", "utf8")
const authSource = await readFile("convex/auth.ts", "utf8")
const apiSource = await readFile("src/lib/api.ts", "utf8")
const verificationSource = await readFile("convex/emailVerifications.ts", "utf8")
const verifyTokenRoute = await readFile("src/app/api/verify-token/route.ts", "utf8")
const requestVerificationRoute = await readFile("src/app/api/request-verification/route.ts", "utf8")

function exportedBlock(source, name, kind = "query") {
  const marker = `export const ${name} = ${kind}({`
  const start = source.indexOf(marker)
  assert.notEqual(start, -1, `${name} ${kind} is present`)
  const next = source.indexOf("export const ", start + marker.length)
  return source.slice(start, next === -1 ? undefined : next)
}

test("legacy private user queries require a session-derived actor and project DTOs", () => {
  for (const name of ["list", "getById", "getByEmail", "getByStudentId", "search"]) {
    const source = exportedBlock(usersSource, name)
    assert.match(source, /sessionToken:\s*v\.string\(\)/, `${name} requires a session token`)
    assert.match(source, /getUserBySession\(ctx,\s*args\.sessionToken\)/, `${name} resolves the actor from that session`)
    assert.match(source, /to(?:Admin|Current|TongClassDirectory)(?:UserDto|AccountDto)/, `${name} returns an allowlisted DTO`)
    assert.doesNotMatch(source, /return\s+user\s*;/, `${name} cannot return a raw user document`)
  }
})

test("public member discovery uses a dedicated safe projection rather than legacy account queries", () => {
  for (const name of ["listPublicTongClassMembers", "searchPublicTongClassMembers", "getPublicTongClassMemberBySlug"]) {
    const source = exportedBlock(usersSource, name)
    assert.match(source, /toPublicTongClassMemberDto/, `${name} uses the public DTO allowlist`)
    assert.doesNotMatch(source, /return\s+user\s*;/, `${name} cannot return a raw user document`)
  }

  const profileSource = exportedBlock(usersSource, "getByProfileSlug")
  assert.match(profileSource, /toPublicTongClassMemberDto\(/, "legacy profile lookup is a safe public projection")
  assert.doesNotMatch(profileSource, /includeHidden/, "public profile lookup cannot accept a visibility bypass")
  assert.match(usersSource, /String\((?:candidate|user)\._id\)\s*===\s*slug/, "legacy profile IDs resolve only to the same safe public projection")
})

test("password and markdown mutations derive authority from sessions", () => {
  const passwordSource = exportedBlock(usersSource, "updatePasswordByUserId", "mutation")
  assert.match(passwordSource, /sessionToken:\s*v\.string\(\)/)
  assert.match(passwordSource, /getUserBySession\(ctx,\s*args\.sessionToken\)/)
  assert.match(passwordSource, /actor\.role\s*!==\s*"super_admin"/)

  const markdownSource = exportedBlock(usersSource, "updateProfileMarkdown", "mutation")
  assert.match(markdownSource, /sessionToken:\s*v\.string\(\)/)
  assert.match(markdownSource, /getUserBySession\(ctx,\s*args\.sessionToken\)/)
  assert.doesNotMatch(markdownSource, /requesterId/, "caller cannot select the markdown requester")
})

test("email verification is bound to consumed verification state, not an arbitrary user id", () => {
  const markSource = exportedBlock(usersSource, "markEmailVerified", "mutation")
  assert.match(markSource, /verificationId:\s*v\.id\("emailVerifications"\)/)
  assert.doesNotMatch(markSource, /userId:\s*v\.id\("users"\)/)
  assert.match(markSource, /verification\.usedAt/)
  assert.match(markSource, /verification\.purpose\s*!==\s*"email_verification"/)

  const consumeSource = exportedBlock(verificationSource, "consume", "mutation")
  assert.match(consumeSource, /verificationId:\s*row\._id/)
  assert.match(verifyTokenRoute, /verificationId:\s*consume\.verificationId/)
  assert.doesNotMatch(verifyTokenRoute, /users:getByEmail/, "verification routes cannot use raw email account lookup")
  assert.doesNotMatch(requestVerificationRoute, /users:getByEmail/, "request route cannot query raw account data by email")
  assert.doesNotMatch(requestVerificationRoute, /users:touchVerificationRequest/, "request route cannot patch a caller-selected user")

  const createSource = exportedBlock(verificationSource, "create", "mutation")
  assert.doesNotMatch(createSource, /userId:\s*v\.optional\(v\.id\("users"\)\)/, "verification creation cannot accept a caller-selected user")
  assert.match(createSource, /withIndex\("by_email"/, "verification creation resolves the account internally")
  assert.doesNotMatch(createSource, /alreadyVerified/, "verification creation cannot disclose whether an email belongs to a verified account")
  assert.doesNotMatch(requestVerificationRoute, /Email is already verified/, "request route keeps account existence responses generic")
})

test("canonical client hooks separate public, directory, and admin user reads", () => {
  assert.match(apiSource, /listPublicTongClassMembersRef/)
  assert.match(apiSource, /listTongClassDirectoryMembersRef/)
  assert.match(apiSource, /listAdminUsersRef/)
  assert.match(apiSource, /export function useAdminUsers\(/)
  assert.match(apiSource, /getPublicTongClassMemberBySlugRef/)

  const publicUsersStart = apiSource.indexOf("export function useUsers(")
  assert.notEqual(publicUsersStart, -1, "useUsers is exported")
  const publicUsersEnd = apiSource.indexOf("export function ", publicUsersStart + 1)
  const publicUsersSource = apiSource.slice(publicUsersStart, publicUsersEnd === -1 ? undefined : publicUsersEnd)
  assert.doesNotMatch(publicUsersSource, /api\.users\.list/, "general UI cannot call legacy raw list directly")
})

test("auth current-account queries project only the session owner's DTO", () => {
  for (const name of ["currentUser", "currentUserBySession"]) {
    const source = exportedBlock(authSource, name)
    assert.match(source, /toCurrent(?:UserDto|AccountDto)\(/, `${name} returns an owner DTO projection`)
    assert.doesNotMatch(source, /return\s+user\s*\|\|\s+null/, `${name} cannot return a raw user document`)
  }

  const lookupSource = exportedBlock(authSource, "getUserByEmail")
  assert.match(lookupSource, /sessionToken:\s*v\.string\(\)/, "email lookup requires an administrator session")
  assert.match(lookupSource, /getUserBySession\(ctx,\s*args\.sessionToken\)/)
  assert.doesNotMatch(lookupSource, /return\s+user\s*;/, "email lookup cannot return a raw user document")
})
