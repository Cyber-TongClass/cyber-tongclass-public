import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import test from "node:test"

const require = createRequire(import.meta.url)
const config = require(resolve("next.config.js"))

const expectedRedirects = [
  ["/resources/courses/:path*", "/tong-class/courses/:path*"],
  ["/about/:path*", "/tong-class/about/:path*"],
  ["/members/:path*", "/tong-class/members/:path*"],
  ["/users", "/tong-class/members"],
  ["/users/:path*", "/tong-class/members/:path*"],
  ["/news/:path*", "/tong-class/news/:path*"],
  ["/publications/:path*", "/tong-class/publications/:path*"],
  ["/resources/:path*", "/tong-class/resources/:path*"],
  ["/courses/:path*", "/tong-class/courses/:path*"],
  ["/events/:path*", "/tong-class/events/:path*"],
  ["/intranet/:path*", "/tong-class/intranet/:path*"],
]

test("legacy Tong Class routes map once to their canonical temporary destinations", async () => {
  assert.equal(typeof config.redirects, "function", "next.config.js must declare redirects()")
  const redirects = await config.redirects()
  const actual = redirects.slice(0, expectedRedirects.length)

  assert.deepEqual(
    actual.map(({ source, destination, permanent }) => [source, destination, permanent]),
    expectedRedirects.map(([source, destination]) => [source, destination, false]),
  )

  for (const redirect of actual) {
    assert.doesNotMatch(redirect.destination, /\?/, "query parameters must be forwarded by Next.js")
    assert.match(redirect.destination, /^\/tong-class(?:\/|$)/)
  }
})

test("private product and API routes are never redirected into Tong Class", async () => {
  assert.equal(typeof config.redirects, "function", "next.config.js must declare redirects()")
  const redirects = await config.redirects()

  for (const protectedPrefix of ["/admin", "/reviewer", "/techday", "/api", "/account", "/login"]) {
    assert.equal(
      redirects.some(({ source }) => source === protectedPrefix || source.startsWith(`${protectedPrefix}/`)),
      false,
      `${protectedPrefix} must stay outside the legacy redirect set`,
    )
  }
})

test("the merged Tong Class forms list redirects into the unified OA workspace", async () => {
  const redirects = await config.redirects()
  const merged = redirects.find(({ source }) => source === "/tong-class/intranet/forms")

  assert.ok(merged, "next.config.js must redirect /tong-class/intranet/forms")
  assert.equal(merged.destination, "/services/oa")
  assert.equal(merged.permanent, false, "the OA merge redirect stays temporary (307)")
  assert.ok(
    redirects.indexOf(merged) >= expectedRedirects.length,
    "the OA merge redirect must not disturb the pinned legacy redirect order",
  )

  const fallback = await import("node:fs").then(({ readFileSync }) =>
    readFileSync("src/app/tong-class/intranet/forms/page.tsx", "utf8"),
  )
  assert.match(fallback, /redirect\(["']\/services\/oa["']\)/)
})
