import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

function source(path) {
  assert.ok(existsSync(path), `Expected ${path} to exist`)
  return readFileSync(path, "utf8")
}

test("AIA exposes a session-aware, data-minimized unified notification inbox", () => {
  const navbar = source("src/components/layout/aia-navbar.tsx")
  const inbox = source("src/components/notifications/aia-notification-inbox-client.tsx")
  const page = source("src/app/notifications/page.tsx")

  assert.match(navbar, /useAiaNotifications/)
  assert.match(navbar, /NotificationBell/)
  assert.match(navbar, /href="\/notifications"/)
  assert.doesNotMatch(navbar, /from\s+["'][^"']*convex[^"']*["']/i)

  assert.match(inbox, /useCoffeeTalkNotifications/)
  assert.match(inbox, /NotificationInbox/)
  assert.match(inbox, /NotificationRowItem.*notification-row/)
  assert.doesNotMatch(inbox, /from\s+["'][^"']*convex[^"']*["']/i)
  assert.doesNotMatch(inbox, /applicantEmail|topic|availability|teacherSlug/)

  assert.match(page, /AiaNotificationInboxClient/)
})
