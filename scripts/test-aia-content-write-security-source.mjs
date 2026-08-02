import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const authorization = await readFile("convex/lib/contentAuthorization.ts", "utf8")
const news = await readFile("convex/news.ts", "utf8")
const events = await readFile("convex/events.ts", "utf8")

function mutationBody(source, exportName, nextExportName) {
  const start = source.indexOf(`export const ${exportName}`)
  const end = nextExportName
    ? source.indexOf(`export const ${nextExportName}`, start)
    : source.length
  assert.notEqual(start, -1, `${exportName} mutation must exist`)
  assert.notEqual(end, -1, `${nextExportName} export must exist`)
  return source.slice(start, end)
}

test("direct content creation is reserved for super administrators", () => {
  assert.match(
    authorization,
    /export function requireSuperAdminForDirectContentCreate/,
  )
  assert.match(
    authorization,
    /actor\.role\s*!==\s*"super_admin"/,
  )

  const newsCreate = mutationBody(news, "create", "update")
  const eventCreate = mutationBody(events, "create", "update")
  assert.match(newsCreate, /requireSuperAdminForDirectContentCreate/)
  assert.match(eventCreate, /requireSuperAdminForDirectContentCreate/)
  assert.doesNotMatch(newsCreate, /requireContentAdmin/)
  assert.doesNotMatch(eventCreate, /requireContentAdmin/)
})

test("published news writes require an explicit news manage grant", () => {
  assert.match(
    authorization,
    /export async function requireContentManager/,
  )
  const managerGuard = authorization.slice(
    authorization.indexOf("export async function requireContentManager"),
    authorization.indexOf("export function assertPublicationWriteAccess"),
  )
  assert.match(
    managerGuard,
    /\.query\("contentPermissions"\)/,
  )
  assert.match(
    managerGuard,
    /\.eq\("category",\s*category\)\.eq\("userId",\s*actor\._id\)/,
  )
  assert.match(managerGuard, /permission\?\.canManage\s*!==\s*true/)
  assert.doesNotMatch(managerGuard, /actor\.role\s*===\s*"super_admin"/)

  const update = mutationBody(news, "update", "remove")
  const remove = mutationBody(news, "remove", "count")
  assert.match(update, /requireContentManager\(ctx,\s*actor,\s*"news"\)/)
  assert.match(remove, /requireContentManager\(ctx,\s*actor,\s*"news"\)/)
})

test("event writes require an explicit events manage grant", () => {
  const update = mutationBody(events, "update", "remove")
  const remove = mutationBody(events, "remove", "count")
  assert.match(update, /requireContentManager\(ctx,\s*actor,\s*"events"\)/)
  assert.match(remove, /requireContentManager\(ctx,\s*actor,\s*"events"\)/)
})

test("read paths retain server-side scope filtering", () => {
  assert.match(news, /loadOAUserScopeContext/)
  assert.match(news, /userMatchesOAUserScope/)
  assert.match(events, /loadOAUserScopeContext/)
  assert.match(events, /userMatchesOAUserScope/)
})
