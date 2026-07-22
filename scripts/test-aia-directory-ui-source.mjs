import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const componentFiles = [
  "src/components/institute/people-directory.tsx",
  "src/components/institute/person-profile.tsx",
  "src/components/institute/research-group-directory.tsx",
  "src/components/institute/research-group-profile.tsx",
  "src/components/institute/research-output-list.tsx",
]

const pageFiles = [
  "src/app/people/page.tsx",
  "src/app/people/[slug]/page.tsx",
  "src/app/groups/page.tsx",
  "src/app/groups/[slug]/page.tsx",
]

function source(path) {
  return readFileSync(path, "utf8")
}

test("AIA public directory UI is present and never imports raw Convex clients", () => {
  for (const path of [...componentFiles, ...pageFiles]) {
    assert.equal(existsSync(path), true, `${path} should exist`)
    assert.doesNotMatch(source(path), /convex\/_generated\/api|from ["']convex\/react["']/)
  }
})

test("directory cards label demos and use only injected public data", () => {
  const people = source("src/components/institute/people-directory.tsx")
  const groups = source("src/components/institute/research-group-directory.tsx")

  assert.match(people, /people:\s*(?:readonly\s+)?PublicDirectoryPerson\[\]/)
  assert.match(groups, /groups:\s*(?:readonly\s+)?PublicResearchGroup\[\]/)
  assert.match(people, /演示数据/)
  assert.match(groups, /演示数据/)
  assert.match(people, /visibility\s*===\s*["']public["']/)
  assert.match(groups, /visibility\s*===\s*["']public["']/)
})

test("person profile gates Coffee Talk by public teacher flag without an id-bearing URL", () => {
  const profile = source("src/components/institute/person-profile.tsx")

  assert.match(profile, /person\.kind\s*===\s*["']teacher["']\s*&&\s*person\.coffeeTalkOpen/)
  assert.match(profile, /href=["']\/services\/coffee-talk["']/)
  assert.doesNotMatch(profile, /teacherId|teacher_id|targetTeacher|accountUserId/)
})

test("demo fixture is explicitly labeled and contains no contact or account-identifying fields", () => {
  const demo = source("src/components/institute/demo-directory-data.ts")
  const alphaStart = demo.indexOf('slug: "demo-professor-alpha"')
  const alphaEnd = demo.indexOf("  },", alphaStart)
  const alpha = demo.slice(alphaStart, alphaEnd)

  assert.match(demo, /isDemo:\s*true/)
  assert.notEqual(alphaStart, -1)
  assert.notEqual(alphaEnd, -1)
  assert.match(alpha, /coffeeTalkOpen:\s*false/)
  assert.doesNotMatch(demo, /\b(?:studentId|email|phone|mobile|accountUserId|password|session)\b/i)
})
