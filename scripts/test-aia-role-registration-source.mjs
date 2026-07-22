import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import test from "node:test"
import { fileURLToPath, pathToFileURL } from "node:url"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const roleModuleUrl = pathToFileURL(resolve(repositoryRoot, "src/lib/account-role.ts")).href
const roles = await import(roleModuleUrl)

function readSource(relativePath) {
  const absolutePath = resolve(repositoryRoot, relativePath)
  assert.ok(existsSync(absolutePath), `Expected ${relativePath} to exist`)
  return readFileSync(absolutePath, "utf8")
}

test("persistent member accounts keep their stored role while displaying as Undergrad", () => {
  assert.deepEqual(roles.accountRoleOptions, [
    { value: "member", label: "本科生（Undergrad）" },
    { value: "admin", label: "管理员" },
    { value: "super_admin", label: "超级管理员" },
  ])
  assert.equal(roles.getAccountRoleLabel("member"), "本科生（Undergrad）")
  assert.equal(roles.getAccountRoleLabel("admin"), "管理员")
  assert.equal(roles.getAccountRoleLabel("super_admin"), "超级管理员")
  assert.equal(roles.getAccountRoleLabel("unknown"), "未知角色")
})

test("admin user screens source their persisted role labels from the shared AIA role utility", () => {
  const listPage = readSource("src/app/admin/users/page.tsx")
  const editorPage = readSource("src/app/admin/users/[id]/page.tsx")

  assert.match(listPage, /accountRoleLabels/, "User list must use shared role labels")
  assert.doesNotMatch(listPage, /member:\s*["']成员["']/, "Member must not be displayed as the old role label")
  assert.match(editorPage, /accountRoleOptions/, "User editor must use shared role options")
  assert.doesNotMatch(editorPage, /value:\s*["']member["'],\s*label:\s*["']成员["']/, "Member must not be displayed as the old role label")
})

test("the public registration route stays closed and has no dormant self-registration client", () => {
  const page = readSource("src/app/register/page.tsx")

  assert.match(page, /公开注册已停用/)
  assert.match(page, /AIA/)
  assert.doesNotMatch(page, /RegisterClient|useSignUp|request-verification/)
  assert.equal(
    existsSync(resolve(repositoryRoot, "src/app/register/RegisterClient.tsx")),
    false,
    "The unused self-registration client must be removed so it cannot be reintroduced accidentally",
  )
})
