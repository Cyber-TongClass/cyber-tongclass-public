import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

function readSource(relativePath) {
  const absolutePath = resolve(repositoryRoot, relativePath)
  assert.ok(existsSync(absolutePath), `Expected ${relativePath} to exist`)
  return readFileSync(absolutePath, "utf8")
}

const listPath = "src/components/oa/aia-oa-form-list-client.tsx"
const workspacePath = "src/components/oa/aia-reimbursement-workspace-client.tsx"
const workspaceRoutePath = "src/app/services/oa/reimbursements/page.tsx"
const createRoutePath = "src/app/forms/manage/reimbursements/new/page.tsx"

test("the OA matters list has one fixed reimbursement entry below pinned matters", () => {
  const source = readSource(listPath)
  assert.match(source, /<FixedReimbursementEntry\b/)
  assert.match(source, /置顶事项[\s\S]*<FixedReimbursementEntry\b/)
  assert.match(source, /href="\/services\/oa\/reimbursements"/)
  assert.match(source, /form\.kind !== "reimbursement"/)
  assert.doesNotMatch(source, /visibleRest\.map[\s\S]{0,180}kind === "reimbursement"/)
  assert.doesNotMatch(source, /forms\.length === 0\s*\?\s*\([\s\S]{0,180}当前没有可办理的 OA 事项/)
})

test("the reimbursement workspace lists academic exchange before custom OA forms", () => {
  const source = readSource(workspacePath)
  const academicIndex = source.indexOf("学术交流报销")
  const customIndex = source.indexOf("自定义报销表单")
  assert.ok(academicIndex >= 0, "academic exchange entry must exist")
  assert.ok(customIndex > academicIndex, "custom reimbursement forms must follow academic exchange")
  assert.match(source, /usePublishedOAForms\(\{\s*kind:\s*"reimbursement"/)
  assert.match(source, /href:\s*"\/services\/oa\/reimbursements\/academic-exchange"/)
  assert.doesNotMatch(source, /href="\/tong-class\/intranet\/reimbursements/)
  assert.match(source, /`\/services\/oa\/\$\{encodeURIComponent\(form\.slug\)\}`/)
  assert.match(source, /aia-serif/)
  assert.match(source, /aia-mono/)
  assert.match(source, /aia-border-rule/)
  assert.doesNotMatch(source, /(?:<Card|shadow-|rounded-(?:lg|xl|2xl))/)
})

test("reimbursement creation is shown only through the effective permission hook boundary", () => {
  const workspace = readSource(workspacePath)
  const createRoute = readSource(createRoutePath)
  for (const source of [workspace, createRoute]) {
    assert.match(source, /useMyContentPermissions/)
    assert.match(source, /\.reimbursement/)
    assert.match(source, /canCreate/)
    assert.doesNotMatch(source, /currentUser\.role\s*===\s*["'](?:admin|super_admin)["']\s*\|\|/)
  }
  assert.match(workspace, /canCreateForm\s*\?/)
  assert.match(workspace, /href="\/forms\/manage\/reimbursements\/new"/)
  assert.match(createRoute, /createDefaultReimbursementFormDraft/)
  assert.match(createRoute, /kind:\s*"reimbursement"/)
  assert.match(createRoute, /<OaScopePicker\b/)
})

test("create-only reimbursement users return to the workspace and can reopen their drafts", () => {
  const workspace = readSource(workspacePath)
  const createRoute = readSource(createRoutePath)

  assert.match(createRoute, /router\.push\(["']\/services\/oa\/reimbursements["']\)/)
  assert.doesNotMatch(createRoute, /router\.push\(["']\/forms\/manage["']\)/)
  assert.match(workspace, /canCreateForm\s*\?[\s\S]*href="\/forms\/manage\/reimbursements\/new"/)
  assert.match(workspace, /href="\/forms\/manage"[\s\S]*管理我的报销表单/)
})

test("reimbursement routes compose the AIA workspace without direct Convex imports", () => {
  const workspaceRoute = readSource(workspaceRoutePath)
  assert.match(workspaceRoute, /<AiaReimbursementWorkspaceClient\s*\/>/)
  assert.match(workspaceRoute, /title:\s*"报销/)

  for (const path of [listPath, workspacePath, workspaceRoutePath, createRoutePath]) {
    const source = readSource(path)
    assert.doesNotMatch(
      source,
      /from\s+["'](?:convex(?:\/[^"']*)?|@\/lib\/convex(?:[^"']*)?)["']/,
      `${path} must use src/lib/api.ts hooks rather than Convex directly`,
    )
  }
})
