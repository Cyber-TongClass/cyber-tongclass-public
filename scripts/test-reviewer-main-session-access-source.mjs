import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8")

test("reviewer API accepts exactly one credential source without exposing tokens", () => {
  const constants = read("src/app/reviewer/reviewer-access-constants.ts")
  const access = read("src/app/api/reviewer/_lib/access.ts")

  assert.match(constants, /x-main-session-token/)
  assert.match(access, /REVIEWER_MAIN_SESSION_HEADER/)
  assert.match(access, /reviewerSessionToken\s*&&\s*mainSessionToken/)
  assert.match(access, /不能同时使用 Reviewer 登录和主站教师授权/)
  assert.match(access, /reviewerSessionToken/)
  assert.match(access, /mainSessionToken/)
  assert.doesNotMatch(access, /console\.(?:log|error).*token/i)
})

test("all academic-exchange reviewer routes forward only the selected credential", () => {
  const routes = [
    "src/app/api/reviewer/academic-exchange/route.ts",
    "src/app/api/reviewer/academic-exchange/[id]/route.ts",
    "src/app/api/reviewer/academic-exchange/[id]/pdf/route.ts",
    "src/app/api/reviewer/academic-exchange/export/route.ts",
  ]

  for (const route of routes) {
    const source = read(route)
    assert.match(source, /getReviewerAccessCredentials/)
    assert.match(source, /toAcademicExchangeAccessArgs/)
    assert.doesNotMatch(source, /request\.cookies\.get\(REVIEWER_SESSION_COOKIE\)/)
  }
})

test("reviewer identity endpoint probes a main session without exposing the bound reviewer account", () => {
  const source = read("src/app/api/reviewer/me/route.ts")

  assert.match(source, /getReviewerAccessCredentials/)
  assert.match(source, /accessMode:\s*"teacher_derived"/)
  assert.match(source, /listApplicationsRef/)
  assert.doesNotMatch(source, /teacher_derived[\s\S]{0,300}reviewer:\s*reviewer/)
})

test("reviewer layout tries an independent cookie before forwarding an authenticated main session", () => {
  const source = read("src/app/reviewer/layout.tsx")

  assert.match(source, /useAuth/)
  assert.match(source, /useTongClassSessionToken/)
  assert.match(source, /loadIndependentReviewer/)
  assert.match(source, /loadTeacherReviewer/)
  assert.match(source, /isAuthenticated\s*&&\s*mainSessionToken/)
  assert.match(source, /REVIEWER_MAIN_SESSION_HEADER/)
  assert.match(source, /教师授权访问/)
  assert.match(source, /退出 Reviewer/)
})

test("academic-exchange screens add the main-session header only for teacher-derived access", () => {
  const constants = read("src/app/reviewer/reviewer-access-constants.ts")
  const context = read("src/app/reviewer/reviewer-access-context.tsx")
  const pages = [
    "src/app/reviewer/reimbursements/academic-exchange/page.tsx",
    "src/app/reviewer/reimbursements/academic-exchange/[id]/page.tsx",
  ]

  assert.match(constants, /x-main-session-token/)
  assert.match(context, /mode\s*===\s*"teacher_derived"/)
  assert.match(context, /REVIEWER_MAIN_SESSION_HEADER/)
  assert.doesNotMatch(context, /console\.(?:log|error).*token/i)

  for (const page of pages) {
    const source = read(page)
    assert.match(source, /useReviewerAccess/)
    assert.match(source, /reviewerAccessHeaders/)
  }
})
