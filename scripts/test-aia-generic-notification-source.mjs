import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

function source(path) {
  return readFileSync(path, "utf8")
}

test("AIA inbox prefers the generic notification contract while retaining the Coffee Talk fallback", () => {
  const inboxClient = source("src/components/notifications/aia-notification-inbox-client.tsx")

  assert.match(inboxClient, /import \* as apiHooks from ["']@\/lib\/api["']/)
  assert.match(inboxClient, /useAiaNotifications/)
  assert.match(inboxClient, /useMarkAiaNotificationRead/)
  assert.match(inboxClient, /useMarkAllAiaNotificationsRead/)
  assert.match(inboxClient, /useCoffeeTalkNotifications/)
  assert.match(inboxClient, /useMarkCoffeeTalkNotificationRead/)
  assert.match(inboxClient, /useMarkAllCoffeeTalkNotificationsRead/)
  assert.match(inboxClient, /hasGenericNotificationHooks/)
  assert.match(inboxClient, /useAuth/)
  assert.match(inboxClient, /const \{ isAuthenticated \} = useAuth\(\)/)
  assert.doesNotMatch(inboxClient, /useTongClassSessionToken/)
  assert.match(inboxClient, /category/)
  assert.match(inboxClient, /type/)
  assert.match(inboxClient, /archivedAt/)
  assert.doesNotMatch(inboxClient, /from\s+["'][^"']*convex[^"']*["']/i)
})

test("AIA notification rows render category and type safely alongside all notification states", () => {
  const row = source("src/components/notifications/notification-row.tsx")
  const page = source("src/app/notifications/page.tsx")

  assert.match(row, /category\?:\s*string/)
  assert.match(row, /type\?:\s*string/)
  assert.match(row, /notification\.category/)
  assert.match(row, /notification\.type/)
  assert.match(row, /startsWith\(["']\/\/["']\)/)
  assert.doesNotMatch(row, /dangerouslySetInnerHTML/)
  assert.match(page, /服务申请、审批处理与系统消息/)
})
