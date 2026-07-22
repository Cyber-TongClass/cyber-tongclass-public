import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8")

const schema = read("convex/schema.ts")
const reviewerAuth = read("convex/reviewerAuth.ts")
const reviewerLib = read("convex/reviewer/lib.ts")
const academicExchange = read("convex/academicExchange.ts")

test("reviewer accounts persist an exact, super-admin-created teacher binding", () => {
  assert.match(schema, /mainUserId:\s*v\.optional\(v\.id\("users"\)\)/)
  assert.match(schema, /teacherDerivedEnabled:\s*v\.optional\(v\.boolean\(\)\)/)
  assert.match(schema, /linkedAt:\s*v\.optional\(v\.number\(\)\)/)
  assert.match(schema, /linkedByUserId:\s*v\.optional\(v\.id\("users"\)\)/)
  assert.match(schema, /linkMethod:\s*v\.optional\(v\.union\(/)
  assert.match(schema, /\.index\("by_mainUserId",\s*\["mainUserId"\]\)/)

  assert.match(reviewerAuth, /export const upsertTeacherBinding\s*=\s*mutation\(/)
  assert.match(reviewerAuth, /requesterSessionToken:\s*v\.optional\(v\.string\(\)\)/)
  assert.match(reviewerAuth, /reviewerAccountId:\s*v\.id\("reviewerAccounts"\)/)
  assert.match(reviewerAuth, /mainUserId:\s*v\.id\("users"\)/)
  assert.match(reviewerAuth, /requireSuperAdminBySession\(ctx, args\.requesterSessionToken\)/)
  assert.match(reviewerAuth, /withIndex\("by_accountUserId"/)
  assert.match(reviewerAuth, /kind\s*===\s*"teacher"/)
  assert.match(reviewerAuth, /linkMethod:\s*"super_admin"/)
  assert.doesNotMatch(reviewerAuth, /email.*match|match.*email|displayName.*match|match.*displayName/i)
})

test("a derived Reviewer capability is resolved only from a main session and exact stored binding", () => {
  assert.match(reviewerLib, /export const requireAcademicExchangeReviewerAccess\s*=\s*async/)
  assert.match(reviewerLib, /mainSessionToken/)
  assert.match(reviewerLib, /resolveTeacherReviewerCapability/)
  assert.match(reviewerLib, /withIndex\("by_mainUserId"/)
  assert.match(reviewerLib, /withIndex\("by_accountUserId"/)
  assert.match(reviewerLib, /kind\s*===\s*"teacher"/)
  assert.match(reviewerLib, /teacherDerivedEnabled/)
  assert.match(reviewerLib, /reviewerSessionToken && mainSessionToken/)
})

test("existing academic-exchange reviewer reads accept the derived main-session capability", () => {
  const readEndpointCount = (academicExchange.match(/mainSessionToken:\s*v\.optional\(v\.string\(\)\)/g) || []).length
  assert.ok(readEndpointCount >= 4, "list, detail, file access, and download audit must accept a main session")
  assert.match(academicExchange, /requireAcademicExchangeReviewerAccess\(ctx, \{\s*reviewerSessionToken: args\.reviewerSessionToken,\s*mainSessionToken: args\.mainSessionToken/s)
  assert.match(academicExchange, /credentialSource/)
})
