import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

function source(path) {
  assert.ok(existsSync(path), `Expected ${path} to exist`)
  return readFileSync(path, "utf8")
}

test("AIA people and group directory routes render only safe live public projections", () => {
  const peoplePage = source("src/app/people/page.tsx")
  const personPage = source("src/app/people/[slug]/page.tsx")
  const groupsPage = source("src/app/groups/page.tsx")
  const groupPage = source("src/app/groups/[slug]/page.tsx")

  for (const [page, component] of [
    [peoplePage, "LivePeopleDirectory"],
    [personPage, "LivePersonProfile"],
    [groupsPage, "LiveResearchGroupDirectory"],
    [groupPage, "LiveResearchGroupProfile"],
  ]) {
    assert.match(page, new RegExp(component))
    assert.doesNotMatch(page, /demoPeople|demoResearchGroups|from\s+["'][^"']*convex[^"']*["']/i)
  }
})

test("live directory clients use canonical hooks, disclose demo fallbacks, and keep private fields out", () => {
  const clients = [
    ["src/components/institute/live-people-directory.tsx", "usePublicInstitutePeople", "people"],
    ["src/components/institute/live-person-profile.tsx", "usePublicInstitutePerson", "person"],
    ["src/components/institute/live-research-group-directory.tsx", "usePublicResearchGroups", "groups"],
    ["src/components/institute/live-research-group-profile.tsx", "usePublicResearchGroup", "group"],
  ]

  for (const [path, hook, valueName] of clients) {
    const client = source(path)
    assert.match(client, /^"use client"/)
    assert.match(client, new RegExp(hook))
    assert.doesNotMatch(client, /from\s+["'][^"']*convex[^"']*["']/i)
    assert.doesNotMatch(client, /accountUserId|studentId|publicEmail/i)
    assert.match(client, new RegExp(`${valueName}\\s*===\\s*undefined`))
  }

  const people = source("src/components/institute/live-people-directory.tsx")
  const groups = source("src/components/institute/live-research-group-directory.tsx")
  const person = source("src/components/institute/live-person-profile.tsx")
  const group = source("src/components/institute/live-research-group-profile.tsx")

  assert.match(people, /people\.length\s*===\s*0/)
  assert.match(groups, /groups\.length\s*===\s*0/)
  assert.match(people, /演示数据/)
  assert.match(groups, /演示数据/)
  assert.match(person, /未找到公开人员资料/)
  assert.match(group, /未找到公开团队资料/)
})
