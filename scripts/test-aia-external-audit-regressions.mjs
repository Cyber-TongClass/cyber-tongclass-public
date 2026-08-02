import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8")

test("legacy and preview links resolve to real Tong Class routes", () => {
  assert.match(read("src/app/users/page.tsx"), /redirect\("\/tong-class\/members"\)/)
  assert.match(read("src/app/users/[id]/page.tsx"), /`\/tong-class\/members\/\$\{params\.id\}`/)
  for (const [file, stale] of [
    ["src/app/admin/news/page.tsx", "href={`/news/"],
    ["src/app/admin/events/page.tsx", "href={`/events/"],
    ["src/app/admin/publications/page.tsx", "href={`/publications/"],
    ["src/app/admin/users/page.tsx", "href={`/members/"],
    ["src/app/my-publications/page.tsx", "href={`/publications/"],
  ]) {
    assert.doesNotMatch(read(file), new RegExp(stale.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }
})

test("reported return paths preserve source context", () => {
  assert.match(read("src/app/settings/page.tsx"), /\/login\?next=/)
  assert.match(read("src/components/oa/aia-oa-shared.tsx"), /SafeReturnLink/)
  assert.match(read("src/components/coffee-talk/coffee-talk-apply-client.tsx"), /safeLocalPath|returnTo/)
  assert.doesNotMatch(read("src/app/admin/events/[id]/page.tsx"), /router\.back\(\)/)
  assert.doesNotMatch(read("src/app/admin/news/[id]/page.tsx"), /router\.back\(\)/)
  assert.doesNotMatch(read("src/app/admin/users/[id]/page.tsx"), /router\.back\(\)/)
})

test("OA workflow scopes and submission details close the audited gaps", () => {
  const backend = read("convex/oaForms.ts")
  assert.match(backend, /researchGroupIds:\s*v\.optional\(v\.array\(v\.id\("researchGroups"\)\)\)/)
  assert.match(read("convex/lib/oaWorkflow.ts"), /adminNote:\s*comment/)
  const detail = read("src/app/services/oa/submissions/[id]/page.tsx")
  assert.match(detail, /AiaOALoginRequired/)
  assert.match(detail, /useOAFormAttachmentUrl/)
  assert.match(detail, /resultValues/)
  assert.match(detail, /allowSubmissionEdits/)
})

test("Coffee Talk exposes actionable details and source-aware application flow", () => {
  assert.match(read("src/components/coffee-talk/coffee-talk-my-client.tsx"), /href:/)
  assert.match(read("src/components/coffee-talk/coffee-talk-teacher-manage-client.tsx"), /CoffeeTalkApplicationDetail|href:/)
  assert.match(read("src/components/coffee-talk/coffee-talk-apply-client.tsx"), /useSearchParams/)
  assert.match(read("src/components/coffee-talk/coffee-talk-apply-client.tsx"), /person\.isDemo\s*!==\s*true|!person\.isDemo/)
  assert.match(read("src/app/services/coffee-talk/apply/page.tsx"), /Suspense/)
})

test("critical security findings are removed or require explicit authority", () => {
  assert.equal(fs.existsSync(path.join(root, "convex/debug.ts")), false)
  assert.match(read("convex/emailVerifications.ts"), /serviceToken/)
  assert.match(read("convex/users.ts"), /revokeUserSessions/)
  assert.match(read("convex/reviewer/lib.ts"), /pbkdf2-sha256/)
  assert.match(read("convex/treehole.ts"), /getUserBySession/)
  assert.match(read("convex/publicationVenues.ts"), /getUserBySession/)
})

test("account completion and TechDay role transitions do not dead-end users", () => {
  assert.doesNotMatch(read("src/app/verify-email/VerifyEmailClient.tsx"), /router\.push\(`\/register/)
  const submissions = read("convex/techday/submissions.ts")
  const login = read("src/app/techday/login/page.tsx")
  assert.doesNotMatch(submissions, /existingByMain\?\.status === "pending" \? "author"/)
  assert.match(login, /\/techday\/register\/author/)
  assert.match(login, /Suspense/)
  assert.match(read("src/app/tong-class/intranet/creative-challenge-2026/projects/page.tsx"), /Suspense/)
})

test("academic exchange applications expose a complete reviewer and withdrawal workflow", () => {
  const backend = read("convex/academicExchange.ts")
  const reviewerRoute = read("src/app/api/reviewer/academic-exchange/[id]/route.ts")
  const reviewerDetail = read("src/app/reviewer/reimbursements/academic-exchange/[id]/page.tsx")
  const reviewerList = read("src/app/reviewer/reimbursements/academic-exchange/page.tsx")
  const legacyStudentDetail = read("src/app/tong-class/intranet/reimbursements/academic-exchange/[id]/page.tsx")
  const studentDetail = read("src/components/reimbursements/academic-exchange-detail-client.tsx")
  const studentForm = read("src/components/reimbursements/academic-exchange-form-client.tsx")

  assert.match(backend, /reviewApplicationForReviewer/)
  assert.match(backend, /withdrawApplication/)
  assert.match(backend, /updateApplication/)
  assert.match(reviewerRoute, /export async function POST/)
  assert.match(reviewerDetail, /request_changes/)
  assert.match(reviewerDetail, /approve/)
  assert.match(reviewerDetail, /reject/)
  assert.match(reviewerDetail, /审核意见/)
  assert.match(reviewerList, /application\.status/)
  assert.match(legacyStudentDetail, /redirect\(`\/services\/oa\/reimbursements\/academic-exchange\/\$\{id\}`\)/)
  assert.match(studentDetail, /useWithdrawAcademicExchangeApplication/)
  assert.match(studentDetail, /application\.reviewNote/)
  assert.match(studentDetail, /\/services\/oa\/reimbursements\/academic-exchange\/\$\{application\._id\}\/edit/)
  assert.ok(fs.existsSync(path.join(root, "src/app/tong-class/intranet/reimbursements/academic-exchange/[id]/edit/page.tsx")))
  assert.match(studentForm, /localStorage/)
  assert.doesNotMatch(reviewerDetail, /Reviewer 仅可只读查看/)
})
