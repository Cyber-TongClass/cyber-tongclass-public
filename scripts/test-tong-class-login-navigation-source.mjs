import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("Tong Class navigation preserves every authenticated account action", () => {
  const source = readFileSync("src/components/layout/tong-class-navbar.tsx", "utf8")

  assert.match(source, /const\s+\{\s*currentUser,\s*isAuthenticated,\s*isAdmin,\s*logout\s*\}\s*=\s*useAuth\(\)/)
  assert.match(source, /const\s+currentUserPhoto\s*=\s*currentUser\?\.realPhoto\s*\|\|\s*currentUser\?\.avatar/)
  assert.match(source, /import\s+\{\s*NotificationBell\s*\}\s+from\s+["']@\/components\/notifications\/notification-bell["']/)
  assert.match(source, /const\s+notifications\s*=\s*useAiaNotifications\(\{\s*enabled:\s*isAuthenticated\s*\}\)/)
  assert.match(source, /<NotificationBell\s+unreadCount=\{unreadNotificationCount\}\s+href=\{withReturnTo\(["']\/notifications["'],\s*pathname\)\}\s+label=\{siteCopy\.common\.notifications\}/)
  assert.match(source, /isAuthenticated\s*&&\s*currentUser\s*\?/)
  assert.match(source, /profileDestination/)
  assert.match(source, /siteCopy\.common\.personalAcademic/)
  assert.match(source, /siteCopy\.common\.accountSettings/)
  assert.match(source, /isAdmin\s*&&/)
  assert.match(source, /siteCopy\.common\.adminConsole/)
  assert.match(source, /logout\(tongClassHomePath\(\)\)/)

  const copy = readFileSync("src/config/site-copy.ts", "utf8")
  for (const label of ["通知", "个人学术", "账户设置", "管理后台"]) {
    assert.ok(copy.includes(`"${label}"`), `siteCopy must keep the "${label}" label`)
  }
})
