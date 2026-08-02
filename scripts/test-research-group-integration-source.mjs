import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const apiPath = new URL("../src/lib/api.ts", import.meta.url)
const pagePath = new URL("../src/app/groups/manage/page.tsx", import.meta.url)
const portalPath = new URL("../src/components/portal/portal-client.tsx", import.meta.url)

async function source(path) {
  return readFile(path, "utf8")
}

test("canonical research-group hooks pass the optional selected group to every workspace operation", async () => {
  const api = await source(apiPath)

  for (const reference of [
    'updateTeacherGroupProfileRef = makeFunctionReference<"mutation">("instituteDirectory:updateTeacherGroupProfile")',
    'setTeacherGroupMemberOrderRef = makeFunctionReference<"mutation">("instituteDirectory:setTeacherGroupMemberOrder")',
    'setTeacherGroupPublicationVisibilityRef = makeFunctionReference<"mutation">("instituteDirectory:setTeacherGroupPublicationVisibility")',
  ]) {
    assert.match(api, new RegExp(reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }

  assert.match(api, /export function useTeacherGroupRoster\(groupId\?: string\)/)
  assert.match(api, /export function useUpdateTeacherGroupProfile\(\)/)
  assert.match(api, /export function useSetTeacherGroupMemberOrder\(\)/)
  assert.match(api, /export function useSetTeacherGroupPublicationVisibility\(\)/)
  assert.match(api, /groupId: groupId as any/)
})

test("workspace saves profile, order and publication visibility through real hooks", async () => {
  const page = await source(pagePath)

  for (const hook of [
    "useUpdateTeacherGroupProfile",
    "useSetTeacherGroupMemberOrder",
    "useSetTeacherGroupPublicationVisibility",
  ]) {
    assert.match(page, new RegExp(hook))
  }
  assert.doesNotMatch(page, /后端正在同步|控件暂时停用|function unavailable/)
  assert.doesNotMatch(page, /<ResearchGroupProfileEditor[^>]*disabled/)
  assert.doesNotMatch(page, /<ResearchGroupPublicationManager[^>]*disabled/)
  assert.doesNotMatch(page, /reorderDisabled/)
})

test("super administrators choose a group while teachers stay scoped to their own group", async () => {
  const page = await source(pagePath)

  assert.match(page, /currentUser\?\.role === "super_admin"/)
  assert.match(page, /useResearchGroupScopeOptions/)
  assert.match(page, /selectedGroupId/)
  assert.match(page, /超级管理员 · 选择课题组/)
  assert.match(page, /const groupSelector = isSuperAdmin \? \(/)
  assert.match(page, /useTeacherGroupRoster\(selectedGroupId\)/)
})

test("portal exposes research-group management to teachers and super administrators, but not ordinary administrators", async () => {
  const portal = await source(portalPath)

  assert.match(portal, /const canManageResearchGroups = isTeacher \|\| currentUser\.role === "super_admin"/)
  assert.match(portal, /canManageResearchGroups/)
  assert.match(portal, /href: "\/groups\/manage"/)
  assert.match(portal, /copy\.modules\.researchGroupsTeacher\.description/)
  assert.match(portal, /copy\.modules\.researchGroupsAdmin\.description/)
  const copy = await source(new URL("../src/config/site-copy.ts", import.meta.url))
  assert.match(copy, /选择并维护课题组|维护本课题组/)
  assert.doesNotMatch(portal, /currentUser\.role === "admin".{0,120}href: "\/groups\/manage"/s)
})
