import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (error) {
      if (
        error?.code === "ERR_MODULE_NOT_FOUND"
        && /^\.{1,2}\//.test(specifier)
        && !/\.[cm]?[jt]sx?$/.test(specifier)
      ) {
        return nextResolve(`${specifier}.ts`, context)
      }
      throw error
    }
  },
})

const scope = await import("../convex/lib/oaScopeAuthorization.ts")
const groups = await import("../convex/lib/researchGroupPublications.ts")

test("disabled accounts are never eligible directory or scope subjects", () => {
  assert.equal(scope.isEnabledScopeAccount({ accountStatus: "active" }), true)
  assert.equal(scope.isEnabledScopeAccount({}), true, "legacy accounts remain active")
  assert.equal(scope.isEnabledScopeAccount({ accountStatus: "disabled" }), false)
  assert.equal(scope.isEnabledScopeAccount(null), false)
})

test("all selected scope labels survive the ordinary result limit", () => {
  const options = Array.from({ length: 27 }, (_, index) => ({
    kind: "user",
    value: `user-${index}`,
    label: `成员 ${index}`,
    meta: `member-${index}`,
    identityType: "other",
  }))
  const selectedKeys = new Set(options.slice(0, 24).map((option) => `user:${option.value}`))

  const result = scope.limitManageableScopeOptions(options, selectedKeys, 20)

  assert.equal(result.length, 24)
  assert.deepEqual(
    result.map((option) => option.label),
    options.slice(0, 24).map((option) => option.label),
  )
})

test("teachers cannot transfer a member from another group but super administrators can", () => {
  assert.throws(
    () => groups.assertResearchGroupMemberTransferAllowed({
      actorRole: "member",
      destinationGroupId: "group-b",
      existingGroupId: "group-a",
    }),
    /RESEARCH_GROUP_MEMBER_ALREADY_ASSIGNED/,
  )
  assert.doesNotThrow(() => groups.assertResearchGroupMemberTransferAllowed({
    actorRole: "member",
    destinationGroupId: "group-a",
    existingGroupId: "group-a",
  }))
  assert.doesNotThrow(() => groups.assertResearchGroupMemberTransferAllowed({
    actorRole: "super_admin",
    destinationGroupId: "group-b",
    existingGroupId: "group-a",
  }))
})

test("automatic teacher group names use the one canonical product label", () => {
  assert.equal(groups.teacherResearchGroupNameZh("张三"), "张三老师的课题组")
  assert.equal(groups.teacherResearchGroupNameZh("张三老师"), "张三老师的课题组")
})

test("server paths apply disabled-account and transfer guards", async () => {
  const [directory, userGroups, authorization, publications] = await Promise.all([
    readFile("convex/instituteDirectory.ts", "utf8"),
    readFile("convex/userGroups.ts", "utf8"),
    readFile("convex/lib/oaScopeAuthorization.ts", "utf8"),
    readFile("convex/lib/researchGroupPublications.ts", "utf8"),
  ])

  assert.match(directory, /assertResearchGroupMemberTransferAllowed\(/)
  assert.match(directory, /teacherResearchGroupNameZh\(/)
  assert.match(directory, /isEnabledScopeAccount\(member\)/)
  assert.match(directory, /usersRaw\.filter\(isEnabledScopeAccount\)/)
  assert.match(userGroups, /usersRaw\.filter\(isEnabledScopeAccount\)/)
  assert.match(userGroups, /if\s*\(!isEnabledScopeAccount\(user\)\)\s*throw/)
  assert.match(authorization, /\.filter\(isEnabledScopeAccount\)/)
  assert.match(authorization, /limitManageableScopeOptions\(/)
  assert.match(publications, /activeAssignments[\s\S]*?accountStatus\s*!==\s*"disabled"/)
})
