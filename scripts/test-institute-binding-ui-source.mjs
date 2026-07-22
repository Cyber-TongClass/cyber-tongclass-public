import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const pagePath = "src/app/admin/institute/bindings/page.tsx"
const apiPath = "src/lib/api.ts"

function source(path) {
  return readFileSync(path, "utf8")
}

test("super-admin Institute binding console uses the canonical session-aware hooks", () => {
  assert.equal(existsSync(pagePath), true, "the binding console should be reachable from admin")

  const page = source(pagePath)
  const api = source(apiPath)

  assert.match(page, /useInstituteAccountBindingCandidates/)
  assert.match(page, /useBindInstitutePersonAccount/)
  assert.match(page, /useUpsertTeacherReviewerBinding/)
  assert.match(page, /useClearTeacherReviewerBinding/)
  assert.match(page, /useIsSuperAdmin/)
  assert.doesNotMatch(page, /convex\/_generated|from\s+["']convex\/react["']/)
  assert.doesNotMatch(page, /\b(?:email|studentId|password|sessionToken)\b/i)

  for (const hook of [
    "useInstituteAccountBindingCandidates",
    "useBindInstitutePersonAccount",
    "useUpsertTeacherReviewerBinding",
    "useClearTeacherReviewerBinding",
  ]) {
    assert.match(api, new RegExp(`export function ${hook}\\s*\\(`))
  }
})

test("admin navigation exposes the Institute binding console without exposing a public route", () => {
  const layout = source("src/app/admin/layout.tsx")

  assert.match(layout, /href:\s*["']\/admin\/institute\/bindings["']/)
  assert.doesNotMatch(source("src/components/layout/aia-navbar.tsx"), /admin\/institute\/bindings/)
})
