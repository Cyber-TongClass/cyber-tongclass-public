import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const readSource = async (file) => {
  try {
    return await readFile(file, "utf8")
  } catch {
    return ""
  }
}

const authorizationSource = await readSource("convex/lib/oaScopeAuthorization.ts")
const optionsSource = await readSource("convex/oaScopeOptions.ts")
const formsSource = await readSource("convex/oaForms.ts")
const userGroupsSource = await readSource("convex/userGroups.ts")
const directorySource = await readSource("convex/instituteDirectory.ts")

test("scope authorization exposes the four default institute qualification groups", () => {
  for (const [value, label] of [
    ["undergrad", "本科生"],
    ["graduate", "研究生"],
    ["teacher", "教师"],
    ["other", "其他成员"],
  ]) {
    assert.match(authorizationSource, new RegExp(`value:\\s*"${value}"[\\s\\S]*?label:\\s*"${label}"`))
  }
})

test("scope options are actor-aware and account search is bounded", () => {
  assert.match(optionsSource, /searchManageableScopeOptions/)
  assert.match(optionsSource, /const scopePurposeValidator\s*=\s*v\.union\(/)
  assert.match(optionsSource, /purpose:\s*scopePurposeValidator/)
  assert.match(authorizationSource, /actor\.role\s*===\s*"super_admin"/)
  assert.match(authorizationSource, /by_accountUserId/)
  assert.match(authorizationSource, /by_leaderPersonId/)
  assert.match(authorizationSource, /createdByUserId/)
  assert.match(authorizationSource, /\.take\(ACCOUNT_SEARCH_SCAN_LIMIT\)/)
  assert.match(authorizationSource, /\.slice\(0,\s*SCOPE_OPTION_LIMIT\)/)
  assert.doesNotMatch(authorizationSource, /query\("users"\)\.collect\(\)/)
})

test("legacy scope endpoints delegate to the same actor-aware authorization boundary", () => {
  assert.match(userGroupsSource, /searchManageableScopeOptions/)
  assert.match(directorySource, /actor\.role\s*===\s*"super_admin"/)
  assert.match(directorySource, /resolveUserIdentityType\(actor\)\s*===\s*"teacher"/)
  assert.match(directorySource, /teacherLedResearchGroups/)
})

test("form audience and workflow scopes are re-authorized when saved", () => {
  assert.match(formsSource, /assertActorCanUseScope/)
  const adminUpsert = formsSource.slice(
    formsSource.indexOf("export const adminUpsert"),
    formsSource.indexOf("export const adminSetStatus"),
  )
  const teacherUpsert = formsSource.slice(
    formsSource.indexOf("export const teacherUpsert"),
    formsSource.indexOf("export const teacherSetStatus"),
  )
  assert.match(adminUpsert, /assertActorCanUseScope/)
  assert.match(teacherUpsert, /assertActorCanUseScope/)
})
