import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path) => readFileSync(path, "utf8")

test("profile destination queries wait for an authenticated user", () => {
  const api = read("src/lib/api.ts")
  const aiaNavbar = read("src/components/layout/aia-navbar.tsx")
  const tongClassNavbar = read("src/components/layout/tong-class-navbar.tsx")
  const portal = read("src/components/portal/portal-client.tsx")

  assert.match(api, /useMyPublicProfileDestination\(options\?:\s*\{\s*enabled\?:\s*boolean\s*\}\)/)
  assert.match(api, /options\?\.enabled\s*!==\s*false\s*&&\s*sessionToken/)
  assert.match(aiaNavbar, /useMyPublicProfileDestination\(\{\s*enabled:\s*isAuthenticated\s*\}\)/)
  assert.match(tongClassNavbar, /useMyPublicProfileDestination\(\{\s*enabled:\s*isAuthenticated\s*\}\)/)
  assert.match(portal, /useMyPublicProfileDestination\(\{\s*enabled:\s*isAuthenticated\s*\}\)/)
})
