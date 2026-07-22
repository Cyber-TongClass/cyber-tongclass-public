import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/components/notifications/aia-notification-inbox-client.tsx", "utf8")

test("AIA notification inbox marks only current-user Coffee Talk notices through canonical hooks", () => {
  assert.match(source, /useMarkCoffeeTalkNotificationRead/)
  assert.match(source, /useMarkAllCoffeeTalkNotificationsRead/)
  assert.match(source, /onNotificationOpen=/)
  assert.match(source, /onMarkRead=/)
  assert.match(source, /onMarkAllRead=/)
  assert.doesNotMatch(source, /convex\/_generated|from\s+["']convex\/react["']/)
  assert.doesNotMatch(source, /\b(?:email|studentId|password|sessionToken)\b/i)
})
