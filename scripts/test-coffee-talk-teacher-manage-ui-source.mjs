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
  assert.match(client, /request_information/)
  assert.match(client, /note/)
  assert.doesNotMatch(client, /from\s+["'][^"']*convex[^"']*["']/i)
  // 账户派生资料契约（见 test-coffee-talk-profile-derived-details-source.mjs）：
  // 服务端仅向绑定教师下发 contact.email，客户端不得从 applicant 记录取邮箱。
  assert.match(client, /application\.contact\.email/)
  assert.doesNotMatch(client, /applicant\.email|applicantContact/)
})
