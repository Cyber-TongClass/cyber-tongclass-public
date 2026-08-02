import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { test } from "node:test"

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

test("admin navigation keeps canonical form management but excludes foreground platform permissions", () => {
  const source = read("src/app/admin/layout.tsx")

  assert.doesNotMatch(source, /href:\s*"\/admin\/permissions",\s*label:\s*"权限管理"/)
  assert.match(source, /href:\s*"\/forms\/manage",\s*label:\s*"表单管理"/)
  assert.doesNotMatch(source, /href:\s*"\/admin\/forms",\s*label:\s*"OA 表单"/)

  const ordinaryAdminPrefixes = source.match(/const adminAllowedPrefixes = \[([^\]]+)\]/s)?.[1] ?? ""
  assert.doesNotMatch(ordinaryAdminPrefixes, /\/admin\/forms/)
  assert.doesNotMatch(ordinaryAdminPrefixes, /\/admin\/reimbursements/)
  assert.match(source, /isSuperAdmin\s*\?\s*navItems/)
})

test("portal uses the three account-role labels and gates class-work reimbursement actions", () => {
  const source = read("src/components/portal/portal-client.tsx")

  assert.match(source, /getAccountRoleLabel\(currentUser\.role\)/)
  assert.doesNotMatch(source, /currentUser\.role === "super_admin" \? "超级管理员" : currentUser\.role === "admin" \? "管理员" : null/)
  assert.match(source, /contentPermissions\.reimbursement\.canCreate/)
  assert.match(source, /href:\s*"\/forms\/manage\/reimbursements\/new"/)
  assert.match(source, /contentPermissions\.reimbursement\.canManage/)
  assert.match(source, /href:\s*"\/services\/oa\/approvals"/)
})

test("OA reimbursement workspace uses canonical live routes", () => {
  const source = read("src/components/oa/aia-reimbursement-workspace-client.tsx")

  assert.match(source, /href:\s*"\/services\/oa\/reimbursements\/academic-exchange"/)
  assert.doesNotMatch(source, /href:\s*"\/tong-class\/intranet\/reimbursements\/academic-exchange"/)

  for (const route of [
    "src/app/services/oa/page.tsx",
    "src/app/services/oa/reimbursements/page.tsx",
    "src/app/services/oa/reimbursements/academic-exchange/page.tsx",
    "src/app/services/oa/approvals/page.tsx",
    "src/app/forms/manage/page.tsx",
    "src/app/forms/manage/reimbursements/new/page.tsx",
    "src/app/platform/permissions/page.tsx",
    "src/app/class-work/news/new/page.tsx",
    "src/app/class-work/news/manage/page.tsx",
    "src/app/class-work/events/new/page.tsx",
    "src/app/class-work/events/manage/page.tsx",
  ]) {
    assert.equal(existsSync(new URL(`../${route}`, import.meta.url)), true, `${route} should exist`)
  }
})
