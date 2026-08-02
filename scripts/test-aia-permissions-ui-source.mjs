import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const files = {
  page: "src/app/platform/permissions/page.tsx",
  legacyPage: "src/app/admin/permissions/page.tsx",
  client: "src/components/permissions/platform-permissions-client.tsx",
  picker: "src/components/permissions/permission-subject-picker.tsx",
}

async function source(name) {
  return await readFile(files[name], "utf8")
}

test("platform permission page is guarded for super administrators", async () => {
  const [page, client] = await Promise.all([source("page"), source("client")])
  assert.match(page, /PlatformPermissionsClient/)
  assert.match(client, /useAuth/)
  assert.match(client, /isSuperAdmin/)
  assert.match(client, /只有超级管理员可以管理平台权限/)
})

test("permissions live on the foreground platform surface and the old admin URL redirects", async () => {
  const [page, legacyPage] = await Promise.all([source("page"), source("legacyPage")])
  assert.match(page, /container-custom max-w-6xl/)
  assert.doesNotMatch(page, /-m-6/)
  assert.match(legacyPage, /redirect\("\/platform\/permissions"\)/)
})

test("permission workspace has the three capability tabs and independent controls", async () => {
  const client = await source("client")
  assert.match(client, /新闻/)
  assert.match(client, /活动/)
  assert.match(client, /报销/)
  assert.match(client, /审核与管理权/)
  assert.match(client, /创建权/)
  assert.match(client, /创建报销表单/)
  assert.match(client, /审批报销/)
  assert.match(client, /type="checkbox"/)
  assert.match(client, /canCreate/)
  assert.match(client, /canManage/)
})

test("permission assignment reuses the authorized OA account and group picker", async () => {
  const [client, picker] = await Promise.all([source("client"), source("picker")])
  assert.match(client, /PermissionSubjectPicker/)
  assert.match(picker, /OaScopePicker/)
  assert.match(picker, /OAUserScope/)
  assert.match(picker, /添加到权限列表/)
  assert.match(picker, /canCreate/)
  assert.match(picker, /canManage/)
})

test("permission rows expose loading empty error and removal states", async () => {
  const client = await source("client")
  assert.match(client, /正在读取权限配置/)
  assert.match(client, /尚未配置/)
  assert.match(client, /role="alert"/)
  assert.match(client, /移除/)
  assert.match(client, /useContentPermissions/)
  assert.match(client, /useRemoveContentPermission/)
})

test("permission workspace follows the flat AIA OA visual system", async () => {
  const [page, client, picker] = await Promise.all([
    source("page"),
    source("client"),
    source("picker"),
  ])
  const combined = `${page}\n${client}\n${picker}`
  assert.match(combined, /aia-serif/)
  assert.match(combined, /aia-mono/)
  assert.match(combined, /aia-border-rule/)
  assert.doesNotMatch(combined, /<Card\b|<Table\b|shadow-(?:sm|md|lg|xl|2xl)/)
  assert.doesNotMatch(combined, /font-(?:sans|serif|mono)\b/)
})
