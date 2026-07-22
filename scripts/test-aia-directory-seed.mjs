import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import {
  classifyDemoUpsert,
  getAiaDemoDirectorySeed,
} from "../convex/lib/aiaDemoSeed.ts"

test("a matching demo slug is updated but a non-demo collision is rejected", () => {
  assert.equal(classifyDemoUpsert(null, "aia-demo-professor-lin"), "create")
  assert.equal(
    classifyDemoUpsert({ slug: "aia-demo-professor-lin", isDemo: true }, "aia-demo-professor-lin"),
    "update",
  )
  assert.throws(
    () => classifyDemoUpsert({ slug: "faculty", isDemo: false }, "faculty"),
    /AIA_DEMO_SLUG_CONFLICT/,
  )
})

test("the fixed seed contains only clearly marked demo directory records with no account or contact data", () => {
  const seed = getAiaDemoDirectorySeed()

  assert.ok(seed.people.length >= 2)
  assert.ok(seed.groups.length >= 1)
  assert.ok(seed.memberships.length >= 2)

  for (const person of seed.people) {
    assert.match(person.slug, /^aia-demo-/)
    assert.equal(person.isDemo, true)
    assert.equal(person.visibility, "public")
    assert.equal("accountUserId" in person, false)
    assert.equal("publicEmail" in person, false)
  }

  for (const group of seed.groups) {
    assert.match(group.slug, /^aia-demo-/)
    assert.equal(group.isDemo, true)
    assert.equal(group.visibility, "public")
  }
})

test("membership natural keys are stable and only point at demo slugs", () => {
  const seed = getAiaDemoDirectorySeed()
  const personSlugs = new Set(seed.people.map((person) => person.slug))
  const groupSlugs = new Set(seed.groups.map((group) => group.slug))
  const naturalKeys = new Set()

  for (const membership of seed.memberships) {
    assert.match(membership.naturalKey, /^aia-demo-membership:/)
    assert.ok(personSlugs.has(membership.personSlug))
    assert.ok(groupSlugs.has(membership.groupSlug))
    assert.equal(membership.visibility, "public")
    assert.equal(naturalKeys.has(membership.naturalKey), false)
    naturalKeys.add(membership.naturalKey)
  }
})

test("the manual seed endpoint requires a server-derived super-admin session", async () => {
  const source = await readFile(new URL("../convex/aiaDemoSeed.ts", import.meta.url), "utf8")

  assert.match(source, /import\s*{\s*mutation\s*}\s*from\s*["']\.\/\_generated\/server["']/)
  assert.match(source, /requireSuperAdminBySession\(ctx,\s*args\.sessionToken\)/)
  assert.match(source, /export const seedDirectory = mutation\(/)
  assert.doesNotMatch(source, /getUserBySession\(ctx,\s*args\.sessionToken\)/)
  assert.doesNotMatch(source, /export const seedDirectory = query\(/)
})
