import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = (path) => readFileSync(path, "utf8")

test("teacher-managed student group assignments are single-valued and available to OA scopes", () => {
  const schema = source("convex/schema.ts")
  const directory = source("convex/instituteDirectory.ts")
  const workflow = source("convex/lib/oaWorkflow.ts")
  const portal = source("src/components/portal/portal-client.tsx")

  assert.match(schema, /studentResearchGroupAssignments: defineTable/)
  assert.match(schema, /\.index\("by_studentUserId", \["studentUserId"\]\)/)
  assert.match(directory, /export const listTeacherGroupRoster/)
  assert.match(directory, /export const assignTeacherGroupStudent/)
  assert.match(directory, /export const removeTeacherGroupStudent/)
  assert.match(directory, /by_studentUserId/)
  assert.match(workflow, /researchGroupIds/)
  assert.match(workflow, /studentResearchGroupAssignments/)
  assert.match(portal, /\/groups\/manage/)
})

test("teachers receive a default group-management capability and private group without overriding an admin revocation", () => {
  const schema = source("convex/schema.ts")
  const directory = source("convex/instituteDirectory.ts")
  const users = source("convex/users.ts")

  assert.match(schema, /accountCapabilities: defineTable/)
  assert.match(schema, /manage_research_group_members/)
  assert.match(schema, /\.index\("by_user_capability", \["userId", "capability"\]\)/)
  assert.match(directory, /ensureTeacherGroupManagement/)
  assert.match(directory, /manage_research_group_members/)
  assert.match(directory, /visibility:\s*"hidden"/)
  assert.match(directory, /export const setAccountCapability/)
  assert.match(directory, /requireSuperAdminBySession/)
  assert.match(directory, /capability\?\.enabled === true/)
  assert.match(directory, /canManage/)
  assert.match(users, /ensureTeacherGroupManagement/)
})
