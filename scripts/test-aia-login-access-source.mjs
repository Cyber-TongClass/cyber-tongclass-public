import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("AIA navigation keeps an explicit login or account-switch entry", () => {
  const source = readFileSync("src/components/layout/aia-navbar.tsx", "utf8")

  assert.match(source, /from\s+["']@\/lib\/hooks\/use-auth["']/)
  assert.match(source, /const\s+\{\s*isAuthenticated\s*\}\s*=\s*useAuth\(\)/)
  assert.match(source, /const\s+loginHref\s*=\s*[\s\S]*?\/login\?next=/)
  assert.match(source, /href=\{loginHref\}/)
  assert.match(source, /isAuthenticated\s*\?\s*["']切换账号["']\s*:\s*["']登录["']/)
  assert.doesNotMatch(source, /sessionToken\s*\?\s*\(\s*<NotificationBell/)
})

test("Unified AIA notification polling can wait for authenticated AIA state", () => {
  const source = readFileSync("src/lib/api.ts", "utf8")

  assert.match(source, /export function useAiaNotifications\(options\?:\s*\{\s*enabled\?:\s*boolean\s*\}\)/)
  assert.match(source, /options\?\.enabled\s*===\s*false\s*\?\s*["']skip["']/)
})
