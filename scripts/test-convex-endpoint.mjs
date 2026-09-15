import assert from "node:assert/strict"
import { DEFAULT_AIA_CONVEX_URL, resolveAiaConvexUrl } from "../src/lib/convex-endpoint.ts"

assert.equal(resolveAiaConvexUrl(undefined), DEFAULT_AIA_CONVEX_URL)
assert.equal(resolveAiaConvexUrl("   "), DEFAULT_AIA_CONVEX_URL)
assert.equal(
  resolveAiaConvexUrl(" https://convex.example.test/convex "),
  "https://convex.example.test/convex",
)

assert.throws(
  () => resolveAiaConvexUrl("http://convex.example.test/convex"),
  /HTTPS URL/,
)
assert.throws(
  () => resolveAiaConvexUrl("https://convex.example.test/convex?deployment=stale"),
  /query or hash/,
)
assert.throws(
  () => resolveAiaConvexUrl("https://convex.example.test"),
  /path \/convex/,
)

console.log("convex endpoint contract passed")
