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
  assert.doesNotMatch(source, /teacherUserId:\s*v\.id\("users"\)/)
  assert.match(source, /expectedVersion:\s*v\.number\(\)/)
  assert.match(source, /COFFEE_TALK_VERSION_CONFLICT/)
})
