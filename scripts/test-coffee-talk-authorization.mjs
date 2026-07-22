import assert from "node:assert/strict"
import path from "node:path"
import test from "node:test"
import { pathToFileURL } from "node:url"

const authorizationUrl = pathToFileURL(
  path.resolve("convex/lib/coffeeTalkAuthorization.ts"),
).href
const authorization = await import(authorizationUrl)

test("Coffee Talk derives applicant, bound teacher, and coordinator actors only from server records", () => {
  assert.equal(
    authorization.resolveCoffeeTalkActorKind({
      actorUserId: "users:applicant",
      actorRole: "member",
      applicantUserId: "users:applicant",
      assignedTeacherUserId: "users:teacher",
    }),
    "applicant",
  )
  assert.equal(
    authorization.resolveCoffeeTalkActorKind({
      actorUserId: "users:teacher",
      actorRole: "member",
      applicantUserId: "users:applicant",
      assignedTeacherUserId: "users:teacher",
    }),
    "teacher",
  )
  assert.equal(
    authorization.resolveCoffeeTalkActorKind({
      actorUserId: "users:admin",
      actorRole: "admin",
      applicantUserId: "users:applicant",
      assignedTeacherUserId: "users:teacher",
    }),
    "coordinator",
  )
})

test("Coffee Talk never treats unbound teachers or client-selected labels as authorized", () => {
  assert.equal(
    authorization.resolveCoffeeTalkActorKind({
      actorUserId: "users:unbound-teacher",
      actorRole: "member",
      applicantUserId: "users:applicant",
      assignedTeacherUserId: "users:teacher",
    }),
    null,
  )
  assert.equal(
    authorization.resolveCoffeeTalkActorKind({
      actorUserId: "users:applicant",
      actorRole: "super_admin",
      applicantUserId: "users:other",
      assignedTeacherUserId: undefined,
    }),
    "coordinator",
  )
})
