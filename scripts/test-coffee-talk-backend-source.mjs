import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const schema = readFileSync("convex/schema.ts", "utf8")
const backendPath = "convex/coffeeTalk.ts"

test("Coffee Talk persistence has application, immutable history, and private notification tables", () => {
  assert.match(schema, /coffeeTalkApplications:\s*defineTable/)
  assert.match(schema, /coffeeTalkEvents:\s*defineTable/)
  assert.match(schema, /notifications:\s*defineTable/)
  assert.match(schema, /\.index\("by_applicant_fingerprint",\s*\["applicantUserId",\s*"contentFingerprint"\]\)/)
  assert.match(schema, /\.index\("by_application_sequence",\s*\["applicationId",\s*"sequenceNo"\]\)/)
  assert.match(schema, /\.index\("by_user_createdAt",\s*\["userId",\s*"createdAt"\]\)/)
})

test("Coffee Talk backend derives authority from sessions and explicit institute account binding", () => {
  const source = readFileSync(backendPath, "utf8")

  for (const exportedEndpoint of [
    "submitApplication",
    "listMine",
    "listForTeacher",
    "actOnApplication",
    "listNotifications",
  ]) {
    assert.match(source, new RegExp(`export const ${exportedEndpoint}\\s*=`))
  }

  assert.match(source, /getUserBySession/)
  assert.match(source, /resolveCoffeeTalkActorKind/)
  assert.match(source, /\.withIndex\("by_accountUserId"/)
  assert.match(source, /teacherSlug:\s*v\.string\(\)/)
  assert.match(source, /teacher\.accountUserId\s*===\s*undefined/)
  assert.doesNotMatch(source, /teacherUserId:\s*v\.id\("users"\)/)
  assert.match(source, /expectedVersion:\s*v\.number\(\)/)
  assert.match(source, /COFFEE_TALK_VERSION_CONFLICT/)
})

test("Coffee Talk notifications route applicants and explicitly bound teachers to their own safe consoles", () => {
  const source = readFileSync(backendPath, "utf8")

  assert.match(source, /async function coffeeTalkNotificationHref/)
  assert.match(source, /application\.applicantUserId/)
  assert.match(source, /assignedTeacherPersonId/)
  assert.match(source, /teacher\.accountUserId/)
  assert.match(source, /"\/services\/coffee-talk\/my"/)
  assert.match(source, /"\/services\/coffee-talk\/manage"/)
  assert.match(source, /return Promise\.all\(notifications\.map/)
})

test("Coffee Talk notifications can only be marked read by the current session owner", () => {
  const source = readFileSync(backendPath, "utf8")

  assert.match(source, /export const markNotificationRead\s*=\s*mutation/)
  assert.match(source, /export const markAllNotificationsRead\s*=\s*mutation/)
  assert.match(source, /notificationId:\s*v\.id\("notifications"\)/)
  assert.match(source, /String\(notification\.userId\)\s*!==\s*String\(actor\._id\)/)
  assert.match(source, /readAt:\s*now/)
})
