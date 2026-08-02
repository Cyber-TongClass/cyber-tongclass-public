import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const read = (path) => readFile(path, "utf8")

test("form management persists the unified workflow and uses server-authorized target forms", async () => {
  const [editor, api, backend] = await Promise.all([
    read("src/app/forms/manage/form-editor.tsx"),
    read("src/lib/api.ts"),
    read("convex/oaForms.ts"),
  ])

  assert.match(editor, /<OAWorkflowEditor/)
  assert.match(editor, /useEditorVisibleOAForms/)
  assert.match(editor, /workflowDefinition/)
  assert.match(editor, /getOAWorkflowDraftConfig/)
  assert.match(api, /oaForms:listEditorVisibleTargets/)
  assert.match(api, /export function useEditorVisibleOAForms/)
  assert.match(backend, /export const listEditorVisibleTargets = query/)
  assert.match(backend, /assertCanManageForm/)
})

test("content permission and review hooks expose scope assignment, reimbursement rights, and replay-safe requests", async () => {
  const api = await read("src/lib/api.ts")

  assert.match(api, /contentReview:setPermissionsForScope/)
  assert.match(api, /export type ContentPermissionCategory = ContentReviewCategory \| "reimbursement"/)
  assert.match(api, /export function useSetContentPermissionsForScope/)
  assert.match(api, /scope: OAUserScope/)
  assert.match(api, /idempotencyKey: string/)
  assert.match(api, /taskId\?: string/)
})

test("permission UI submits the original authorized scope without disabling groups", async () => {
  const client = await read("src/components/permissions/platform-permissions-client.tsx")

  assert.match(client, /useSetContentPermissionsForScope/)
  assert.match(client, /setPermissionsForScope\(\{[\s\S]*scope: input\.scope/)
  assert.doesNotMatch(client, /批量授权接口正在同步/)
  assert.doesNotMatch(client, /canAssignScope=/)
})

test("portal fails closed while permissions load and exposes four class-work actions", async () => {
  const portal = await read("src/components/portal/portal-client.tsx")
  const copy = await read("src/config/site-copy.ts")

  assert.match(portal, /useMyContentPermissions/)
  assert.match(portal, /contentPermissions === undefined/)
  assert.match(portal, /copy\.loadingPermissions/)
  assert.match(copy, /loadingPermissions: "正在确认班级工作权限…"/)
  for (const [moduleKey, title] of [
    ["createNews", "创建新闻"],
    ["manageNews", "管理新闻"],
    ["createEvent", "创建活动"],
    ["manageEvent", "管理活动"],
  ]) {
    assert.match(portal, new RegExp(`copy\\.modules\\.${moduleKey}`))
    assert.ok(copy.includes(`title: "${title}"`), `siteCopy must keep the "${title}" module title`)
  }
  assert.match(portal, /copy\.sections\.classWork/)
  assert.match(copy, /classWork: \{ kicker: "班级工作", title: "班级工作"/)
})

test("platform permissions stay out of the legacy administrator sidebar", async () => {
  const [layout, portal] = await Promise.all([
    read("src/app/admin/layout.tsx"),
    read("src/components/portal/portal-client.tsx"),
  ])

  assert.doesNotMatch(layout, /href: "\/admin\/permissions", label: "权限管理"/)
  assert.match(portal, /href: "\/platform\/permissions"/)
})
