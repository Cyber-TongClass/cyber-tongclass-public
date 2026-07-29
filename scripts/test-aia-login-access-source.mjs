import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("AIA navigation renders the authenticated account avatar instead of an account-switch link", () => {
  const source = readFileSync("src/components/layout/aia-navbar.tsx", "utf8")

  assert.match(source, /from\s+["']@\/lib\/hooks\/use-auth["']/)
  assert.match(source, /const\s+\{\s*currentUser,\s*isAuthenticated,\s*isAdmin,\s*logout\s*\}\s*=\s*useAuth\(\)/)
  assert.match(source, /const\s+loginHref\s*=\s*[\s\S]*?\/login\?next=/)
  assert.match(source, /const\s+currentUserPhoto\s*=\s*currentUser\?\.realPhoto\s*\|\|\s*currentUser\?\.avatar/)
  assert.match(source, /isAuthenticated\s*&&\s*currentUser\s*\?/)
  assert.match(source, /DropdownMenu/)
  assert.doesNotMatch(source, /切换账号/)
  assert.doesNotMatch(source, /sessionToken\s*\?\s*\(\s*<NotificationBell/)
})

test("Unified AIA notification polling can wait for authenticated AIA state", () => {
  const source = readFileSync("src/lib/api.ts", "utf8")

  assert.match(source, /export function useAiaNotifications\(options\?:\s*\{\s*enabled\?:\s*boolean;\s*limit\?:\s*number\s*\}\)/)
  assert.match(source, /options\?\.enabled\s*===\s*false\s*\?\s*["']skip["']/)
})
