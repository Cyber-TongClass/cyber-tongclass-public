import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("Tong Class navigation preserves every authenticated account action", () => {
  const source = readFileSync("src/components/layout/tong-class-navbar.tsx", "utf8")

  assert.match(source, /const\s+\{\s*currentUser,\s*isAuthenticated,\s*isAdmin,\s*logout\s*\}\s*=\s*useAuth\(\)/)
  assert.match(source, /const\s+currentUserPhoto\s*=\s*currentUser\?\.realPhoto\s*\|\|\s*currentUser\?\.avatar/)
  assert.match(source, /import\s+\{\s*NotificationBell\s*\}\s+from\s+["']@\/components\/notifications\/notification-bell["']/)
  assert.match(source, /const\s+notifications\s*=\s*useAiaNotifications\(\{\s*enabled:\s*isAuthenticated\s*\}\)/)
  assert.match(source, /<NotificationBell\s+unreadCount=\{unreadNotificationCount\}\s+href=\{withReturnTo\(["']\/notifications["'],\s*pathname\)\}\s+label="通知"/)
  assert.match(source, /isAuthenticated\s*&&\s*currentUser\s*\?/)
  assert.match(source, /profileDestination/)
  assert.match(source, /个人学术/)
  assert.match(source, /账户设置/)
  assert.match(source, /isAdmin\s*&&/)
  assert.match(source, /管理后台/)
  assert.match(source, /logout\(tongClassHomePath\(\)\)/)
})
