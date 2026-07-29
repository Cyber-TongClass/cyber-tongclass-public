import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const read = (path) => readFileSync(path, "utf8")

test("login and password recovery preserve a validated next destination", () => {
  const login = read("src/app/login/page.tsx")
  const forgot = read("src/app/forgot-password/page.tsx")
  const reset = read("src/app/reset-password/page.tsx")
  const requestRoute = read("src/app/api/request-verification/route.ts")

  assert.match(login, /isAuthenticated/)
  assert.match(login, /forgot-password\?next=/)
  assert.match(login, /safeLocalPath\(searchParams\.get\("next"\)/)
  assert.match(login, /<h1[^>]*>登录<\/h1>/)
  assert.match(forgot, /safeLocalPath/)
  assert.match(forgot, /next/)
  assert.match(reset, /safeLocalPath/)
  assert.match(reset, /login\?next=/)
  assert.match(requestRoute, /safeLocalPath/)
  assert.match(requestRoute, /searchParams\.set\("next"/)
})

test("personal profile destinations are resolved server-side and omitted when unavailable", () => {
  const directory = read("convex/instituteDirectory.ts")
  const api = read("src/lib/api.ts")
  const portal = read("src/components/portal/portal-client.tsx")
  const aiaNav = read("src/components/layout/aia-navbar.tsx")
  const tongNav = read("src/components/layout/tong-class-navbar.tsx")

  assert.match(directory, /export const getMyPublicProfileDestination/)
  assert.match(directory, /by_accountUserId/)
  assert.match(directory, /isClassMember === true/)
  assert.match(api, /useMyPublicProfileDestination/)
  for (const source of [portal, aiaNav, tongNav]) {
    assert.match(source, /useMyPublicProfileDestination/)
    assert.doesNotMatch(source, /`\/tong-class\/members\/\$\{currentUser\.(?:username|_id)/)
  }
})

test("Coffee Talk entries use the same verified-student eligibility rule as submission", () => {
  const entry = read("src/components/coffee-talk/coffee-talk-entry-list.tsx")
  const portal = read("src/components/portal/portal-client.tsx")

  for (const source of [entry, portal]) {
    assert.match(source, /isEmailVerified === true/)
    assert.match(source, /identityType === "undergrad"/)
    assert.match(source, /identityType === "graduate"/)
  }
})

test("detail pages use safe source-aware return links", () => {
  assert.ok(existsSync("src/components/navigation/safe-return-link.tsx"))
  const component = read("src/components/navigation/safe-return-link.tsx")
  assert.match(component, /safeLocalPath/)
  assert.match(component, /returnTo/)

  for (const file of [
    "src/app/notifications/page.tsx",
    "src/app/services/coffee-talk/apply/page.tsx",
    "src/app/services/coffee-talk/my/page.tsx",
    "src/app/services/coffee-talk/manage/page.tsx",
    "src/app/services/oa/submissions/[id]/page.tsx",
  ]) {
    assert.match(read(file), /SafeReturnLink/, `${file} must preserve the source destination`)
  }

  assert.match(read("src/components/institute/person-profile.tsx"), /withReturnTo/)
  assert.match(read("src/components/institute/research-group-profile.tsx"), /withReturnTo/)
  assert.match(read("src/components/notifications/notification-row.tsx"), /withReturnTo/)
})
