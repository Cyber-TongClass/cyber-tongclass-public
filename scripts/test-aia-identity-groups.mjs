import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"
import { pathToFileURL } from "node:url"

const identityModuleUrl = pathToFileURL(
  path.resolve("convex/lib/userIdentity.ts"),
).href
const identity = await import(identityModuleUrl)

const usersSource = await readFile("convex/users.ts", "utf8")
const schemaSource = await readFile("convex/schema.ts", "utf8")

function mutationBlock(name) {
  const marker = `export const ${name} = mutation({`
  const start = usersSource.indexOf(marker)
  assert.notEqual(start, -1, `${name} mutation is present`)
  const next = usersSource.indexOf("export const ", start + marker.length)
  return usersSource.slice(start, next === -1 ? undefined : next)
}

test("identity resolution preserves explicit tags and safely resolves legacy roles", () => {
  assert.equal(identity.resolveUserIdentityType({ role: "member" }), "undergrad")
  assert.equal(identity.resolveUserIdentityType({ role: "admin" }), "other")
  assert.equal(identity.resolveUserIdentityType({ role: "super_admin" }), "other")
  assert.equal(
    identity.resolveUserIdentityType({ role: "member", identityType: "teacher" }),
    "teacher",
  )
  assert.equal(
    identity.resolveUserIdentityType({ role: "admin", identityType: "graduate" }),
    "graduate",
  )
  assert.equal(
    identity.resolveUserIdentityType({ role: "member", identityType: "not-a-group" }),
    "undergrad",
  )
})

test("only a super administrator can explicitly assign an identity tag", () => {
  assert.doesNotThrow(() => identity.assertCanAssignUserIdentityType("super_admin"))
  assert.throws(() => identity.assertCanAssignUserIdentityType("admin"), /超级管理员/)
  assert.throws(() => identity.assertCanAssignUserIdentityType("member"), /超级管理员/)
})

test("new member accounts receive a server-derived undergrad tag without inferring admin identities", () => {
  assert.equal(identity.getDefaultStoredIdentityType("member"), "undergrad")
  assert.equal(identity.getDefaultStoredIdentityType("admin"), undefined)
  assert.equal(identity.getDefaultStoredIdentityType("super_admin"), undefined)
})

test("identity tags are optional schema data and protected at account mutation boundaries", () => {
  assert.match(
    schemaSource,
    /identityType:\s*v\.optional\(v\.union\(\s*v\.literal\("undergrad"\),\s*v\.literal\("graduate"\),\s*v\.literal\("teacher"\),\s*v\.literal\("other"\),?\s*\)\)/s,
    "users schema permits the four optional AIA identity tags",
  )

  for (const name of ["create", "update"]) {
    const source = mutationBlock(name)
    assert.match(source, /identityType:\s*v\.optional\(/, `${name} accepts an optional identity tag`)
    assert.match(
      source,
      /assertCanAssignUserIdentityType\(/,
      `${name} requires server-side super-admin authorization for an explicit tag`,
    )
  }

  const create = mutationBlock("create")
  assert.match(
    create,
    /getDefaultStoredIdentityType\(requestedRole\)/,
    "create derives the member default on the server",
  )
})
