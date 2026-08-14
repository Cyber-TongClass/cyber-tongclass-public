import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const authorization = await readFile("convex/lib/oaScopeAuthorization.ts", "utf8")
const directory = await readFile("convex/instituteDirectory.ts", "utf8")
const picker = await readFile("src/components/oa/oa-scope-picker.tsx", "utf8")
const permissions = await readFile("convex/contentReview.ts", "utf8")

test("research-group scope labels consistently use the teacher-group product name", () => {
  assert.match(authorization, /function researchGroupScopeLabel/)
  assert.match(authorization, /老师的课题组/)
  assert.match(directory, /teacherLedResearchGroups/)
})

test("selected server-backed scope values retain human-readable labels", () => {
  assert.match(picker, /allOptions/)
  assert.match(picker, /labelCache\.current\.set/)
})

test("permission mutations do not persist empty permission rows", () => {
  const direct = permissions.slice(
    permissions.indexOf("export const setPermission"),
    permissions.indexOf("export const setPermissionsForScope"),
  )
  const scoped = permissions.slice(
    permissions.indexOf("export const setPermissionsForScope"),
    permissions.indexOf("export const removePermission"),
  )
  assert.match(direct, /!args\.canCreate\s*&&\s*!canReview\s*&&\s*!args\.canManage[\s\S]*?ctx\.db\.delete/)
  assert.match(scoped, /!args\.canCreate\s*&&\s*!canReview\s*&&\s*!args\.canManage[\s\S]*?ctx\.db\.delete/)
})
