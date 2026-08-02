import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const backend = await readFile("convex/oaForms.ts", "utf8")
const api = await readFile("src/lib/api.ts", "utf8")
const listPage = await readFile("src/app/forms/manage/page.tsx", "utf8")
const editPage = await readFile("src/app/forms/manage/[id]/page.tsx", "utf8")
const newPage = await readFile("src/app/forms/manage/new/page.tsx", "utf8")
const editor = await readFile("src/app/forms/manage/form-editor.tsx", "utf8")
const portal = await readFile("src/components/portal/portal-client.tsx", "utf8")

test("the canonical management guard permits teachers and super administrators but not administrators", () => {
  assert.match(
    backend,
    /function requireFormManager[\s\S]*?role === "super_admin"[\s\S]*?resolveUserIdentityType\(user\) !== "teacher"[\s\S]*?仅教师或超级管理员/,
  )
  assert.match(
    backend,
    /function assertCanManageForm[\s\S]*?manager\.role === "super_admin"[\s\S]*?form\.createdBy[\s\S]*?只能管理自己创建的表单/,
  )
})

test("canonical form management endpoints use one ownership contract", () => {
  for (const endpoint of [
    "manageList",
    "manageGet",
    "manageUpsert",
    "manageSetStatus",
    "manageRemove",
    "manageListSubmissions",
  ]) {
    assert.match(backend, new RegExp(`export const ${endpoint} = (?:query|mutation)\\(`))
  }
  assert.match(
    backend.slice(backend.indexOf("export const manageList"), backend.indexOf("export const manageGet")),
    /manager\.role === "super_admin"[\s\S]*?form\.createdBy/,
  )
  for (const endpoint of ["manageGet", "manageSetStatus", "manageRemove", "manageListSubmissions"]) {
    const start = backend.indexOf(`export const ${endpoint}`)
    const next = backend.indexOf("\nexport const ", start + 1)
    const source = backend.slice(start, next < 0 ? undefined : next)
    assert.match(source, /requireManageSurfaceActor/)
    assert.match(source, /assertCanManageFormWithRights/)
  }
  const upsertStart = backend.indexOf("export const manageUpsert")
  const upsertNext = backend.indexOf("\nexport const ", upsertStart + 1)
  const upsertSource = backend.slice(upsertStart, upsertNext < 0 ? undefined : upsertNext)
  assert.match(upsertSource, /requestedKind === "reimbursement"/)
  assert.match(upsertSource, /requireReimbursementRight/)
  assert.match(upsertSource, /requireFormManager/)
  assert.match(upsertSource, /assertCanManageForm/)
})

test("pinning is a super-administrator-only canonical management action", () => {
  const start = backend.indexOf("export const manageSetPinned")
  const next = backend.indexOf("\nexport const ", start + 1)
  const source = backend.slice(start, next < 0 ? undefined : next)
  assert.ok(start >= 0)
  assert.match(source, /role !== "super_admin"/)
  assert.match(source, /只有超级管理员可以置顶表单/)

  const legacyStart = backend.indexOf("export const adminSetPinned")
  const legacyNext = backend.indexOf("\nexport const ", legacyStart + 1)
  const legacySource = backend.slice(legacyStart, legacyNext < 0 ? undefined : legacyNext)
  assert.match(legacySource, /role !== "super_admin"/)
})

test("fill-form target search returns only published member forms visible to the editor", () => {
  const start = backend.indexOf("export const listEditorVisibleTargets")
  const next = backend.indexOf("\nexport const ", start + 1)
  const source = backend.slice(start, next < 0 ? undefined : next)
  assert.ok(start >= 0)
  assert.match(source, /form\.status === "published"/)
  assert.match(source, /form\.visibility === "members"/)
  assert.match(source, /manager\.role === "super_admin"/)
  assert.match(source, /canUserAccessOAForm/)
  assert.doesNotMatch(source, /assertCanManageForm/)
})

test("fill-form publication revalidates that the editor can see the selected target", () => {
  const start = backend.indexOf("async function validateWorkflowFillTargets")
  const next = backend.indexOf("\n/** Publishing", start + 1)
  const source = backend.slice(start, next < 0 ? undefined : next)
  assert.ok(start >= 0)
  assert.match(source, /target\.status !== "published"/)
  assert.match(source, /target\.visibility !== "members"/)
  assert.match(source, /actor\.role !== "super_admin"/)
  assert.match(source, /canUserAccessOAForm/)
  assert.doesNotMatch(source, /assertCanManageForm/)
})

test("the frontend uses canonical management hooks rather than role-split hooks", () => {
  for (const hook of [
    "useManageOAForms",
    "useManageOAForm",
    "useManageUpsertOAForm",
    "useManageSetOAFormStatus",
    "useManageSetOAFormPinned",
    "useManageRemoveOAForm",
    "useManageOAFormSubmissions",
  ]) {
    assert.match(api, new RegExp(`export function ${hook}\\(`))
  }

  const surfaces = [listPage, editPage, newPage, editor]
  assert.ok(surfaces.some((source) => /useManageOAForms/.test(source)))
  assert.ok(surfaces.some((source) => /useManageOAForm/.test(source)))
  assert.ok(surfaces.some((source) => /useManageUpsertOAForm/.test(source)))
  for (const source of surfaces) {
    assert.doesNotMatch(source, /useTeacherOAForm/)
    assert.doesNotMatch(source, /useAdminOAForm/)
  }
  assert.doesNotMatch(listPage, /\/admin\/forms\/\$\{form\._id\}/)
})

test("management pages and portal expose forms to teachers or super administrators", () => {
  for (const source of [listPage, editPage, newPage]) {
    assert.match(source, /identityType (?:===|!==) "teacher"/)
    assert.match(source, /role === "super_admin"/)
    assert.match(source, /仅教师(?:、报销表单创建者)?或超级管理员/)
  }
  assert.match(portal, /currentUser\.identityType === "teacher"/)
  assert.match(portal, /currentUser\.role === "super_admin"/)
  assert.match(portal, /href:\s*"\/forms\/manage"/)
})
