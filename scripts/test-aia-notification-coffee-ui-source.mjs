import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const componentPaths = [
  "src/components/notifications/notification-bell.tsx",
  "src/components/notifications/notification-inbox.tsx",
  "src/components/notifications/notification-row.tsx",
  "src/components/coffee-talk/coffee-talk-status-badge.tsx",
  "src/components/coffee-talk/coffee-talk-history.tsx",
  "src/components/coffee-talk/coffee-talk-application-list.tsx",
  "src/components/coffee-talk/coffee-talk-application-detail.tsx",
  "src/components/coffee-talk/coffee-talk-application-form.tsx",
  "src/components/coffee-talk/coffee-talk-backend-unavailable-state.tsx",
]

const routePaths = [
  "src/app/services/coffee-talk/page.tsx",
  "src/app/services/coffee-talk/apply/page.tsx",
  "src/app/services/coffee-talk/my/page.tsx",
]

function readSource(relativePath) {
  const absolutePath = resolve(repositoryRoot, relativePath)
  assert.ok(existsSync(absolutePath), `Expected ${relativePath} to exist`)
  return readFileSync(absolutePath, "utf8")
}

test("AIA notification and Coffee Talk presentation components keep their safety contracts", () => {
  const sources = Object.fromEntries(componentPaths.map((path) => [path, readSource(path)]))

  for (const [path, source] of Object.entries(sources)) {
    assert.doesNotMatch(source, /from\s+["'][^"']*convex[^"']*["']/i, `${path} must not import Convex directly`)
  }

  const bell = sources["src/components/notifications/notification-bell.tsx"]
  assert.match(bell, /aria-label=/, "NotificationBell needs an accessible label")
  assert.match(bell, /unreadCount/, "NotificationBell needs an unread count")
  assert.match(bell, /href\??:/, "NotificationBell needs an optional href")
  assert.match(bell, /onClick\??:/, "NotificationBell needs an optional callback")

  const notificationRow = sources["src/components/notifications/notification-row.tsx"]
  for (const state of ["unread", "read", "archived"]) {
    assert.match(notificationRow, new RegExp(`["']${state}["']`), `NotificationRow must handle ${state}`)
  }
  assert.match(notificationRow, /startsWith\(["']\/["']\)/, "Notification links must start with /")
  assert.match(notificationRow, /startsWith\(["']\/\/["']\)/, "Notification links must reject protocol-relative values")
  assert.doesNotMatch(notificationRow, /dangerouslySetInnerHTML/, "Notification text must use safe text rendering")

  const inbox = sources["src/components/notifications/notification-inbox.tsx"]
  assert.match(inbox, /NotificationRow/, "NotificationInbox must compose notification rows")
  assert.match(inbox, /notifications/, "NotificationInbox must accept server-provided notification DTOs")

  const statusBadge = sources["src/components/coffee-talk/coffee-talk-status-badge.tsx"]
  for (const status of ["submitted", "under_review", "needs_information", "accepted", "declined", "withdrawn", "cancelled", "completed"]) {
    assert.match(statusBadge, new RegExp(`["']${status}["']`), `CoffeeTalkStatusBadge must support ${status}`)
  }

  const history = sources["src/components/coffee-talk/coffee-talk-history.tsx"]
  assert.match(history, /\.slice\(\)\.sort\(/, "CoffeeTalkHistory must create a chronological copy")
  assert.match(history, /sequenceNo/, "CoffeeTalkHistory must order append-only sequence numbers")
  assert.match(history, /<ol\b/, "CoffeeTalkHistory must use chronological list semantics")
  assert.doesNotMatch(history, /on(?:Edit|Delete)|<button\b/, "CoffeeTalkHistory must not offer history mutations")

  const applicationList = sources["src/components/coffee-talk/coffee-talk-application-list.tsx"]
  const applicationDetail = sources["src/components/coffee-talk/coffee-talk-application-detail.tsx"]
  assert.match(applicationList, /allowedActions\.map/, "Application list actions must be server supplied")
  assert.match(applicationDetail, /allowedActions\.map/, "Application detail actions must be server supplied")
  assert.doesNotMatch(applicationList, /\bemail\b/i, "Application list must not render applicant contact email")
  assert.match(
    applicationDetail,
    /const mayShowApplicantEmail = application\.status === ["']accepted["'] \|\| application\.status === ["']completed["']/,
    "Application detail may show email only after acceptance or completion",
  )
  assert.match(
    applicationDetail,
    /mayShowApplicantEmail && application\.applicantContact\?\.email/,
    "Applicant email must remain behind its terminal-status guard",
  )

  const applicationForm = sources["src/components/coffee-talk/coffee-talk-application-form.tsx"]
  for (const field of ["applicantName", "affiliation", "email", "teacherPreference", "topic", "availability", "notes"]) {
    assert.match(applicationForm, new RegExp(`name=["']${field}["']`), `Application form must include ${field}`)
  }
  assert.match(applicationForm, /backendAvailable/, "Application form must represent backend availability explicitly")
  assert.doesNotMatch(applicationForm, /localStorage|sessionStorage|saveDraft|已保存/i, "Application form must not pretend to save a draft")
  assert.doesNotMatch(applicationForm, /calendar|reservation|attachment|chat|wechat/i, "Application form must stay within Coffee Talk scope")
  assert.match(applicationForm, /演示数据/, "Demo teachers must be visibly labelled")

  const routes = Object.fromEntries(routePaths.map((path) => [path, readSource(path)]))
  for (const [path, source] of Object.entries(routes)) {
    assert.doesNotMatch(source, /from\s+["'][^"']*convex[^"']*["']/i, `${path} must not import Convex directly`)
  }
  assert.match(routes["src/app/services/coffee-talk/page.tsx"], /href=["']\/services\/coffee-talk\/apply["']/)
  assert.match(routes["src/app/services/coffee-talk/apply/page.tsx"], /CoffeeTalkApplicationForm/)
  assert.match(routes["src/app/services/coffee-talk/my/page.tsx"], /CoffeeTalkBackendUnavailableState/)
})
