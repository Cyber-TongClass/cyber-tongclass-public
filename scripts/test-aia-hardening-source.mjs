import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const read = (file) => fs.readFileSync(file, "utf8")

test("shared content writes require a main-site session and administrator", () => {
  for (const file of ["convex/news.ts", "convex/events.ts", "convex/courses.ts"]) {
    const source = read(file)
    assert.match(source, /getUserBySession/)
    assert.match(source, /sessionToken:\s*v\.string\(\)/)
    assert.match(source, /requireContentAdmin/)
  }

  const publications = read("convex/publications.ts")
  assert.match(publications, /getUserBySession/)
  assert.match(publications, /sessionToken:\s*v\.string\(\)/)
  assert.match(publications, /assertPublicationWriteAccess/)
})

test("draft news and audience-restricted event details are not public", () => {
  const news = read("convex/news.ts")
  assert.match(news, /export const listAll[\s\S]*sessionToken:\s*v\.string\(\)/)
  assert.match(news, /export const getById[\s\S]*isPublished/)

  const events = read("convex/events.ts")
  assert.match(events, /export const getById[\s\S]*sessionToken:\s*v\.optional\(v\.string\(\)\)/)
  assert.match(events, /canViewEvent/)
  assert.match(events, /export const adminList/)

  const eventLayout = read("src/app/tong-class/events/layout.tsx")
  assert.doesNotMatch(eventLayout, /MemberOnlyGuard/)
})

test("account status is enforced by login and the shared session resolver", () => {
  const schema = read("convex/schema.ts")
  const users = read("convex/users.ts")
  const session = read("convex/reviewer/lib.ts")

  assert.match(schema, /accountStatus:\s*v\.optional\(v\.union\(\s*v\.literal\("active"\),\s*v\.literal\("disabled"\)/)
  assert.match(users, /user\.accountStatus === "disabled"/)
  assert.match(session, /user\.accountStatus === "disabled"/)
  assert.match(users, /不能停用最后一个超级管理员/)
  assert.match(users, /accountStatus:\s*"disabled"/)
  assert.match(users, /revokedAt:\s*now/)
})

test("password credentials use versioned PBKDF2 and upgrade legacy hashes after login", () => {
  const schema = read("convex/schema.ts")
  const users = read("convex/users.ts")

  assert.match(schema, /passwordAlgorithm:\s*v\.optional\(v\.literal\("pbkdf2-sha256"\)\)/)
  assert.match(schema, /passwordIterations:\s*v\.optional\(v\.number\(\)\)/)
  assert.match(users, /PBKDF2/)
  assert.match(users, /PASSWORD_ITERATIONS/)
  assert.match(users, /passwordAlgorithm:\s*"pbkdf2-sha256"/)
  assert.match(users, /credential\.passwordAlgorithm !== "pbkdf2-sha256"/)
})

test("login next paths reject protocol-relative and backslash paths", () => {
  const login = read("src/app/login/page.tsx")
  assert.match(login, /safeLocalPath/)
  assert.doesNotMatch(login, /nextPath\?\.startsWith\("\/"\)/)
})

test("root metadata does not force all pages to canonicalize to the homepage", () => {
  const layout = read("src/app/layout.tsx")
  assert.doesNotMatch(layout, /alternates:\s*\{\s*canonical:\s*"\/"/)

  const coffeeTalk = read("src/app/services/coffee-talk/page.tsx")
  assert.doesNotMatch(coffeeTalk, /robots:\s*\{\s*index:\s*false/)
  assert.match(coffeeTalk, /canonical:\s*"\/services\/coffee-talk"/)
})

test("public Tong Class directory requires explicit membership opt-in for every filter", () => {
  const users = read("convex/users.ts")
  assert.match(users, /isClassMember === true/)
  assert.doesNotMatch(users, /user\.isClassMember !== false/)
  assert.doesNotMatch(users, /args\.identityType \? users\.filter\(\(user\) => user\.identityType/)
})

test("password recovery only delivers to known accounts and consumes a verified reset once", () => {
  const verification = read("convex/emailVerifications.ts")
  const requestRoute = read("src/app/api/request-verification/route.ts")
  const resetRoute = read("src/app/api/reset-password/route.ts")
  const users = read("convex/users.ts")

  assert.match(verification, /deliverable:\s*Boolean\(user\)/)
  assert.match(requestRoute, /deliverable\) \{\s*await sendVerificationEmail/)
  assert.match(resetRoute, /sha256Hex/)
  assert.match(users, /export const resetPasswordWithToken = mutation/)
  assert.match(users, /resetCompletedAt/)
  assert.match(users, /revokedAt:\s*now/)
})
