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

test("persistent authorization roles use the shared plain-user labels", () => {
  assert.deepEqual(roles.accountRoleOptions, [
    { value: "member", label: "普通用户" },
    { value: "admin", label: "管理员" },
    { value: "super_admin", label: "超级管理员" },
  ])
  assert.equal(roles.getAccountRoleLabel("member"), "普通用户")
  assert.equal(roles.getAccountRoleLabel("admin"), "管理员")
  assert.equal(roles.getAccountRoleLabel("super_admin"), "超级管理员")
  assert.equal(roles.getAccountRoleLabel("unknown"), "未知角色")
})

test("identity-group labels remain separate from authorization-role labels", () => {
  assert.equal(roles.accountIdentityTypeLabels.undergrad, "本科生（Undergrad）")
  assert.equal(roles.accountIdentityTypeLabels.graduate, "研究生（Graduate）")
  assert.equal(roles.accountIdentityTypeLabels.teacher, "教师（Teacher）")
  assert.equal(roles.accountIdentityTypeLabels.other, "其他（Other）")
  assert.deepEqual(roles.accountIdentityTypeOptions, [
    { value: "undergrad", label: "本科生" },
    { value: "graduate", label: "研究生" },
    { value: "teacher", label: "教师" },
    { value: "other", label: "其他成员资格组" },
  ])
})

test("every authorization-role editor sources labels from the shared role utility", () => {
  const createPage = readSource("src/app/admin/users/new/page.tsx")
  const editorPage = readSource("src/app/admin/users/[id]/page.tsx")
  const settingsPage = readSource("src/app/settings/page.tsx")

  assert.match(createPage, /accountRoleOptions/, "User creator must use shared role options")
  assert.match(createPage, /accountIdentityTypeOptions/, "User creator must use shared identity-group options")
  assert.match(editorPage, /accountRoleOptions/, "User editor must use shared role options")
  assert.match(editorPage, /accountIdentityTypeOptions/, "User editor must use shared identity-group options")
  assert.match(settingsPage, /getAccountRoleLabel/, "Settings must use the shared role-label resolver")

  for (const [name, source] of [
    ["user creator", createPage],
    ["user editor", editorPage],
    ["settings", settingsPage],
  ]) {
    assert.doesNotMatch(
      source,
      /(?:value:\s*["']member["'][\s\S]{0,80}label:\s*["']成员["']|role\s*===\s*["']member["'][\s\S]{0,80}["']成员["'])/,
      `${name} must not display the old authorization-role label`,
    )
  }

  assert.match(createPage, /accountIdentityTypeOptions/, "Identity group must still include the shared defaults")
  assert.doesNotMatch(
    editorPage,
    /创建本科生、研究生、教师或管理账号/,
    "Identity groups must not be presented as alternatives to management roles",
  )
  assert.match(editorPage, /分别设置系统角色与研究院成员资格组/)
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
