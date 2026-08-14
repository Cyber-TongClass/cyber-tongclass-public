import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("organization management skips its privileged query for non-super-admins", () => {
  const page = readFileSync("src/app/organization/manage/page.tsx", "utf8")
  const api = readFileSync("src/lib/api.ts", "utf8")

  assert.match(page, /useUserGroups\(isSuperAdmin\)/)
  assert.match(page, /authLoading \|\| \(isSuperAdmin && data === undefined\)/)
  assert.match(api, /export function useUserGroups\(enabled = true\)/)
  assert.match(api, /enabled && sessionToken/)
})
