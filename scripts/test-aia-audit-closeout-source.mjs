import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const read = (path) => readFileSync(path, "utf8")

test("Tong Class membership is enforced in the UI and course backend", () => {
  const guard = read("src/components/auth/member-only-guard.tsx")
  const authorization = read("convex/lib/contentAuthorization.ts")
  const courses = read("convex/courses.ts")
  const reviews = read("convex/courseReviews.ts")

  assert.match(guard, /currentUser/)
  assert.match(guard, /canAccessMemberArea/)
  assert.match(authorization, /requireTongClassMember/)
  assert.match(courses, /requireTongClassMember/)
  assert.match(reviews, /requireTongClassMember/)
})

test("private and account routes declare noindex metadata", () => {
  for (const path of [
    "src/app/login/layout.tsx",
    "src/app/forgot-password/layout.tsx",
    "src/app/reset-password/layout.tsx",
    "src/app/notifications/layout.tsx",
    "src/app/settings/layout.tsx",
    "src/app/tong-class/intranet/layout.tsx",
    "src/app/portal/layout.tsx",
  ]) {
    assert.ok(existsSync(path), `${path} must exist`)
    assert.match(read(path), /index:\s*false/)
    assert.match(read(path), /follow:\s*false/)
  }
})

test("public discovery pages have titles, contact actions, and discoverable search", () => {
  assert.match(read("src/app/people/page.tsx"), /title:\s*"人员目录"/)
  assert.match(read("src/app/groups/page.tsx"), /title:\s*"研究团队"/)
  assert.match(read("src/app/contact/page.tsx"), /mailto:aipku@pku\.edu\.cn/)
  assert.match(read("src/app/contact/page.tsx"), /tel:\+861062755373/)
  const footer = read("src/components/layout/aia-footer.tsx")
  assert.match(footer, /siteCopy\.footer\.platformLinks/)
  assert.match(read("src/config/site-copy.ts"), /href:\s*"\/contact"/)
  assert.match(read("src/components/layout/aia-navbar.tsx"), /href="\/search"/)
  assert.match(read("src/components/layout/tong-class-navbar.tsx"), /href="\/search"/)
  assert.match(read("src/app/search/page.tsx"), /htmlFor="site-search-input"/)
})

test("Coffee Talk validates lengths before submit and uses an accessible note dialog", () => {
  const form = read("src/components/coffee-talk/coffee-talk-application-form.tsx")
  const mine = read("src/components/coffee-talk/coffee-talk-my-client.tsx")
  const teacher = read("src/components/coffee-talk/coffee-talk-teacher-manage-client.tsx")

  for (const limit of ["240", "2000", "4000"]) {
    assert.ok(form.includes(`maxLength={${limit}}`), `expected maxLength ${limit}`)
  }
  assert.match(form, /aria-describedby="coffee-talk-topic-hint"/)
  assert.match(form, /CharacterCount value=\{draft\.topic\}/)
  assert.doesNotMatch(mine, /window\.prompt/)
  assert.doesNotMatch(teacher, /window\.prompt/)
  assert.match(mine, /DialogContent/)
  assert.match(teacher, /DialogContent/)
})

test("critical domains have local recovery boundaries and MathJax is route-scoped", () => {
  for (const path of [
    "src/app/people/error.tsx",
    "src/app/groups/error.tsx",
    "src/app/portal/error.tsx",
    "src/app/services/coffee-talk/error.tsx",
    "src/app/services/oa/error.tsx",
  ]) {
    assert.ok(existsSync(path), `${path} must exist`)
    assert.match(read(path), /reset/)
  }
  const rootLayout = read("src/app/layout.tsx")
  const globals = read("src/styles/globals.css")
  assert.doesNotMatch(rootLayout, /MathJax/)
  assert.doesNotMatch(rootLayout, /next\/script/)
  assert.doesNotMatch(rootLayout, /next\/font\/google/)
  assert.doesNotMatch(rootLayout, /@fontsource\//)
  for (const [family, asset] of [
    ["Alibaba PuHuiTi 3", "alibaba-puhuiti-regular.woff2"],
    ["FZ DaBiaoSong", "fz-dabiaosong.woff2"],
    ["Geist Mono", "geist-mono.woff2"],
  ]) {
    assert.match(globals, new RegExp(`font-family:\\s*"${family.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}"`))
    assert.ok(globals.includes(`/fonts/aia/${asset}`), `${asset} must be referenced by global CSS`)
    assert.ok(existsSync(`public/fonts/aia/${asset}`), `${asset} must be bundled locally`)
  }
  assert.match(read("src/components/markdown/markdown-renderer.tsx"), /rehypeKatex/)
})

test("portal redirect preserves safe query context and standalone docs match deployment", () => {
  const portal = read("src/app/portal/page.tsx")
  assert.match(portal, /searchParams/)
  assert.match(portal, /URLSearchParams/)
  assert.match(portal, /redirect\(`\/portal\/list/)

  const readme = read("README.md")
  const agents = read("AGENTS.md")
  const standalone = read("scripts/start-standalone.mjs")
  assert.match(standalone, /\.next\/standalone\/server\.js/)
  assert.match(standalone, /\.next\/static/)
  assert.match(standalone, /\bpublic\b/)
  assert.match(readme, /node scripts\/start-standalone\.mjs/)
  assert.match(agents, /node scripts\/start-standalone\.mjs/)
})
