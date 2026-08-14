import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const layout = readFileSync("src/app/admin/layout.tsx", "utf8")
const eventsPage = readFileSync("src/app/admin/events/page.tsx", "utf8")
const dashboard = readFileSync("src/app/admin/page.tsx", "utf8")

test("regular admin navigation only exposes capability-gated content managers", () => {
  assert.match(layout, /useMyContentPermissions\(\)/)
  assert.match(layout, /contentPermissions\?\.news\.canManage[\s\S]*?"\/admin\/news"/)
  assert.match(layout, /contentPermissions\?\.events\.canManage[\s\S]*?"\/admin\/events"/)
  assert.doesNotMatch(
    layout,
    /const adminAllowedPrefixes\s*=\s*\["\/admin\/news",\s*"\/admin\/events"/,
  )
  assert.match(layout, /const contentManagerNavItems\s*=\s*navItems\.filter/)
  assert.match(layout, /isSuperAdmin\s*\?\s*contentManagerNavItems/)
  assert.match(layout, /isSuperAdmin\s*&&\s*hasCapabilityGatedRouteAccess/)
  assert.doesNotMatch(layout, /isSuperAdmin\s*\?\s*navItems\b/)
  assert.match(layout, /未获授权管理此内容模块/)
})

test("event administration never runs its privileged query without manage access", () => {
  assert.match(eventsPage, /useMyContentPermissions\(\)/)
  assert.match(
    eventsPage,
    /useAdminEvents\(\{\s*disabled:\s*permissions\?\.events\.canManage\s*!==\s*true\s*\}\)/,
  )
  assert.match(eventsPage, /没有活动管理权限/)
})

test("admin dashboard only shows content-manager shortcuts backed by capabilities", () => {
  assert.match(dashboard, /permissions\?\.news\.canManage[\s\S]*?href:\s*"\/admin\/news"/)
  assert.match(dashboard, /permissions\?\.events\.canManage[\s\S]*?href:\s*"\/admin\/events"/)
})
