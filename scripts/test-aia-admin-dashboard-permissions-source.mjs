import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const dashboard = readFileSync("src/app/admin/page.tsx", "utf8")
const techDayShell = readFileSync("src/components/techday/techday-shell.tsx", "utf8")
const volunteerRegistration = readFileSync("src/app/techday/register/volunteer/page.tsx", "utf8")
const awardsPage = readFileSync("src/app/techday/awards/page.tsx", "utf8")

test("admin dashboard skips capability-gated event queries until manage permission is known", () => {
  assert.match(dashboard, /useMyContentPermissions\(\)/)
  assert.match(dashboard, /useAdminEvents\(\{\s*disabled:\s*permissions\?\.events\.canManage\s*!==\s*true\s*\}\)/)
})

test("pending TechDay volunteer registration clears the submitted password", () => {
  assert.match(volunteerRegistration, /setForm\(\(current\)\s*=>\s*\(\{\s*\.\.\.current,\s*password:\s*""\s*\}\)\)/)
})

test("award recommendations describe and close their dialog after a successful save", () => {
  assert.match(awardsPage, /DialogDescription/)
  assert.match(awardsPage, /openSubmissionIdRef\.current === submissionId/)
  assert.match(awardsPage, /setOpenSubmissionId\(null\)/)
  assert.match(awardsPage, /disabled=\{submittingRecommendationId === String\(item\._id\)\}/)
  assert.match(awardsPage, /open=\{openSubmissionId === String\(item\._id\)\}/)
  assert.match(awardsPage, /<Label htmlFor="recommendation-reason">推荐理由<\/Label>/)
})

test("TechDay-only users can revoke their server session and leave the account", () => {
  assert.match(techDayShell, /useTechDayLogout\(\)/)
  assert.match(techDayShell, /logout\(\{\s*techDaySessionToken\s*\}\)/)
  assert.match(techDayShell, /localStorage\.removeItem\("techday_session_token"\)/)
  assert.match(techDayShell, /notifyTechDayActorStorageChanged\(\)/)
  assert.ok(techDayShell.includes("退出"))
})
