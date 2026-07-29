import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const users = await readFile("convex/users.ts", "utf8")
const directory = await readFile("convex/instituteDirectory.ts", "utf8")
const coffeeTalk = await readFile("convex/coffeeTalk.ts", "utf8")
const api = await readFile("src/lib/api.ts", "utf8")
const settings = await readFile("src/app/settings/page.tsx", "utf8")
const bindingsPage = await readFile("src/app/admin/institute/bindings/page.tsx", "utf8")

function mutationBlock(source, name) {
  const marker = `export const ${name} = mutation({`
  const start = source.indexOf(marker)
  assert.notEqual(start, -1, `${name} mutation is present`)
  const next = source.indexOf("export const ", start + marker.length)
  return source.slice(start, next === -1 ? undefined : next)
}

test("teacher accounts automatically receive an open, explicitly bound Coffee Talk directory profile", () => {
  const create = mutationBlock(users, "create")
  const update = mutationBlock(users, "update")

  assert.match(users, /import\s+\{\s*ensureTeacherGroupManagement\s*\}\s+from\s+["']\.\/instituteDirectory["']/)
  assert.match(directory, /export async function ensureTeacherCoffeeTalkProfile/)
  assert.match(directory, /coffeeTalkOpen:\s*true/)
  assert.match(directory, /accountUserId:\s*input\.userId/)
  assert.match(create, /storedIdentityType === "teacher"/)
  assert.match(create, /ensureTeacherGroupManagement\(ctx,\s*\{[\s\S]*?userId[\s\S]*?user:[\s\S]*?now[\s\S]*?\}\)/)
  assert.match(update, /const nextIdentityType = requestedIdentityType \?\? user\.identityType/)
  assert.match(update, /nextIdentityType === "teacher"/)
  assert.match(update, /ensureTeacherGroupManagement\(ctx,\s*\{[\s\S]*?userId:\s*id[\s\S]*?now[\s\S]*?\}\)/)
})

test("a super administrator can idempotently backfill existing teacher accounts", () => {
  assert.match(directory, /export const syncExistingTeacherCoffeeTalkProfiles = mutationGeneric/)
  assert.match(directory, /sessionToken:\s*v\.string\(\)/)
  assert.match(directory, /requireSuperAdminBySession\(ctx,\s*args\.sessionToken\)/)
  assert.match(directory, /user\.identityType !== "teacher"/)
  assert.match(directory, /ensureTeacherGroupManagement\(ctx,\s*\{[\s\S]*?userId:\s*user\._id[\s\S]*?\}\)/)
})

test("teachers and super administrators can explicitly close or reopen Coffee Talk availability", () => {
  assert.match(coffeeTalk, /export const getMyTeacherAvailability = query/)
  assert.match(coffeeTalk, /export const setTeacherAvailability = mutation/)
  assert.match(coffeeTalk, /teacherSlug:\s*v\.optional\(v\.string\(\)\)/)
  assert.match(coffeeTalk, /actor\.role === "super_admin"/)
  assert.match(coffeeTalk, /actor\.identityType !== "teacher"/)
  assert.match(coffeeTalk, /coffeeTalkOpen:\s*args\.open/)
  assert.match(api, /export function useMyCoffeeTalkTeacherAvailability\(/)
  assert.match(api, /export function useSetCoffeeTalkTeacherAvailability\(/)
  assert.match(api, /export function useSyncExistingTeacherCoffeeTalkProfiles\(/)
  assert.match(settings, /currentUser\.identityType === "teacher"/)
  assert.match(settings, /useMyCoffeeTalkTeacherAvailability/)
  assert.match(settings, /useSetCoffeeTalkTeacherAvailability/)
  assert.match(settings, /Coffee Talk 申请/)
  assert.match(directory, /coffeeTalkOpen:\s*person\.coffeeTalkOpen/)
  assert.match(bindingsPage, /useSetCoffeeTalkTeacherAvailability/)
  assert.match(bindingsPage, /Coffee Talk 开放状态/)
  assert.match(bindingsPage, /同步已有教师资源/)
})
