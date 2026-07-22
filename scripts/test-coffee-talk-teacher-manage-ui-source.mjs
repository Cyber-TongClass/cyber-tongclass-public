import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const source = (path) => {
  assert.ok(existsSync(path), `Expected ${path} to exist`)
  return readFileSync(path, "utf8")
}

test("teacher Coffee Talk management is session-aware and only invokes server-provided teacher actions", () => {
  const page = source("src/app/services/coffee-talk/manage/page.tsx")
  const client = source("src/components/coffee-talk/coffee-talk-teacher-manage-client.tsx")

  assert.match(page, /CoffeeTalkTeacherManageClient/)
  assert.match(page, /教师处理台/)

  assert.match(client, /useTongClassSessionToken/)
  assert.match(client, /useTeacherCoffeeTalkApplications/)
  assert.match(client, /useActOnCoffeeTalkApplication/)
  assert.match(client, /CoffeeTalkApplicationList/)
  assert.match(client, /expectedVersion/)
  assert.match(client, /login\?next=%2Fservices%2Fcoffee-talk%2Fmanage/)
  assert.match(client, /start_review/)
  assert.match(client, /accept/)
  assert.match(client, /decline/)
  assert.match(client, /complete/)
  assert.doesNotMatch(client, /request_information/)
  assert.doesNotMatch(client, /from\s+["'][^"']*convex[^"']*["']/i)
  assert.doesNotMatch(client, /\.email\b/)
})
