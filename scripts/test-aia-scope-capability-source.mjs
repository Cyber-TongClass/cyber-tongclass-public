import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const authorizationSource = await readFile("convex/lib/oaScopeAuthorization.ts", "utf8")
const optionsSource = await readFile("convex/oaScopeOptions.ts", "utf8")

test("teacher scope authorization is gated by the reusable group-management capability", () => {
  assert.match(
    authorizationSource,
    /MANAGE_RESEARCH_GROUP_MEMBERS\s*=\s*"manage_research_group_members"/,
  )
  assert.match(authorizationSource, /query\("accountCapabilities"\)/)
  assert.match(authorizationSource, /withIndex\("by_user_capability"/)
  assert.match(authorizationSource, /capability\?\.enabled\s*!==\s*true/)
  assert.match(
    authorizationSource,
    /capability\?\.enabled\s*!==\s*true[\s\S]*?return\s+restrictedActorAuthorization\(actor\)/,
  )
})

test("revoked teachers retain only qualification groups and their own account", () => {
  assert.match(
    authorizationSource,
    /function restrictedActorAuthorization\([\s\S]*?researchGroupIds:\s*new Set\(\)[\s\S]*?userGroupIds:\s*new Set\(\)[\s\S]*?userIds:\s*new Set<string>\(\[String\(actor\._id\)\]\)/,
  )
  assert.match(
    authorizationSource,
    /if\s*\(actor\.role\s*===\s*"super_admin"\)[\s\S]*?canUseAll:\s*true/,
  )
})

test("scope purposes explicitly constrain identity and role selectors at query and save boundaries", () => {
  for (const purpose of ["form_audience", "workflow_approver", "notification"]) {
    assert.match(authorizationSource, new RegExp(`${purpose}:\\s*\\{`))
  }
  assert.match(authorizationSource, /allowedIdentityTypes/)
  assert.match(authorizationSource, /allowedRoles/)
  assert.match(authorizationSource, /assertScopeSelectorsAllowedForPurpose/)
  assert.match(
    authorizationSource,
    /assertActorCanUseScope\([\s\S]*?purpose:\s*OAScopePurpose\s*=\s*"form_audience"/,
  )
  assert.match(optionsSource, /const scopePurposeValidator\s*=\s*v\.union\(/)
  assert.match(optionsSource, /purpose:\s*scopePurposeValidator/)
  assert.match(optionsSource, /purpose:\s*args\.purpose/)
  assert.doesNotMatch(authorizationSource, /void input\.purpose/)
})
