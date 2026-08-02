import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const schema = await readFile("convex/schema.ts", "utf8")
const backend = await readFile("convex/contentReview.ts", "utf8")
const permissionsUi = await readFile(
  "src/components/permissions/platform-permissions-client.tsx",
  "utf8",
)

test("platform permissions cover news, events, and reimbursement independently", () => {
  const permissionTable = schema.slice(
    schema.indexOf("contentPermissions: defineTable"),
    schema.indexOf("contentSubmissions: defineTable"),
  )
  for (const category of ["news", "events", "reimbursement"]) {
    assert.match(permissionTable, new RegExp(`v\\.literal\\("${category}"\\)`))
  }
  assert.match(permissionTable, /canCreate:\s*v\.boolean\(\)/)
  assert.match(permissionTable, /canManage:\s*v\.boolean\(\)/)
  assert.match(permissionTable, /\.index\("by_category_user",\s*\["category",\s*"userId"\]\)/)
})

test("content rights come strictly from the permission rows, including for super administrators", () => {
  const rights = backend.slice(
    backend.indexOf("function effectiveRights"),
    backend.indexOf("async function requireRights"),
  )
  assert.doesNotMatch(rights, /super_admin/)
  assert.match(rights, /permission\?\.canCreate\s*===\s*true/)
  assert.match(rights, /permission\?\.canManage\s*===\s*true/)
  assert.match(backend, /const categories:\s*PermissionCategory\[\]\s*=\s*\["news",\s*"events",\s*"reimbursement"\]/)
})

test("permissions UI explains that super administrators must also be listed explicitly", () => {
  assert.match(permissionsUi, /超级管理员如需参与也必须显式添加/)
  assert.doesNotMatch(permissionsUi, /超级管理员始终拥有全部有效权限/)
})

test("scope assignment is expanded and deduplicated on the server", () => {
  const endpoint = backend.slice(
    backend.indexOf("export const setPermissionsForScope"),
    backend.indexOf("export const removePermission"),
  )
  assert.match(endpoint, /assertActorCanUseScope/)
  assert.match(endpoint, /resolveOAWorkflowRecipients/)
  assert.match(endpoint, /new Map/)
  assert.match(endpoint, /授权范围不能为空/)
  assert.match(endpoint, /getPermission/)
  assert.match(backend, /withIndex\("by_category_user"/)
  assert.match(endpoint, /ctx\.db\.patch/)
  assert.match(endpoint, /ctx\.db\.insert/)
})

test("disabled accounts can neither receive nor retain newly assigned rights", () => {
  assert.match(backend, /accountStatus\s*===\s*"disabled"/)
  assert.match(backend, /账号不可用/)
})
