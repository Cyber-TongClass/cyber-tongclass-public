import assert from "node:assert/strict"
import path from "node:path"
import test from "node:test"
import { pathToFileURL } from "node:url"

const policyUrl = pathToFileURL(
  path.resolve("convex/lib/user-account-policy.ts"),
).href
const policy = await import(policyUrl)

test("only account managers can provision managed accounts", () => {
  assert.doesNotThrow(() => policy.assertCanProvisionAccount("admin", "member"))
  assert.doesNotThrow(() => policy.assertCanProvisionAccount("admin", "admin"))
  assert.doesNotThrow(() => policy.assertCanProvisionAccount("super_admin", "super_admin"))

  assert.throws(
    () => policy.assertCanProvisionAccount("member", "member"),
    /管理员/,
  )
  assert.throws(
    () => policy.assertCanProvisionAccount("admin", "super_admin"),
    /超级管理员/,
  )
})

test("only super admins can manage or assign the super admin role", () => {
  assert.doesNotThrow(() => policy.assertCanManageAccount("admin", "member"))
  assert.doesNotThrow(() => policy.assertCanSetManagedRole("admin", "member", "admin"))
  assert.doesNotThrow(() => policy.assertCanSetManagedRole("super_admin", "super_admin", "member"))

  assert.throws(
    () => policy.assertCanManageAccount("admin", "super_admin"),
    /超级管理员/,
  )
  assert.throws(
    () => policy.assertCanSetManagedRole("admin", "member", "super_admin"),
    /超级管理员/,
  )
})
