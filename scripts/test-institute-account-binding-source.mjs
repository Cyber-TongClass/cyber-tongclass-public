import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("convex/instituteDirectory.ts", "utf8")

function exportedFunctionBlock(name) {
  const marker = `export const ${name} =`
  const start = source.indexOf(marker)
  assert.notEqual(start, -1, `${name} must be exported`)
  const next = source.indexOf("export const ", start + marker.length)
  return source.slice(start, next === -1 ? undefined : next)
}

test("Institute account-binding administration requires an explicit super-admin session", () => {
  assert.match(source, /requireSuperAdminBySession/)

  for (const name of ["listAccountBindingCandidates", "bindPersonAccount"]) {
    const block = exportedFunctionBlock(name)
    assert.match(block, /sessionToken:\s*v\.string\(\)/, `${name} requires a session token`)
    assert.match(block, /requireSuperAdminBySession\(ctx,\s*args\.sessionToken\)/, `${name} derives authority from that session`)
  }
})

test("binding candidates expose only the minimum account and directory identity data", () => {
  const block = exportedFunctionBlock("listAccountBindingCandidates")

  assert.match(block, /slug:\s*person\.slug/)
  assert.match(block, /kind:\s*person\.kind/)
  assert.match(block, /accountUserId:\s*String\(person\.accountUserId\)/)
  assert.match(block, /id:\s*String\(user\._id\)/)
  assert.match(block, /username:\s*user\.username/)
  assert.doesNotMatch(block, /(?:email|studentId|passwordHash|salt|personalEmail)\s*:\s*user\./)
  assert.doesNotMatch(block, /(?:passwordHash|salt|sessionToken)\s*:\s*person\./)
})

test("binding uses an exact existing main-user ID and protects the one-account-to-one-person invariant", () => {
  const block = exportedFunctionBlock("bindPersonAccount")

  assert.match(block, /personSlug:\s*v\.string\(\)/)
  assert.match(block, /accountUserId:\s*v\.optional\(v\.id\(["']users["']\)\)/)
  assert.match(block, /withIndex\(["']by_slug["']/)
  assert.match(block, /ctx\.db\.get\(args\.accountUserId\)/)
  assert.match(block, /withIndex\(["']by_accountUserId["']/)
  assert.match(block, /String\(candidate\._id\)\s*!==\s*String\(person\._id\)/)
  assert.match(block, /args\.accountUserId\s*===\s*undefined/)
  assert.match(block, /accountUserId:\s*undefined/)
  assert.match(block, /ctx\.db\.patch\(person\._id,\s*\{/)
  assert.match(block, /accountUserId:\s*args\.accountUserId/)
  assert.doesNotMatch(block, /by_email|studentId|\.email|normalize.*email/i)
  assert.doesNotMatch(block, /person\.visibility/)
})
