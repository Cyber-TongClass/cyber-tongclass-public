import assert from "node:assert/strict"
import fs from "node:fs"

const navbar = fs.readFileSync("src/components/layout/aia-navbar.tsx", "utf8")

assert.match(
  navbar,
  /const\s+\{\s*currentUser,\s*isAuthenticated,\s*isLoading,\s*isAdmin,\s*logout\s*\}\s*=\s*useAuth\(\)/
)

const guardedLoginBranches = navbar.match(
  /\)\s*:\s*!isLoading\s*&&\s*showLoginAction\s*\?\s*\(/g
) ?? []

assert.equal(
  guardedLoginBranches.length,
  2,
  "desktop and mobile login actions must both wait for auth loading to finish"
)

console.log("AIA navbar auth-loading login guard contract passed")
